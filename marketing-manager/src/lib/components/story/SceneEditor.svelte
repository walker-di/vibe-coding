<script lang="ts">
  import SceneList from '$lib/components/story/SceneList.svelte';
  import CanvasEditor from '$lib/components/story/CanvasEditor.svelte';
  import type { SceneWithRelations, Clip } from '$lib/types/story.types';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Label } from '$lib/components/ui/label';
  import { Square, Circle, Type, Image as ImageIcon, Trash2, Palette, ImageUp, Save, FileText, MessageSquare, Clock } from 'lucide-svelte';

  // Props passed down from the page
  let {
    scenes,
    storyId,
    aspectRatio = '16:9', // Default to 16:9 if not provided
    // resolution is not used but kept in the type for future use
    onEditScene,
    onDeleteScene,
    onSelectScene,
    onPlayScene, // Optional
    onUpdateClip // Optional
  } = $props<{
    scenes: SceneWithRelations[];
    creativeId?: number; // Made optional since it's not used in this component
    storyId: number;
    aspectRatio?: string; // Optional aspect ratio from story
    resolution?: string | null; // Optional resolution from story
    onAddScene?: () => void; // Made optional since it's not used here
    onEditScene: (sceneId: number) => void;
    onDeleteScene: (sceneId: number) => void;
    onSelectScene: (sceneId: number) => void; // Keep for scene-level actions
    onPlayScene?: (sceneId: number) => void; // Optional
    onUpdateClip?: (clipId: number, data: Partial<Clip>) => Promise<void>; // Optional
  }>();

  // Calculate canvas dimensions based on aspect ratio
  function calculateDimensions(ratioString: string, fixedWidth: number = 800): { width: number; height: number } {
    // Handle special cases
    if (ratioString === 'Other') {
      return { width: fixedWidth, height: Math.round(fixedWidth * (9/16)) };
    }

    // Handle 1.91:1 aspect ratio specifically
    if (ratioString === '1.91:1') {
      return { width: fixedWidth, height: Math.round(fixedWidth / 1.91) };
    }

    if (!ratioString || typeof ratioString !== 'string' || !ratioString.includes(':')) {
      console.warn(`Invalid aspect ratio string: ${ratioString}. Defaulting to 800x600.`);
      return { width: fixedWidth, height: 600 }; // Default or fallback
    }

    const parts = ratioString.split(':');
    const ratioW = parseFloat(parts[0]);
    const ratioH = parseFloat(parts[1]);

    if (isNaN(ratioW) || isNaN(ratioH) || ratioW <= 0 || ratioH <= 0) {
      console.warn(`Invalid aspect ratio numbers: ${ratioString}. Defaulting to 800x600.`);
      return { width: fixedWidth, height: 600 }; // Default or fallback
    }

    const newHeight = Math.round((fixedWidth / ratioW) * ratioH);
    return { width: fixedWidth, height: newHeight };
  }

  // State for the selected clip
  let selectedClip = $state<Clip | null>(null);
  // State to track if the CanvasEditor child component is fully initialized
  let canvasIsReady = $state(false);
  // State to track if we need to force a scene refresh
  let forceSceneRefresh = $state(0);

  // Reference to the CanvasEditor component instance
  let canvasEditorInstance = $state<CanvasEditor | null>(null);

  // Handler for when CanvasEditor signals it's ready
  function handleCanvasReady() {
    canvasIsReady = true;

    // Set canvas dimensions based on story's aspect ratio
    if (canvasEditorInstance && aspectRatio) {
      const { width, height } = calculateDimensions(aspectRatio);
      canvasEditorInstance.updateDimensions(width, height);
    }
    // The effect will handle loading clip data
  }

  // Handler for when a clip is selected in SceneList
  async function handleSelectClip(clip: Clip) {
    if (selectedClip?.id === clip.id) {
      console.log('Same clip selected, skipping state update.');
      return;
    }

    // First, update the local state immediately to ensure UI responsiveness
    // This prevents the clip from disappearing from the UI
    // Ensure duration is set to a default value if it's null
    selectedClip = {
      ...clip,
      duration: clip.duration || 3000 // Default to 3 seconds if not set
    };
    console.log('Clip selected in SceneEditor:', clip.id, clip.orderIndex);

    // The $effect below will handle loading the canvas once selectedClip is updated
  }



  // Handler for duplicating a clip
  async function handleDuplicateClip(clip: Clip) {
    try {
      // Find the scene that contains this clip
      const scene = scenes.find((s: SceneWithRelations) =>
        s.clips && s.clips.some((c: Clip) => c.id === clip.id)
      );

      if (!scene) {
        console.error(`Scene containing clip ${clip.id} not found`);
        return;
      }

      // Calculate the next order index (position right after the current clip)
      const currentIndex = scene.clips?.findIndex((c: Clip) => c.id === clip.id) ?? -1;
      const nextOrderIndex = currentIndex >= 0 && currentIndex < (scene.clips?.length ?? 0) - 1
        ? (scene.clips?.[currentIndex + 1].orderIndex + clip.orderIndex) / 2 // Place between current and next clip
        : clip.orderIndex + 1; // Place after current clip if it's the last one

      // Create a new clip with the same canvas data
      const response = await fetch('/api/clips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sceneId: scene.id,
          orderIndex: nextOrderIndex,
          canvas: clip.canvas,
          narration: clip.narration,
          imageUrl: null // We'll update this after getting the ID
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to duplicate clip. Status: ${response.status}`);
      }

      // Get the newly created clip from the response
      const newClip = await response.json();

      // Set the image URL based on the clip ID
      const imageUrl = `/clip-previews/clip-${newClip.id}.png`;

      // Update the clip with the image URL
      const updateResponse = await fetch(`/api/clips/${newClip.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageUrl: imageUrl
        })
      });

      if (!updateResponse.ok) {
        console.warn(`Failed to update duplicated clip with image URL. Status: ${updateResponse.status}`);
      }

      // Get the updated clip with the image URL
      let updatedClip;
      try {
        updatedClip = updateResponse.ok ? await updateResponse.json() : { ...newClip, imageUrl };
      } catch (err) {
        console.warn('Error parsing update response:', err);
        updatedClip = { ...newClip, imageUrl };
      }

      // Duplicate the preview image
      if (clip.imageUrl) {
        try {
          // First, try to fetch the original image
          const originalImageResponse = await fetch(clip.imageUrl);
          if (!originalImageResponse.ok) {
            throw new Error(`Failed to fetch original image. Status: ${originalImageResponse.status}`);
          }

          // Convert the image to a blob
          const imageBlob = await originalImageResponse.blob();

          // Convert blob to base64 data URL
          const reader = new FileReader();
          const imageDataUrlPromise = new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
          });
          reader.readAsDataURL(imageBlob);

          // Wait for the data URL
          const imageDataUrl = await imageDataUrlPromise;

          // Upload the preview
          const uploadResponse = await fetch('/api/upload/clip-preview', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              clipId: newClip.id,
              imageData: imageDataUrl
            })
          });

          if (!uploadResponse.ok) {
            console.error(`Failed to upload preview for duplicated clip ${newClip.id}. Status: ${uploadResponse.status}`);
          } else {
            console.log(`Successfully duplicated preview image for clip ${newClip.id}`);
          }
        } catch (previewErr) {
          console.error('Error duplicating preview image:', previewErr);

          // Fallback method if direct duplication fails
          try {
            // Create a temporary canvas to generate the preview
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 300; // Standard width for preview
            tempCanvas.height = 200; // Standard height for preview
            const ctx = tempCanvas.getContext('2d');

            if (ctx) {
              // Create an image from the original clip's preview
              const img = new Image();
              img.crossOrigin = 'anonymous';

              // Create a promise to handle the image loading
              const imageLoadPromise = new Promise<string>((resolve, reject) => {
                img.onload = () => {
                  // Draw the image to the canvas
                  ctx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);

                  // Get the data URL
                  const dataUrl = tempCanvas.toDataURL('image/png');
                  resolve(dataUrl);
                };
                img.onerror = () => {
                  reject(new Error('Failed to load image'));
                };

                // Set the source of the image to the original clip's preview
                // Add a cache-busting parameter to ensure we get the latest version
                img.src = `${clip.imageUrl}?t=${Date.now()}`;
              });

              // Wait for the image to load and get the data URL
              const imageDataUrl = await imageLoadPromise;

              // Upload the preview
              const uploadResponse = await fetch('/api/upload/clip-preview', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  clipId: newClip.id,
                  imageData: imageDataUrl
                })
              });

              if (!uploadResponse.ok) {
                console.error(`Failed to upload preview for duplicated clip ${newClip.id} using fallback method. Status: ${uploadResponse.status}`);
              } else {
                console.log(`Successfully duplicated preview image for clip ${newClip.id} using fallback method`);
              }
            }
          } catch (fallbackErr) {
            console.error('Error in fallback preview duplication:', fallbackErr);
          }
        }
      } else if (clip.canvas) {
        // If no image URL but we have canvas data, create a blank preview
        try {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = 300;
          tempCanvas.height = 200;
          const ctx = tempCanvas.getContext('2d');

          if (ctx) {
            // Create a blank white canvas
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

            // Get the data URL
            const imageDataUrl = tempCanvas.toDataURL('image/png');

            // Upload the preview
            const uploadResponse = await fetch('/api/upload/clip-preview', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                clipId: newClip.id,
                imageData: imageDataUrl
              })
            });

            if (!uploadResponse.ok) {
              console.error(`Failed to upload blank preview for duplicated clip ${newClip.id}. Status: ${uploadResponse.status}`);
            }
          }
        } catch (blankPreviewErr) {
          console.error('Error creating blank preview for duplicated clip:', blankPreviewErr);
        }
      }

      // Add the new clip to the scene's clips array
      const updatedScenes = scenes.map((s: SceneWithRelations) => {
        if (s.id === scene.id) {
          // Add the new clip to the scene's clips array
          const updatedClips = [...(s.clips || []), updatedClip];
          // Sort clips by orderIndex to ensure they appear in the correct order
          updatedClips.sort((a, b) => a.orderIndex - b.orderIndex);
          return {
            ...s,
            clips: updatedClips
          };
        }
        return s;
      });

      scenes = updatedScenes;

      // Force a refresh of the scene list to show the updated preview
      setTimeout(() => {
        forceSceneRefresh++;
      }, 500); // 500ms delay

    } catch (error) {
      console.error('Error duplicating clip:', error);
      alert('Failed to duplicate clip. Please try again.');
    }
  }

    // Effect to call loadCanvasData when selectedClip changes OR when canvas becomes ready,
    // but only if the selected clip is different from the one already loaded.
   $effect(() => {
     // When selectedClip changes, load its canvas data
     if (selectedClip && canvasEditorInstance && canvasIsReady) {
       // Add a small delay to ensure the UI is updated
       setTimeout(() => {
         if (canvasEditorInstance && selectedClip) {
           canvasEditorInstance.loadCanvasData(selectedClip.canvas);
         }
       }, 200);
     }
   });


  // Handler for saving clip properties
  async function handleSaveClip() {
    if (!selectedClip) return;

    try {
      // Prepare the data to update
      const updateData: Partial<Clip> = {
        narration: selectedClip.narration,
        description: selectedClip.description,
        duration: selectedClip.duration,
        orderIndex: selectedClip.orderIndex
      };

      // Call the API to update the clip
      const response = await fetch(`/api/clips/${selectedClip.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`Failed to update clip. Status: ${response.status}`);
      }

      // Get the updated clip from the response
      const updatedClip = await response.json();

      // Update the local state
      selectedClip = updatedClip;

      // Update the clip in the scenes array
      scenes = scenes.map((scene: SceneWithRelations) => {
        if (scene.clips) {
          scene.clips = scene.clips.map((c: Clip) => {
            if (c.id === updatedClip.id) {
              return updatedClip;
            }
            return c;
          });
        }
        return scene;
      });

      // Call the onUpdateClip callback if provided
      if (onUpdateClip) {
        await onUpdateClip(updatedClip.id, updateData);
      }

      // Force a refresh of the scene list
      forceSceneRefresh++;

      console.log('Clip properties saved successfully');
    } catch (error) {
      console.error('Error saving clip properties:', error);
      alert('Failed to save clip properties. Please try again.');
    }
  }

  // Handler for canvas changes (required by CanvasEditor)
  async function handleCanvasChange(canvasJson: string) {

    if (selectedClip && selectedClip.canvas !== canvasJson) {
      // Update local state first for responsiveness
      const updatedClip = { ...selectedClip, canvas: canvasJson };
      selectedClip = updatedClip; // Update local state

      // --- Save to backend ---
      try {
        const response = await fetch(`/api/clips/${selectedClip.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          // Send only the necessary data to update
          body: JSON.stringify({ canvas: canvasJson })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
          console.error(`Failed to save clip ${selectedClip.id}:`, response.status, errorData.message || response.statusText);
          // Optionally: Revert local state or show an error message to the user
          // For now, just log the error
        } else {

          // --- Generate and Upload Image Preview ---
          if (canvasEditorInstance) {
            const imageDataUrl = canvasEditorInstance.getCanvasImageDataUrl();
            if (imageDataUrl) {
              try {
                const uploadResponse = await fetch('/api/upload/clip-preview', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    clipId: selectedClip.id,
                    imageData: imageDataUrl
                  })
                });

                if (!uploadResponse.ok) {
                  const errorData = await uploadResponse.json().catch(() => ({ message: 'Failed to parse upload error response' }));
                  console.error(`Failed to upload preview for clip ${selectedClip.id}:`, uploadResponse.status, errorData.message || uploadResponse.statusText);
                } else {
                  const uploadData = await uploadResponse.json();
                  if (uploadData.imageUrl) {
                    // Add a timestamp to the image URL to prevent caching
                    const timestamp = Date.now();
                    const imageUrlWithTimestamp = `${uploadData.imageUrl}?t=${timestamp}`;

                    // Store the base URL (without timestamp) in the database
                    // This ensures consistent URLs across page reloads
                    try {
                      const updateResponse = await fetch(`/api/clips/${selectedClip.id}`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ imageUrl: uploadData.imageUrl })
                      });

                      if (!updateResponse.ok) {
                        console.error(`Failed to update clip ${selectedClip.id} with new imageUrl in database. Status: ${updateResponse.status}`);
                        const errorText = await updateResponse.text().catch(() => 'Could not read error response');
                        console.error(`Error response: ${errorText}`);
                      } else {
                        // Get the updated clip data from the response
                        const updatedClip = await updateResponse.json().catch(() => null);

                        if (updatedClip) {
                          // Update the selectedClip with the data from the database, but use the timestamped URL for display
                          selectedClip = { ...updatedClip, imageUrl: imageUrlWithTimestamp };

                          // Update the clip in the scenes array to keep everything in sync
                          const clipId = updatedClip.id; // Use updatedClip.id which is guaranteed to exist
                          scenes = scenes.map((scene: SceneWithRelations) => {
                            if (scene.clips) {
                              scene.clips = scene.clips.map((clip: Clip) => {
                                if (clip.id === clipId) {
                                  // Use the same timestamped URL for consistency
                                  return { ...updatedClip, imageUrl: imageUrlWithTimestamp };
                                }
                                return clip;
                              });
                            }
                            return scene;
                          });
                        }

                        // Force a refresh of the scene list to show the updated preview
                        // Use setTimeout to ensure the image is fully saved before refreshing
                        setTimeout(() => {
                          forceSceneRefresh++;
                        }, 500); // 500ms delay
                      }
                    } catch (updateError) {
                      // Use optional chaining to safely access selectedClip.id
                      console.error(`Error updating clip ${selectedClip?.id} with new imageUrl:`, updateError);
                    }
                  } else {
                    // Use optional chaining to safely access selectedClip.id
                    console.warn(`Upload endpoint for clip ${selectedClip?.id} did not return an imageUrl.`);
                  }
                }
              } catch (uploadError) {
                // Use optional chaining to safely access selectedClip.id
                console.error(`Error uploading preview for clip ${selectedClip?.id}:`, uploadError);
              }
            } else {
              // Use optional chaining to safely access selectedClip.id
              console.error(`Failed to generate image data URL from canvas for clip ${selectedClip?.id}.`);
            }
          } else {
             console.warn('CanvasEditor instance not available to generate image data.');
          }
          // --- End Generate and Upload Image Preview ---
        }
      } catch (error) {
        const clipId = selectedClip ? selectedClip.id : 'unknown';
        console.error(`Error in canvas save/preview process for clip ${clipId}:`, error);
        // Optionally: Handle network errors, show message
      }
      // --- End Save ---
    } else if (selectedClip && selectedClip.canvas === canvasJson) {
       console.log('Canvas data unchanged, skipping save.');
    }
  }

 </script>

