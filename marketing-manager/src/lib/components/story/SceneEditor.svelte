<script lang="ts">
  import SceneList from '$lib/components/story/SceneList.svelte';
  import CanvasEditor from '$lib/components/story/CanvasEditor.svelte';
  import type { SceneWithRelations, Clip } from '$lib/types/story.types';
  import { Button } from '$lib/components/ui/button';
  import { Square, Circle, Type, Image as ImageIcon, Trash2, Palette, ImageUp } from 'lucide-svelte';

  // Props passed down from the page
  let {
    scenes,
    creativeId,
    storyId,
    onAddScene,
    onEditScene,
    onDeleteScene,
    onSelectScene,
    onPlayScene // Optional
  } = $props<{
    scenes: SceneWithRelations[];
    creativeId: number;
    storyId: number;
    onAddScene: () => void;
    onEditScene: (sceneId: number) => void;
    onDeleteScene: (sceneId: number) => void;
    onSelectScene: (sceneId: number) => void; // Keep for scene-level actions
    onPlayScene?: (sceneId: number) => void; // Optional
  }>();

  // State for the selected clip
  let selectedClip = $state<Clip | null>(null);
  // State to track which clip's data is currently loaded in the canvas
  let loadedClipIdInCanvas = $state<number | null>(null);
  // State to track if the CanvasEditor child component is fully initialized
  let canvasIsReady = $state(false);

  // Reference to the CanvasEditor component instance
  let canvasEditorInstance = $state<CanvasEditor | null>(null);

  // Handler for when CanvasEditor signals it's ready
  function handleCanvasReady() {
    console.log('SceneEditor: Received ready signal from CanvasEditor.');
    canvasIsReady = true;
    // No need to trigger load here, the effect will handle it
  }

  // Handler for when a clip is selected in SceneList
  function handleSelectClip(clip: Clip) { // No longer async
    console.log('Clip selected in SceneEditor:', clip.id, clip.orderIndex);
    if (selectedClip?.id === clip.id) {
       console.log('Same clip selected, skipping state update.');
        return;
     }
     selectedClip = clip; // Update the state immediately
     // The $effect below will handle loading the canvas if necessary
   }

    // Effect to call loadCanvasData when selectedClip changes OR when canvas becomes ready,
    // but only if the selected clip is different from the one already loaded.
   $effect(() => {
     const newClipId = selectedClip?.id ?? null; // Use null if no clip is selected
     const canvasData = selectedClip?.canvas ?? null;
     const isInstanceAvailable = !!canvasEditorInstance; // Check if the instance binding exists

     console.log(`SceneEditor effect running. New Clip ID: ${newClipId}, Loaded Clip ID: ${loadedClipIdInCanvas}, Instance Available: ${isInstanceAvailable}, Canvas Ready: ${canvasIsReady}`);

     // Only proceed if the canvas instance is bound AND the canvas component signaled it's ready
     if (isInstanceAvailable && canvasIsReady && newClipId !== loadedClipIdInCanvas && canvasEditorInstance) {
        console.log(`Clip changed (${loadedClipIdInCanvas} -> ${newClipId}) and canvas is ready. Calling canvasEditorInstance.loadCanvasData.`);
        canvasEditorInstance.loadCanvasData(canvasData);
        loadedClipIdInCanvas = newClipId; // Update the tracker *after* loading
        console.log(`Updated loadedClipIdInCanvas to: ${loadedClipIdInCanvas}`);
     } else if (!isInstanceAvailable) {
        console.log('SceneEditor effect: canvasEditorInstance not available yet.');
     } else if (!canvasIsReady) {
        console.log('SceneEditor effect: canvasEditorInstance is available, but canvas is not ready yet.');
     } else if (newClipId === loadedClipIdInCanvas) {
        console.log(`SceneEditor effect: Selected clip (${newClipId}) is already loaded. Skipping canvas load.`);
     }
   });


  // Handler for canvas changes (required by CanvasEditor)
  async function handleCanvasChange(canvasJson: string) {
    console.log('Canvas changed in SceneEditor:', canvasJson ? canvasJson.substring(0, 50) + '...' : 'null');
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
          console.log(`Clip ${selectedClip.id} canvas saved successfully.`);

          // --- Generate and Upload Image Preview ---
          if (canvasEditorInstance) {
            const imageDataUrl = canvasEditorInstance.getCanvasImageDataUrl();
            if (imageDataUrl) {
              console.log(`Generated image data URL for clip ${selectedClip.id}. Uploading...`);
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
                    console.log(`Preview uploaded successfully for clip ${selectedClip.id}. New URL: ${uploadData.imageUrl}`);
                    // Update local state with the new image URL
                    selectedClip = { ...selectedClip, imageUrl: uploadData.imageUrl };
                    // Note: The backend /api/upload/clip-preview saves the file,
                    // but doesn't update the clip record in the DB with the URL.
                    // If that's needed, a separate PUT /api/clips/[id] call
                    // with { imageUrl: uploadData.imageUrl } might be required here or in the backend.
                  } else {
                    console.warn(`Upload endpoint for clip ${selectedClip.id} did not return an imageUrl.`);
                  }
                }
              } catch (uploadError) {
                console.error(`Error uploading preview for clip ${selectedClip.id}:`, uploadError);
              }
            } else {
              console.error(`Failed to generate image data URL from canvas for clip ${selectedClip.id}.`);
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

<div class="flex flex-col h-[calc(100vh-6rem)] w-full">
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
  </div>

  <!-- Scenes & Clips (Bottom Panel) -->
  <div class="border-t h-40 overflow-y-auto">
    <div class="p-3">
      <SceneList
        {scenes}
        {creativeId}
        {storyId}
        {onAddScene}
        {onEditScene}
        {onDeleteScene}
        {onSelectScene}
        {onPlayScene}
        onSelectClip={handleSelectClip}
      />
    </div>
  </div>
</div>
