<script lang="ts">
  import SceneList from '$lib/components/story/SceneList.svelte';
  import CanvasEditor from '$lib/components/story/CanvasEditor.svelte';
  import type { SceneWithRelations, Clip } from '$lib/types/story.types';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Label } from '$lib/components/ui/label';
  import { Square, Circle, Type, Image as ImageIcon, Trash2, Palette, ImageUp, Save, FileText, MessageSquare, Clock, Sparkles, Layers } from 'lucide-svelte';

  // Props passed down from the page
  let {
    scenes,
    storyId,
    creativeId, // We need this for creating new stories
    aspectRatio = '16:9', // Default to 16:9 if not provided
    // resolution is not used but kept in the type for future use
    onEditScene,
    onDeleteScene,
    onSelectScene,
    onPlayScene, // Optional
    onUpdateClip, // Optional
    // onSelectClip is not used here - we use our own handleSelectClip
    onDuplicateClip // Optional - for duplicating clips
  } = $props<{
    scenes: SceneWithRelations[];
    creativeId: number; // Required for creating new stories
    storyId: number;
    aspectRatio?: string; // Optional aspect ratio from story
    resolution?: string | null; // Optional resolution from story
    onAddScene?: () => void; // Made optional since it's not used here
    onEditScene: (sceneId: number) => void;
    onDeleteScene: (sceneId: number) => void;
    onSelectScene: (sceneId: number) => void; // Keep for scene-level actions
    onPlayScene?: (sceneId: number) => void; // Optional
    onUpdateClip?: (clipId: number, data: Partial<Clip>) => Promise<void>; // Optional
    onSelectClip?: (clip: Clip) => void; // Optional - for navigating to clip detail page
    onDuplicateClip?: (clip: Clip) => Promise<void>; // Optional - for duplicating clips
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
  // Removed isLoadingCanvas state

  // Reference to the CanvasEditor component instance
  let canvasEditorInstance = $state<CanvasEditor | null>(null);

  // --- Debounce Utility ---
  function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return function executedFunction(...args: Parameters<T>) {
      const later = () => {
        timeout = null;
        func(...args);
      };
      if (timeout !== null) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(later, wait);
    };
  }
  // --- End Debounce ---

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
    // Ensure all required properties have default values if they're null
    selectedClip = {
      ...clip,
      duration: clip.duration || 3000, // Default to 3 seconds if not set
      narration: clip.narration || '', // Ensure narration is not null
      description: clip.description || '', // Ensure description is not null
      orderIndex: clip.orderIndex ?? 0, // Ensure orderIndex is not null
      // Make sure canvas and imageUrl are preserved
      canvas: clip.canvas || '', // Empty string instead of null for canvas
      imageUrl: clip.imageUrl || ''
    };
    console.log('Clip selected in SceneEditor:', clip.id, clip.orderIndex);

    // The $effect below will handle loading the canvas once selectedClip is updated
  }



  // State for the auto-create modal
  let showAutoCreateModal = $state(false);
  let isAutoCreating = $state(false);
  let storyPrompt = $state('');

  // Handler for opening the auto-create modal
  function openAutoCreateModal() {
    showAutoCreateModal = true;
  }

  // Handler for auto-creating a story using AI
  async function handleAutoCreateStory() {
    if (!storyPrompt) return;

    isAutoCreating = true;

    try {
      // Get the current story ID from props
      // storyId is already available from props

      // Call the unified auto-create API endpoint
      const response = await fetch('/api/storyboard/auto-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyPrompt,
          storyId, // Pass the current storyId if available
          creativeId // Pass the creativeId for creating a new story if needed
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to auto-create story. Status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Auto-create result:', result);

      // Close the modal
      showAutoCreateModal = false;

      // Refresh the scene list
      forceSceneRefresh++;

      // Show success message
      alert(`Successfully created ${result.clipCount} clips from the AI storyboard!`);

    } catch (error: any) {
      console.error('Error auto-creating story:', error);

      // Provide more specific error messages based on common issues
      if (error.message.includes('Failed to connect to AI storyboard creator')) {
        alert('Failed to connect to the AI storyboard creator. Please make sure the 003-ai-storyboard-creator project is running on port 5173.');
      } else {
        alert(`Failed to auto-create story: ${error.message || 'Unknown error'}`);
      }
    } finally {
      isAutoCreating = false;
    }
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

      // Get the response data { success, data, message }
      const responseData = await response.json();
      if (!responseData.success || !responseData.data) {
        throw new Error(responseData.message || 'Failed to get valid clip data from create API response.');
      }
      const newClip = responseData.data; // Extract the actual clip object

      // Set the image URL based on the clip ID
      const imageUrl = `/clip-previews/clip-${newClip.id}.png`; // Use newClip.id

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
      let updatedClipWithUrl;
      try {
        if (updateResponse.ok) {
          const updateResponseData = await updateResponse.json();
          if (!updateResponseData.success || !updateResponseData.data) {
            console.warn('Update response was ok but data structure is invalid:', updateResponseData);
            updatedClipWithUrl = { ...newClip, imageUrl }; // Fallback
          } else {
            updatedClipWithUrl = updateResponseData.data; // Extract from data property
          }
        } else {
          // If update failed, use the initially created clip but add the expected imageUrl
          updatedClipWithUrl = { ...newClip, imageUrl };
        }
      } catch (err) {
        console.warn('Error parsing update response JSON:', err);
        updatedClipWithUrl = { ...newClip, imageUrl }; // Fallback
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

      // Add the new clip (with the image URL) to the scene's clips array
      const updatedScenes = scenes.map((s: SceneWithRelations) => {
        if (s.id === scene.id) {
          // Add the updated clip (which now has imageUrl) to the scene's clips array
          const updatedClips = [...(s.clips || []), updatedClipWithUrl];
          // Sort clips by orderIndex to ensure they appear in the correct order
          updatedClips.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)); // Handle potential null orderIndex
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

    // Effect to call loadCanvasData when selectedClip changes OR when canvas becomes ready.
   $effect(() => {
     // When selectedClip changes, load its canvas data if it differs from the current editor state
     // Removed isLoadingCanvas check here, effect should run based on clip/ready state
     if (selectedClip && canvasEditorInstance && canvasIsReady) {
       const canvasToLoad = selectedClip.canvas || '{}'; // Default to empty JSON string if null/undefined
       const currentEditorJson = canvasEditorInstance.getCurrentCanvasJson();

       // Only load if the selected clip's canvas data is different from the current editor state
       if (canvasToLoad !== currentEditorJson) {
         console.log('Canvas data differs, loading canvas for clip:', selectedClip.id);
         // No need to set isLoadingCanvas here anymore

         // Load canvas data
         try {
           canvasEditorInstance.loadCanvasData(canvasToLoad); // Pass the string directly
         } catch (error) {
            console.error('Error loading canvas data:', error);
         }
         // No finally block needed here for isLoadingCanvas
       } else {
         console.log('Skipping canvas load - selected clip data matches current editor state.');
       }
     } else if (!selectedClip) {
       console.log('No clip selected, canvas load skipped.');
       // Optionally clear canvas if no clip is selected
       // if (canvasEditorInstance && canvasIsReady && !isLoadingCanvas) {
       //   const currentEditorJson = canvasEditorInstance.getCurrentCanvasJson();
       //   if (currentEditorJson !== '{}') {
       //      console.log('Clearing canvas as no clip is selected.');
       //      canvasEditorInstance.clearCanvas(); // Be careful with this, might trigger save
       //   }
       // }
     }
   });


  // Handler for saving clip properties
  async function handleSaveClip() {
    // Early return if no clip is selected
    if (!selectedClip) return;

    // Store the clip ID for later use
    const clipId = selectedClip.id;

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

      // Ensure the updatedClip has an ID (use the original ID if missing)
      if (!updatedClip.id && selectedClip.id) {
        updatedClip.id = selectedClip.id;
      }

      // Log the before and after state for debugging
      console.log('handleSaveClip - Before update - selectedClip:', JSON.stringify({
        id: selectedClip.id,
        narration: selectedClip.narration,
        description: selectedClip.description,
        duration: selectedClip.duration,
        orderIndex: selectedClip.orderIndex,
        hasCanvas: !!selectedClip.canvas,
        hasImageUrl: !!selectedClip.imageUrl
      }));

      console.log('handleSaveClip - Server response - updatedClip:', JSON.stringify({
        id: updatedClip.id,
        narration: updatedClip.narration,
        description: updatedClip.description,
        duration: updatedClip.duration,
        orderIndex: updatedClip.orderIndex,
        hasCanvas: !!updatedClip.canvas,
        hasImageUrl: !!updatedClip.imageUrl
      }));

      // Create a complete clip object with all required properties
      const completeClip = {
        // Start with all properties from the current selectedClip
        ...selectedClip,
        // Override with properties from the updatedClip
        ...updatedClip,
        // Ensure these specific properties are preserved
        narration: updatedClip.narration ?? selectedClip.narration ?? '',
        description: updatedClip.description ?? selectedClip.description ?? '',
        duration: updatedClip.duration ?? selectedClip.duration ?? 3000,
        orderIndex: updatedClip.orderIndex ?? selectedClip.orderIndex ?? 0,
        // Preserve canvas data to prevent the canvas from disappearing
        canvas: selectedClip.canvas || updatedClip.canvas || '',
        // Preserve image URL if not returned by the API
        imageUrl: updatedClip.imageUrl || selectedClip.imageUrl || ''
      };

      // Update the selectedClip with the complete object
      selectedClip = completeClip;

      console.log('handleSaveClip - After update - selectedClip:', JSON.stringify({
        id: completeClip.id,
        narration: completeClip.narration,
        description: completeClip.description,
        duration: completeClip.duration,
        orderIndex: completeClip.orderIndex,
        hasCanvas: !!completeClip.canvas,
        hasImageUrl: !!completeClip.imageUrl
      }));

      // Update the clip in the scenes array with the same complete clip object
      scenes = scenes.map((scene: SceneWithRelations) => {
        if (scene.clips) {
          scene.clips = scene.clips.map((c: Clip) => {
            if (c.id === updatedClip.id) {
              // Use the same complete clip object we created above
              return completeClip;
            }
            return c;
          });
        }
        return scene;
      });

      // Call the onUpdateClip callback if provided
      // Use the stored clipId which we know is valid, not updatedClip.id which might be undefined
      if (onUpdateClip && clipId) {
        await onUpdateClip(clipId, updateData);
      }

      console.log('Clip properties saved successfully');
      // Removed: forceSceneRefresh++; // Rely on direct state updates
    } catch (error) {
      console.error('Error saving clip properties:', error);
      alert('Failed to save clip properties. Please try again.');
    }
  }

  // --- Debounced Canvas Change Processing ---
  const processCanvasChange = debounce(async (canvasJson: string) => {
    console.log('Debounced: Processing canvas change');

    // Check again if clip is selected, as it might have changed during the debounce period
    if (!selectedClip) {
      console.log('Debounced: No clip selected, skipping save.');
      return;
    }

    // Check if data actually changed compared to the current selected clip state
    // This prevents saving if the user rapidly undid changes during the debounce period
    if (selectedClip.canvas === canvasJson) {
        console.log('Debounced: Canvas data matches current clip state, skipping save.');
        return;
    }

    console.log('Debounced: Canvas changed, updating clip data');

    // --- Proceed with saving ---
    // Use a temporary variable for the selected clip ID in case it changes
    const clipToUpdate = selectedClip;

    // Update local state first for responsiveness
    const updatedLocalClip = { ...clipToUpdate, canvas: canvasJson };
    // Update the main selectedClip state
    // Note: This might cause a brief flicker if the user selects another clip *during* the save
    // but is necessary for the UI to reflect the change being saved.
    selectedClip = updatedLocalClip;

    // Update the clip in the main scenes array as well
    scenes = scenes.map((scene: SceneWithRelations) => {
      if (scene.clips) {
        scene.clips = scene.clips.map((c: Clip) => {
          if (c.id === clipToUpdate.id) {
            return updatedLocalClip; // Use the locally updated version
          }
          return c;
        });
      }
      return scene;
    });


    // --- Save to backend ---
    try {
      const response = await fetch(`/api/clips/${clipToUpdate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        // Send only the necessary data to update
        body: JSON.stringify({ canvas: canvasJson })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
        console.error(`Debounced: Failed to save clip ${clipToUpdate.id}:`, response.status, errorData.message || response.statusText);
        // Optionally: Revert local state or show an error message to the user
        // For now, just log the error
      } else {
        console.log(`Debounced: Clip ${clipToUpdate.id} canvas saved successfully.`);

        // --- Generate and Upload Image Preview ---
        if (canvasEditorInstance) {
          console.log('Debounced: Generating preview image for clip', clipToUpdate.id);
          const imageDataUrl = canvasEditorInstance.getCanvasImageDataUrl();
          if (imageDataUrl) {
            console.log('Debounced: Preview image generated, uploading...');
            try {
              const uploadResponse = await fetch('/api/upload/clip-preview', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  clipId: clipToUpdate.id,
                  imageData: imageDataUrl
                })
              });

              if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json().catch(() => ({ message: 'Failed to parse upload error response' }));
                console.error(`Debounced: Failed to upload preview for clip ${clipToUpdate.id}:`, uploadResponse.status, errorData.message || uploadResponse.statusText);
              } else {
                const uploadData = await uploadResponse.json();
                console.log('Debounced: Upload response data:', uploadData);

                // Extract the imageUrl from the response data
                const imageUrl = uploadData.data?.imageUrl || uploadData.imageUrl;

                if (imageUrl) {
                  console.log('Debounced: Got image URL from response:', imageUrl);
                  // Add a timestamp to the image URL to prevent caching
                  const timestamp = Date.now();
                  const imageUrlWithTimestamp = `${imageUrl}?t=${timestamp}`;

                  // Store the base URL (without timestamp) in the database
                  try {
                    const cleanImageUrl = imageUrl ? imageUrl.split('?')[0] : imageUrl;
                    console.log('Debounced: Updating clip with new image URL:', cleanImageUrl);

                    const updateResponse = await fetch(`/api/clips/${clipToUpdate.id}`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({ imageUrl: cleanImageUrl })
                    });

                    if (!updateResponse.ok) {
                      console.error(`Debounced: Failed to update clip ${clipToUpdate.id} with new imageUrl in database. Status: ${updateResponse.status}`);
                      const errorText = await updateResponse.text().catch(() => 'Could not read error response');
                      console.error(`Debounced: Error response: ${errorText}`);
                    } else {
                      console.log('Debounced: Successfully updated clip with new image URL');
                      // Get the updated clip data from the response
                      const updatedClipFromServer = await updateResponse.json().catch(() => null);

                      if (updatedClipFromServer) {
                        console.log('Debounced: Received updated clip data from server after image URL update');

                        // Merge server data with the *current* selectedClip state,
                        // preserving the latest canvasJson that was just saved.
                        const finalClipState = {
                          ...(selectedClip?.id === clipToUpdate.id ? selectedClip : updatedLocalClip), // Use current selectedClip if it's still the same one
                          ...updatedClipFromServer,
                          canvas: canvasJson, // Ensure we keep the canvas that triggered this save
                          imageUrl: imageUrlWithTimestamp // Use the timestamped URL for display
                        };

                        // Update selectedClip only if it's still the one we were working on
                        if (selectedClip?.id === clipToUpdate.id) {
                           selectedClip = finalClipState;
                           console.log('Debounced: Updated selectedClip state after image URL save.');
                        } else {
                           console.log('Debounced: selectedClip changed during image URL save, not updating main state.');
                        }


                        // Update the clip in the scenes array
                        scenes = scenes.map((scene: SceneWithRelations) => {
                          if (scene.clips) {
                            scene.clips = scene.clips.map((clip: Clip) => {
                              if (clip.id === clipToUpdate.id) {
                                return finalClipState; // Use the final merged state
                              }
                              return clip;
                            });
                          }
                          return scene;
                        });

                        // Force a refresh of the SceneList to show the updated preview
                        forceSceneRefresh++;
                        console.log('Debounced: Clip canvas and preview updated successfully.');
                      }
                    }
                  } catch (updateError) {
                    console.error(`Debounced: Error updating clip ${clipToUpdate.id} with new imageUrl:`, updateError);
                  }
                } else {
                  console.warn(`Debounced: Upload endpoint for clip ${clipToUpdate.id} did not return an imageUrl.`);
                }
              }
            } catch (uploadError) {
              console.error(`Debounced: Error uploading preview for clip ${clipToUpdate.id}:`, uploadError);
            }
          } else {
            console.error(`Debounced: Failed to generate image data URL from canvas for clip ${clipToUpdate.id}.`);
          }
        } else {
           console.warn('Debounced: CanvasEditor instance not available to generate image data.');
        }
        // --- End Generate and Upload Image Preview ---
      }
    } catch (error) {
      console.error(`Debounced: Error in canvas save/preview process for clip ${clipToUpdate.id}:`, error);
      // Optionally: Handle network errors, show message
    }
  }, 500); // 500ms debounce delay

  // Original handler now just calls the debounced version
  function handleCanvasChange(canvasJson: string) {
    console.log('Canvas change detected, invoking debounced handler...');
    processCanvasChange(canvasJson);
  }

 </script>

<div class="flex flex-col h-[calc(100vh-15vh)] w-full">
  <div class="flex flex-grow overflow-hidden">
    <!-- Left Panel: Buttons/Tools -->
    <div class="w-48 border-r flex flex-col overflow-y-auto">
      <div class="p-3 space-y-2">
        <Button variant="outline" class="w-full justify-start bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600" onclick={openAutoCreateModal} title="Auto-create story with AI">
          <Sparkles class="h-4 w-4 mr-2" /> Auto Create
        </Button>
        <div class="border-t my-2"></div>
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
        <Button variant="outline" class="w-full justify-start" onclick={() => canvasEditorInstance?.showLayerOrderModal()} title="Manage Layers" disabled={!canvasIsReady}>
          <Layers class="h-4 w-4 mr-2" /> Layers
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
              bind:value={selectedClip!.orderIndex}
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
                bind:value={selectedClip!.duration}
                min="500"
                max="10000"
                step="100"
              />
              <span class="text-sm text-gray-500">{((selectedClip!.duration || 3000) / 1000).toFixed(1)}s</span>
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
              bind:value={selectedClip!.description}
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
              bind:value={selectedClip!.narration}
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
        onDuplicateClip={onDuplicateClip || handleDuplicateClip}
        {onUpdateClip}
        refreshTrigger={forceSceneRefresh}
      />
    </div>
  </div>
</div>

<!-- Auto-Create Story Modal -->
{#if showAutoCreateModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white p-6 rounded-lg shadow-lg w-[500px] max-w-[90vw]">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold flex items-center">
          <Sparkles class="h-5 w-5 mr-2 text-purple-500" />
          Auto-Create Story
        </h2>
        <button
          class="text-gray-500 hover:text-gray-700"
          onclick={() => { if (!isAutoCreating) { showAutoCreateModal = false; } }}
          disabled={isAutoCreating}
          type="button"
        >
          &times;
        </button>
      </div>

      <div class="mb-4">
        <label for="storyPrompt" class="mb-2 block">Story Prompt</label>
        <Textarea
          id="storyPrompt"
          bind:value={storyPrompt}
          placeholder="Describe the story you want to create..."
          rows={5}
          disabled={isAutoCreating}
          class="w-full"
        />
        <p class="text-xs text-gray-500 mt-1">
          Provide a detailed description of the story you want to create. The AI will generate multiple clips based on your prompt.
        </p>
      </div>

      <div class="flex justify-end space-x-2">
        <button
          class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          onclick={() => { if (!isAutoCreating) { showAutoCreateModal = false; } }}
          disabled={isAutoCreating}
          type="button"
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 rounded-md bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 flex items-center justify-center"
          onclick={() => {
            if (storyPrompt.trim()) {
              handleAutoCreateStory();
            } else {
              alert('Please enter a story prompt');
            }
          }}
          disabled={isAutoCreating}
          type="button"
        >
          {#if isAutoCreating}
            <div class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
            Generating...
          {:else}
            <Sparkles class="h-4 w-4 mr-2" />
            Create Story
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
