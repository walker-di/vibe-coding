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
    // The $effect below will handle calling loadCanvasData
  }

  // Effect to call loadCanvasData when selectedClip changes OR when canvasEditorInstance becomes available
  $effect(() => {
    console.log(`SceneEditor effect running. Clip ID: ${selectedClip?.id}, Editor Instance: ${canvasEditorInstance ? 'Ready' : 'Not Ready'}`);
    if (canvasEditorInstance) {
       // Call method imperatively when selectedClip changes or instance is ready
       canvasEditorInstance.loadCanvasData(selectedClip?.canvas ?? null);
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
