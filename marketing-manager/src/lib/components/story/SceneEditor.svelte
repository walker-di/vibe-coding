<script lang="ts">
  import SceneList from '$lib/components/story/SceneList.svelte';
  import CanvasEditor from '$lib/components/story/CanvasEditor.svelte';
  import type { SceneWithRelations, Clip } from '$lib/types/story.types';
  // Removed tick import as it's no longer needed here

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

  // Reference to the CanvasEditor component instance
  let canvasEditorInstance: CanvasEditor;

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

    // Effect to call loadCanvasData when selectedClip changes OR when canvasEditorInstance becomes available,
    // but only if the selected clip is different from the one already loaded.
   $effect(() => {
     const newClipId = selectedClip?.id ?? null; // Use null if no clip is selected
     const canvasData = selectedClip?.canvas ?? null;
     const isInstanceReady = !!canvasEditorInstance;

     console.log(`SceneEditor effect running. New Clip ID: ${newClipId}, Loaded Clip ID: ${loadedClipIdInCanvas}, Instance Ready: ${isInstanceReady}`);

     if (isInstanceReady && newClipId !== loadedClipIdInCanvas) {
        console.log(`Clip changed (${loadedClipIdInCanvas} -> ${newClipId}). Calling canvasEditorInstance.loadCanvasData.`);
        canvasEditorInstance.loadCanvasData(canvasData);
        loadedClipIdInCanvas = newClipId; // Update the tracker *after* loading
        console.log(`Updated loadedClipIdInCanvas to: ${loadedClipIdInCanvas}`);
     } else if (!isInstanceReady) {
        console.log('SceneEditor effect: canvasEditorInstance not ready yet.');
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
          // Optionally: Update the clip in the parent `scenes` array if needed,
          // though the local update might be sufficient if the parent re-fetches.
        }
      } catch (error) {
        console.error(`Error saving clip ${selectedClip.id}:`, error);
        // Optionally: Handle network errors, show message
      }
      // --- End Save ---
    } else if (selectedClip && selectedClip.canvas === canvasJson) {
       console.log('Canvas data unchanged, skipping save.');
    }
  }
 
 </script>

<div class="flex flex-col h-[calc(100vh-10rem)]">

  <div class="flex-grow border rounded-md p-4 mb-4 overflow-auto relative">
      <h2 class="text-lg font-semibold mb-2">Canvas Editor</h2>
       <div>
         <CanvasEditor
           bind:this={canvasEditorInstance} 
           onCanvasChange={handleCanvasChange} 
         />
       </div>
       {#if selectedClip === null && scenes.length > 0}
         <div class="flex items-center justify-center h-full text-muted-foreground absolute inset-0 pointer-events-none bg-white/50 top-12">
           Select a clip below to edit its canvas.
         </div>
       {/if}
   </div>

  <div class="flex-shrink-0 border-t pt-4">
     <h2 class="text-lg font-semibold mb-2 px-4">Scenes & Clips</h2>
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
