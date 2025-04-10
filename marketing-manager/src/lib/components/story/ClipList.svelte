<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Edit, Trash2, Eye, Plus, FileText, Image as ImageIcon } from 'lucide-svelte'; // Added ImageIcon
  import type { Clip } from '$lib/types/story.types';
  import CanvasPreview from '$lib/components/story/CanvasPreview.svelte'; // Import CanvasPreview

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

  // Function to sort clips by orderIndex
  function getSortedClips(clipsArray: Clip[]): Clip[] {
    console.log('Original clips:', JSON.stringify(clipsArray));
    if (!clipsArray || clipsArray.length === 0) return [];

    // Create a copy of the array to avoid modifying the original
    const sortedClips = [...clipsArray];

    // Sort directly by orderIndex
    sortedClips.sort((a, b) => {
      // Ensure we're working with numbers, default to 0 if undefined
      const aIndex = a.orderIndex !== undefined && a.orderIndex !== null ? Number(a.orderIndex) : 0;
      const bIndex = b.orderIndex !== undefined && b.orderIndex !== null ? Number(b.orderIndex) : 0;

      // First compare by orderIndex
      if (aIndex < bIndex) return -1;
      if (aIndex > bIndex) return 1;

      // If orderIndex is the same, use ID as tiebreaker
      return a.id - b.id;
    });

    console.log('Sorted clips:', JSON.stringify(sortedClips));
    return sortedClips;
  }
</script>

<div class="space-y-4">

  {#if clips && clips.length > 0}
    <div class="space-y-4">
      {#each getSortedClips(clips) as clip (clip.id)}
        <div class="border rounded-md p-4 hover:shadow-md transition-shadow flex gap-4 items-start">
          <!-- Thumbnail Column -->
          <div class="flex-shrink-0 w-[100px] h-[67px] border rounded overflow-hidden bg-gray-100 flex items-center justify-center relative">
            {#if clip.imageUrl}
              <img
                src={`${clip.imageUrl}?t=${Date.now()}`}
                alt="Clip {(clip.orderIndex !== undefined && clip.orderIndex !== null ? Number(clip.orderIndex) : 0) + 1} preview"
                class="object-cover w-full h-full"
                loading="lazy"
              />
            {:else if clip.canvas}
              <CanvasPreview canvasData={clip.canvas} width={100} height={67} />
            {:else}
              <ImageIcon class="h-6 w-6 text-gray-400" />
            {/if}
          </div>

          <!-- Details Column -->
          <div class="flex-1">
            <div class="flex justify-between items-start mb-1">
              <button
                class="text-lg font-semibold hover:text-blue-600 cursor-pointer text-left bg-transparent border-none p-0"
                onclick={() => onViewClip(clip.id)}
                onkeydown={(e) => e.key === 'Enter' && onViewClip(clip.id)}
              >
                Clip {(clip.orderIndex !== undefined && clip.orderIndex !== null ? Number(clip.orderIndex) : 0) + 1}
              </button>
              <div class="flex items-center text-sm text-muted-foreground">
                {#if clip.narration}
                  <FileText class="h-3 w-3 mr-1" />
                  <span>Has narration</span>
                {/if}
                {#if clip.canvas}
                  <span class="ml-2 inline-flex items-center">
                    <ImageIcon class="h-3 w-3 mr-1" />
                    <span>Has canvas</span>
                  </span>
                {/if}
              </div>
            </div>
            <div class="flex gap-1 flex-shrink-0">
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

          <div class="mt-2 text-sm text-muted-foreground">
            Order: {clip.orderIndex !== undefined && clip.orderIndex !== null ? clip.orderIndex : 0} | ID: {clip.id}
          </div>
          <!-- Removed redundant View Clip button -->
          <!-- <Button variant="outline" class="h-8 py-1 px-3 text-xs" onclick={() => onViewClip(clip.id)}>
            View Clip
          </Button> -->
        </div> <!-- This closes the "Details Column" div -->
        <!-- Removed extra closing div here -->
      {/each}
    </div>
  {/if}

  <div class="!m-10">
    <Button variant="outline" onclick={onAddClip} class="w-full">
      <Plus class="h-4 w-4 mr-2" />
      Add New Clip
    </Button>
  </div>
</div>
