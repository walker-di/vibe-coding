<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Edit, Trash2, Eye, Plus, FileText } from 'lucide-svelte';
  import type { Clip } from '$lib/types/story.types';

  // Props
  let { 
    clips, 
    sceneId,
    onAddClip,
    onEditClip,
    onDeleteClip,
    onViewClip
  } = $props<{
    clips: Clip[];
    sceneId: number;
    onAddClip: () => void;
    onEditClip: (clipId: number) => void;
    onDeleteClip: (clipId: number) => void;
    onViewClip: (clipId: number) => void;
  }>();
</script>

<div class="space-y-4">
  {#if clips.length > 0}
    <div class="space-y-4">
      {#each clips as clip, index (clip.id)}
        <div class="border rounded-md p-4 hover:shadow-md transition-shadow">
          <div class="flex justify-between items-start mb-2">
            <div class="flex-1">
              <h3 class="text-lg font-semibold hover:text-blue-600 cursor-pointer" 
                  onclick={() => onViewClip(clip.id)}>
                Clip {index + 1}
              </h3>
              <div class="flex items-center text-sm text-muted-foreground">
                {#if clip.narration}
                  <FileText class="h-3 w-3 mr-1" />
                  <span>Has narration</span>
                {/if}
              </div>
            </div>
            <div class="flex gap-1">
              <Button variant="ghost" class="h-8 w-8 p-0" onclick={() => onViewClip(clip.id)} title="View Clip">
                <Eye class="h-4 w-4" />
              </Button>
              <Button variant="ghost" class="h-8 w-8 p-0" onclick={() => onEditClip(clip.id)} title="Edit Clip">
                <Edit class="h-4 w-4" />
              </Button>
              <Button variant="ghost" class="h-8 w-8 p-0" onclick={() => onDeleteClip(clip.id)} title="Delete Clip">
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div class="mt-3 flex justify-between items-center">
            <div class="text-sm text-muted-foreground">
              Order: {clip.orderIndex || 0}
            </div>
            <Button variant="outline" class="h-8 py-1 px-3 text-xs" onclick={() => onViewClip(clip.id)}>
              View Clip
            </Button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
  
  <div class="mt-4">
    <Button variant="outline" onclick={onAddClip} class="w-full">
      <Plus class="h-4 w-4 mr-2" />
      Add New Clip
    </Button>
  </div>
</div>