<div class="flex flex-col h-[calc(100vh-18vh)] w-full">
  <div class="flex flex-grow overflow-hidden">
    <!-- Left Panel: Buttons/Tools -->
    <div class="w-48 border-r flex flex-col overflow-y-auto">
      <div class="p-3 space-y-2">
        <Button variant="outline" class="w-full justify-start" onclick={() => canvasEditorInstance?.addRectangle()} title="Add Rectangle" disabled={!canvasIsReady}>
          <Square class="h-4 w-4 mr-2" /> Rectangle
        </Button>
        <Button variant="outline" class="w-full justify-start" onclick={() => canvasEditorInstance?.addCircle()} title="Add Circle" disabled={!canvasIsReady}>
          <Circle class="h-4 w-4 mr-2" /> Circle
        </Button>
        <Button variant="outline" class="w-full justify-start" onclick={() => canvasEditorInstance?.addText()} title="Add Text" disabled={!canvasIsReady}>
          <Type class="h-4 w-4 mr-2" /> Text
        </Button>
        <Button variant="outline" class="w-full justify-start" onclick={() => canvasEditorInstance?.addImage()} title="Add Image" disabled={!canvasIsReady}>
          <ImageIcon class="h-4 w-4 mr-2" /> Image
        </Button>
        <Button variant="outline" class="w-full justify-start" onclick={() => canvasEditorInstance?.setBackgroundColor()} title="Set Background Color" disabled={!canvasIsReady}>
          <Palette class="h-4 w-4 mr-2" /> BG Color
        </Button>
        <Button variant="outline" class="w-full justify-start" onclick={() => canvasEditorInstance?.setBackgroundImageFromUrl()} title="Set Background Image" disabled={!canvasIsReady}>
          <ImageUp class="h-4 w-4 mr-2" /> BG Image
        </Button>
        <Button variant="outline" class="w-full justify-start" onclick={() => canvasEditorInstance?.deleteSelected()} title="Delete Selected" disabled={!canvasIsReady || !canvasEditorInstance?.hasSelectedObject()}>
          <Trash2 class="h-4 w-4 mr-2" /> Delete
        </Button>
        <Button variant="outline" class="w-full justify-start" onclick={() => canvasEditorInstance?.clearCanvas()} title="Clear Canvas" disabled={!canvasIsReady}>
          Clear All
        </Button>
      </div>
    </div>

    <!-- Canvas Area (Main View) -->
    <div class="flex-grow overflow-hidden flex flex-col">
      <div class="flex-grow p-4 overflow-auto relative">
        <CanvasEditor
          bind:this={canvasEditorInstance}
          onCanvasChange={handleCanvasChange}
          onReady={handleCanvasReady}
          hideControls={true}
        />
        {#if selectedClip === null && scenes.length > 0}
          <div class="flex items-center justify-center h-full text-muted-foreground absolute inset-0 pointer-events-none bg-white/50 top-12">
            Select a clip below to edit its canvas.
          </div>
        {/if}
      </div>
    </div>

    <!-- Right Panel: Clip Properties (only shown when a clip is selected) -->
    {#if selectedClip}
      <div class="w-80 border-l flex-shrink-0 overflow-y-auto">
        <div class="p-4 space-y-4">
          <h2 class="text-lg font-semibold">Edit Clip</h2>

          <!-- Order Index -->
          <div class="space-y-2">
            <Label for="orderIndex" class="flex items-center">
              <span>Order Index</span>
            </Label>
            <Input
              id="orderIndex"
              type="number"
              bind:value={selectedClip.orderIndex}
              min="0"
            />
          </div>

          <!-- Duration -->
          <div class="space-y-2">
            <Label for="duration" class="flex items-center">
              <Clock class="h-4 w-4 mr-1" /> <span>Duration</span>
            </Label>
            <div class="flex items-center gap-2">
              <Input
                id="duration"
                type="number"
                bind:value={selectedClip.duration}
                min="500"
                max="10000"
                step="100"
              />
              <span class="text-sm text-gray-500">{((selectedClip.duration || 3000) / 1000).toFixed(1)}s</span>
            </div>
            <p class="text-xs text-muted-foreground">Duration in milliseconds (0.5s to 10s)</p>
          </div>

          <!-- Description -->
          <div class="space-y-2">
            <Label for="description" class="flex items-center">
              <MessageSquare class="h-4 w-4 mr-1" /> <span>Description</span>
            </Label>
            <Textarea
              id="description"
              bind:value={selectedClip.description}
              placeholder="Brief description of this clip"
              rows={3}
            />
          </div>

          <!-- Narration -->
          <div class="space-y-2">
            <Label for="narration" class="flex items-center">
              <FileText class="h-4 w-4 mr-1" /> <span>Narration</span>
            </Label>
            <Textarea
              id="narration"
              bind:value={selectedClip.narration}
              placeholder="Enter narration text for this clip"
              rows={5}
            />
          </div>

          <!-- Save Button -->
          <div class="pt-2">
            <Button onclick={handleSaveClip} class="w-full">
              <Save class="h-4 w-4 mr-2" /> Save Changes
            </Button>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Scenes & Clips (Bottom Panel) -->
  <div class="border-t h-40 overflow-y-auto">
    <div class="p-3">
      <SceneList
        {scenes}
        {storyId}
        {onEditScene}
        {onDeleteScene}
        {onSelectScene}
        {onPlayScene}
        onSelectClip={handleSelectClip}
        onDuplicateClip={handleDuplicateClip}
        {onUpdateClip}
        refreshTrigger={forceSceneRefresh}
      />
    </div>
  </div>
</div>
