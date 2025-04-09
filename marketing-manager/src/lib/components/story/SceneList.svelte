<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Edit, Trash2, Play, Plus, Music, Image as ImageIcon, Copy } from 'lucide-svelte';
  import type { SceneWithRelations, Clip } from '$lib/types/story.types';
  import CanvasPreview from '$lib/components/story/CanvasPreview.svelte';
  import { onMount } from 'svelte';

  // Create a timestamp that will be used to force image refreshes
  let timestamp = $state(Date.now());

  // Function to refresh the timestamp
  function refreshTimestamp() {
    timestamp = Date.now();
  }

  // Refresh timestamp only when the component is mounted
  onMount(() => {
    // Initial refresh
    refreshTimestamp();
    // No need for interval - we'll refresh on demand with refreshTrigger
  });

  // Props
  let {
    scenes,
    creativeId, // Used in navigation URLs
    storyId,
    onAddScene,
    onEditScene,
    onDeleteScene,
    onSelectScene,
    onPlayScene,
    onSelectClip,
    onDuplicateClip,
    refreshTrigger = 0 // Added to force refresh
  } = $props<{
    scenes: SceneWithRelations[];
    creativeId: number;
    storyId: number;
    onAddScene?: () => void;
    onEditScene: (sceneId: number) => void;
    onDeleteScene: (sceneId: number) => void;
    onSelectScene: (sceneId: number) => void;
    onPlayScene?: (sceneId: number) => void;
    onSelectClip: (clip: Clip) => void;
    onDuplicateClip?: (clip: Clip) => void;
    refreshTrigger?: number; // Optional prop to force refresh
  }>();

  // Track the last seen refreshTrigger value to prevent infinite loops
  let lastSeenRefreshTrigger = $state(0);

  // Effect to update timestamp when refreshTrigger changes
  $effect(() => {
    // Only update if the refreshTrigger has actually changed to a new value
    if (refreshTrigger > 0 && refreshTrigger !== lastSeenRefreshTrigger) {
      lastSeenRefreshTrigger = refreshTrigger;
      refreshTimestamp();
    }
  });

  // State
  let isCreatingScene = $state(false);
  let isCreatingClip = $state<{[sceneId: number]: boolean}>({});

  // Create a new scene directly
  async function createNewScene() {
    if (isCreatingScene) return;
    isCreatingScene = true;

    try {
      // Calculate the next order index
      const nextOrderIndex = scenes.length > 0
        ? Math.max(...scenes.map((scene: SceneWithRelations) => scene.orderIndex)) + 1
        : 0;

      // Create a new scene with default values
      const response = await fetch('/api/scenes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          storyId: storyId,
          orderIndex: nextOrderIndex,
          bgmUrl: null,
          bgmName: null
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create scene. Status: ${response.status}`);
      }

      // Get the newly created scene from the response
      const newScene = await response.json();

      // Add the new scene to the scenes array
      scenes = [...scenes, { ...newScene, clips: [] }];

      // Also call the parent's onAddScene if it exists
      if (onAddScene) {
        onAddScene();
      }
    } catch (error) {
      console.error('Error creating scene:', error);
      alert('Failed to create new scene. Please try again.');
    } finally {
      isCreatingScene = false;
    }
  }

  // Create a new clip directly
  async function createNewClip(sceneId: number) {
    // Skip if already creating a clip for this scene
    if (isCreatingClip[sceneId]) return;

    // Set creating state for this specific scene
    isCreatingClip = { ...isCreatingClip, [sceneId]: true };

    try {
      // Find the scene
      const scene = scenes.find((s: SceneWithRelations) => s.id === sceneId);
      if (!scene) {
        throw new Error(`Scene with ID ${sceneId} not found`);
      }

      // Calculate the next order index for clips in this scene
      const nextOrderIndex = scene.clips && scene.clips.length > 0
        ? Math.max(...scene.clips.map((clip: Clip) => clip.orderIndex)) + 1
        : 0;

      // Create a minimal empty canvas data (valid JSON for fabric.js)
      const emptyCanvas = JSON.stringify({
        version: '5.3.0',
        objects: [],
        background: '#ffffff'
      });

      // Create a new clip with default values
      const response = await fetch('/api/clips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sceneId: sceneId,
          orderIndex: nextOrderIndex,
          canvas: emptyCanvas,
          narration: null,
          imageUrl: null // We'll update this after getting the ID
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create clip. Status: ${response.status}`);
      }

      // Get the newly created clip from the response
      const newClip = await response.json();

      // Set the image URL based on the clip ID
      // Format: /clip-previews/clip-<CLIP_ID>.png
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
        console.warn(`Failed to update clip with image URL. Status: ${updateResponse.status}`);
      }

      // Get the updated clip with the image URL
      let updatedClip;
      try {
        updatedClip = updateResponse.ok ? await updateResponse.json() : { ...newClip, imageUrl };
      } catch (err) {
        // If there's an error parsing the response, use the original clip with the image URL
        console.warn('Error parsing update response:', err);
        updatedClip = { ...newClip, imageUrl };
      }

      // Add the new clip to the scene's clips array
      const updatedScenes = scenes.map((s: SceneWithRelations) => {
        if (s.id === sceneId) {
          return {
            ...s,
            clips: [...(s.clips || []), updatedClip]
          };
        }
        return s;
      });

      scenes = updatedScenes;

    } catch (error) {
      console.error('Error creating clip:', error);
      alert('Failed to create new clip. Please try again.');
      // Reset creating state for this scene
      isCreatingClip = { ...isCreatingClip, [sceneId]: false };
    }
  }
