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

  // Reference to the CanvasEditor component instance
  let canvasEditorInstance: CanvasEditor;

  // Handler for when a clip is selected in SceneList
  function handleSelectClip(clip: Clip) { // No longer async
    console.log('Clip selected in SceneEditor:', clip.id, clip.orderIndex);
    if (selectedClip?.id === clip.id) {
       console.log('Same clip selected, skipping state update.');
        return;
     }
     selectedClip = clip; // Just update the state
     // The $effect below *should* handle calling loadCanvasData, but let's try a direct call too for debugging
     if (canvasEditorInstance) {
        console.log(`[handleSelectClip] Scheduling direct call to loadCanvasData for clip ${clip.id}`);
        // Use a timeout to ensure this runs after the current execution context allows potential state updates
        setTimeout(() => {
           if (canvasEditorInstance) { // Check again inside timeout
              console.log(`[handleSelectClip - setTimeout] Calling loadCanvasData for clip ${clip.id}`);
              canvasEditorInstance.loadCanvasData(clip.canvas ?? null);
           } else {
              console.log('[handleSelectClip - setTimeout] canvasEditorInstance became unavailable.');
           }
        }, 0);
     } else {
        console.log('[handleSelectClip] canvasEditorInstance not ready for direct call.');
     }
   }
 
    // Effect to call loadCanvasData when selectedClip changes OR when canvasEditorInstance becomes available
   $effect(() => {
     const clipId = selectedClip?.id;
     const canvasData = selectedClip?.canvas ?? null;
     const isInstanceReady = !!canvasEditorInstance;
     
     console.log(`SceneEditor effect running. Clip ID: ${clipId}, Instance Ready: ${isInstanceReady}, Has Canvas Data: ${!!canvasData}`);
     
     if (isInstanceReady) {
        console.log(`Calling canvasEditorInstance.loadCanvasData with canvas data for clip ${clipId}`);
        canvasEditorInstance.loadCanvasData(canvasData);
     } else {
        console.log('SceneEditor effect: canvasEditorInstance not ready yet.');
     }
   });


  // Handler for canvas changes (required by CanvasEditor)
  function handleCanvasChange(canvasJson: string) {
    // TODO: Implement saving logic if needed here or pass up further
    console.log('Canvas changed in SceneEditor:', canvasJson ? canvasJson.substring(0, 50) + '...' : 'null');
    if (selectedClip) {
      // Update local state cautiously - create new object to ensure reactivity
      // Avoid triggering the $effect again if only canvas content changed internally
      if (selectedClip.canvas !== canvasJson) {
         selectedClip = { ...selectedClip, canvas: canvasJson };
      }
     }
   }
 
   // Removed unused derived prop
 
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
