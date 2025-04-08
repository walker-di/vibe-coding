<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Edit, Trash2, Play, Plus, Music } from 'lucide-svelte';
  import type { SceneWithRelations } from '$lib/types/story.types';

  // Props
  let { 
    scenes, 
    storyId,
    onAddScene,
    onEditScene,
    onDeleteScene,
    onSelectScene,
    onPlayScene
  } = $props<{
    scenes: SceneWithRelations[];
    storyId: number;
    onAddScene: () => void;
    onEditScene: (sceneId: number) => void;
    onDeleteScene: (sceneId: number) => void;
    onSelectScene: (sceneId: number) => void;
    onPlayScene?: (sceneId: number) => void;
  }>();
</script>

<div class="space-y-4">
  {#if scenes.length > 0}
    <div class="space-y-4">
      {#each scenes as scene, index (scene.id)}
        <div class="border rounded-md p-4 hover:shadow-md transition-shadow">
          <div class="flex justify-between items-start mb-2">
            <div class="flex-1">
              <h3 class="text-lg font-semibold hover:text-blue-600 cursor-pointer" 
                  onclick={() => onSelectScene(scene.id)}>
                Scene {index + 1}
              </h3>
              <div class="flex items-center text-sm text-muted-foreground">
                {#if scene.bgmName}
                  <Music class="h-3 w-3 mr-1" />
                  <span class="mr-3">{scene.bgmName}</span>
                {/if}
                <span>{scene.clips?.length || 0} clips</span>
              </div>
            </div>
            <div class="flex gap-1">
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
          
          <div class="mt-3 flex justify-between items-center">
            <div class="text-sm text-muted-foreground">
              Order: {scene.orderIndex || 0}
            </div>
            <Button variant="outline" class="h-8 py-1 px-3 text-xs" onclick={() => onSelectScene(scene.id)}>
              View Clips
            </Button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
  
  <div class="mt-4">
    <Button variant="outline" onclick={onAddScene} class="w-full">
      <Plus class="h-4 w-4 mr-2" />
      Add New Scene
    </Button>
  </div>
</div>
