<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Edit, Trash2, Play, Plus, Music, Image as ImageIcon } from 'lucide-svelte';
  import type { SceneWithRelations, Clip } from '$lib/types/story.types';
  import CanvasPreview from '$lib/components/story/CanvasPreview.svelte';

  // Props
  let {
    scenes,
    creativeId,
    storyId,
    onAddScene,
    onEditScene,
    onDeleteScene,
    onSelectScene,
    onPlayScene,
    onSelectClip 
  } = $props<{
    scenes: SceneWithRelations[];
    creativeId: number;
    storyId: number;
    onAddScene: () => void;
    onEditScene: (sceneId: number) => void;
    onDeleteScene: (sceneId: number) => void;
    onSelectScene: (sceneId: number) => void;
    onPlayScene?: (sceneId: number) => void;
    onSelectClip: (clip: Clip) => void; 
  }>();
</script>

<div class="space-y-4">
  {#if scenes.length > 0}
    <div class="flex space-x-4 overflow-x-auto pb-4">
      {#each scenes as scene, index (scene.id)}
        <div class="border rounded-md p-4 hover:shadow-md transition-shadow w-80 flex-shrink-0">
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
          {#if scene.clips && scene.clips.length > 0}
            <div class="mt-2 flex space-x-1 overflow-x-auto pb-1">
              {#each scene.clips as clip (clip.id)}
                <button
                   type="button"
                   onclick={() => onSelectClip(clip)}
                   class="flex-shrink-0 w-[50px] h-[33px] border rounded overflow-hidden bg-gray-100 flex items-center justify-center relative hover:ring-2 hover:ring-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow cursor-pointer p-0"
                   title="Select Clip {clip.orderIndex}">
                  {#if clip.imageUrl}
                    <img
                      src={clip.imageUrl}
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
              {/each}
              {#if scene.clips.length > 7}
                <div class="flex-shrink-0 w-[50px] h-[33px] border rounded bg-gray-100 flex items-center justify-center text-xs text-muted-foreground" title="{scene.clips.length - 7} more clips">
                  + {scene.clips.length - 7}
                </div>
              {/if}
            </div>
          {:else}
             <div class="mt-2 text-sm text-muted-foreground">No clips in this scene.</div>
          {/if}

          <div class="mt-3 flex justify-between items-center">
            <div class="text-sm text-muted-foreground">
              Order: {scene.orderIndex || 0}
            </div>
            <div class="flex gap-2">
              <a href="/creatives/{creativeId}/stories/{storyId}/scenes/{scene.id}/clips/new"
                 class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 py-1 px-3">
                 <Plus class="h-3 w-3 mr-1" />
                Add Clip
              </a>
              <Button variant="outline" class="h-8 py-1 px-3 text-xs" onclick={() => onSelectScene(scene.id)}>
                View Clips
              </Button>
            </div>
          </div>
        </div>
      {/each}

      <!-- Add New Scene Button -->
      <button
        type="button"
        onclick={onAddScene}
        class="border rounded-md p-4 hover:shadow-md transition-shadow w-40 flex-shrink-0 flex flex-col items-center justify-center h-[100px] bg-gray-50 hover:bg-gray-100 cursor-pointer">
        <div class="flex flex-col items-center justify-center h-full">
          <div class="rounded-full bg-gray-200 p-3 mb-2">
            <Plus class="h-6 w-6 text-gray-600" />
          </div>
          <span class="text-gray-600 font-medium">New Scene</span>
        </div>
      </button>
    </div>
  {/if}
</div>
