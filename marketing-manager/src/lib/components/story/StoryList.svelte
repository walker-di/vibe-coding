<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Edit, Trash2, BookOpen, Plus } from 'lucide-svelte';
  import type { StoryWithRelations } from '$lib/types/story.types';

  // Props
  let { 
    stories, 
    creativeId,
    onAddStory,
    onEditStory,
    onDeleteStory,
    onSelectStory
  } = $props<{
    stories: StoryWithRelations[];
    creativeId: number;
    onAddStory: () => void;
    onEditStory: (storyId: number) => void;
    onDeleteStory: (storyId: number) => void;
    onSelectStory: (storyId: number) => void;
  }>();
</script>

<div class="space-y-4">
  {#if stories.length > 0}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      {#each stories as story (story.id)}
        <div class="border rounded-md p-4 hover:shadow-md transition-shadow">
          <div class="flex justify-between items-start mb-2">
            <div class="flex-1">
              <h3 class="text-lg font-semibold hover:text-blue-600 cursor-pointer" 
                  onclick={() => onSelectStory(story.id)}>
                {story.title}
              </h3>
              {#if story.description}
                <p class="text-sm text-muted-foreground line-clamp-2">{story.description}</p>
              {/if}
            </div>
            <div class="flex gap-1">
              <Button variant="ghost" onclick={() => onEditStory(story.id)} title="Edit Story" class="h-8 w-8 p-0">
                <Edit class="h-4 w-4" />
              </Button>
              <Button variant="ghost" onclick={() => onDeleteStory(story.id)} title="Delete Story" class="h-8 w-8 p-0">
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div class="mt-3 flex justify-between items-center">
            <div class="text-sm text-muted-foreground">
              {story.scenes?.length || 0} scenes
            </div>
            <Button variant="outline" class="h-8 py-1 px-3 text-xs" onclick={() => onSelectStory(story.id)}>
              <BookOpen class="h-4 w-4 mr-1" />
              View Story
            </Button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
  
  <div class="mt-4">
    <Button variant="outline" onclick={onAddStory} class="w-full">
      <Plus class="h-4 w-4 mr-2" />
      Add New Story
    </Button>
  </div>
</div>