</script>

<div class="space-y-4">
  <div class="flex space-x-1 overflow-x-auto">
    {#if scenes.length > 0}
      {#each scenes as scene, index (scene.id)}
        <div class="border rounded-md p-0 hover:shadow-md transition-shadow p-2 flex-shrink-0">
          <div class="flex justify-between items-start mb-2">
            <div class="flex-1 min-w-0">
              <button
                type="button"
                class="text-lg font-semibold hover:text-blue-600 cursor-pointer truncate text-left w-full"
                title="Scene {index + 1}"
                onclick={() => onSelectScene(scene.id)}
                onkeydown={(e) => e.key === 'Enter' && onSelectScene(scene.id)}>
                Scene {index + 1}
              </button>
              <div class="flex items-center text-sm text-muted-foreground">
                {#if scene.bgmName}
                  <Music class="h-3 w-3 mr-1" />
                  <span class="mr-3">{scene.bgmName}</span>
                {/if}
                <!-- Removed simple clip count -->
              </div>
            </div>
            <div class="flex gap-1 flex-shrink-0">
              {#if onPlayScene}
                <Button variant="ghost" class="h-8 w-8 p-0" onclick={() => onPlayScene(scene.id)} title="Play Scene">
                  <Play class="h-4 w-4" />
                </Button>
              {/if}
              <Button variant="ghost" class="h-8 w-8 p-0" onclick={() => onEditScene(scene.id)} title="Edit Scene">
                <Edit class="h-4 w-4" />
              </Button>
              <Button variant="ghost" class="h-8 w-8 p-0" onclick={() => onDeleteScene(scene.id)} title="Delete Scene">
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
          </div>

          <!-- Clip Preview Row -->
          <div class="mt-2 flex space-x-1 overflow-x-auto pb-1">
            {#if scene.clips && scene.clips.length > 0}
              {#each scene.clips as clip (clip.id)}
                <div class="relative flex-shrink-0 group m-1 mr-0">
                  <button
                    type="button"
                    onclick={() => onSelectClip(clip)}
                    class="flex-shrink-0 w-auto h-[40px] border rounded overflow-hidden bg-gray-100 flex items-center justify-center relative hover:ring-2 hover:ring-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow cursor-pointer p-0"
                    title="Select Clip {clip.orderIndex}">
                    {#if clip.imageUrl}
                      <img
                        src={`${clip.imageUrl}?t=${timestamp}`}
                        alt="Clip preview"
                        class="object-cover w-full h-full"
                        loading="lazy"
                      />
                    {:else if clip.canvas}
                      <CanvasPreview canvasData={clip.canvas} width={50} height={33} />
                    {:else}
                      <ImageIcon class="h-4 w-4 text-gray-400" />
                    {/if}
                  </button>
                  {#if onDuplicateClip}
                    <button
                      type="button"
                      onclick={(e) => { e.stopPropagation(); onDuplicateClip(clip); }}
                      class="absolute top-0.5 -right-0 bg-white rounded-full p-0.5 shadow-sm border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
                      title="Duplicate Clip">
                      <Copy class="h-3 w-3 text-gray-600" />
                    </button>
                  {/if}
                </div>
              {/each}
              {#if scene.clips.length > 7}
                <div class="flex-shrink-0 w-[50px] h-[33px] border rounded bg-gray-100 flex items-center justify-center text-xs text-muted-foreground" title="{scene.clips.length - 7} more clips">
                  + {scene.clips.length - 7}
                </div>
              {/if}
            {/if}

            <!-- Add Clip Button (next to the last clip) -->
            <button
              type="button"
              onclick={() => createNewClip(scene.id)}
              disabled={isCreatingClip[scene.id]}
              class="flex-shrink-0 w-[50px] h-[33px] mt-2 !mr-1 border rounded bg-gray-50 hover:bg-gray-100 flex items-center justify-center relative hover:ring-2 hover:ring-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow cursor-pointer p-0"
              title="Add new clip">
              <Plus class="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
      {/each}

      <!-- Add New Scene Button -->
      <button
        type="button"
        onclick={createNewScene}
        disabled={isCreatingScene}
        class="border rounded-md p-4 mt-4 hover:shadow-md transition-shadow w-30 flex-shrink-0 flex flex-col items-center justify-center h-[80px] bg-gray-50 hover:bg-gray-100 cursor-pointer">
        <div class="flex flex-col items-center justify-center h-full">
          <div class="rounded-full bg-gray-200 p-1.5 mb-2">
            <Plus class="h-5 w-5 text-gray-600" />
          </div>
          <span class="text-gray-600 font-medium">{isCreatingScene ? 'Creating...' : 'New Scene'}</span>
        </div>
      </button>
    {/if}
  </div>
</div>
