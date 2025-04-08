<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { Button } from '$lib/components/ui/button';
  import { ArrowLeft, Plus } from 'lucide-svelte';
  import StoryList from '$lib/components/story/StoryList.svelte';
  import type { StoryWithRelations } from '$lib/types/story.types';

  // State
  let creativeId = $state<number | null>(null);
  let creativeName = $state<string | null>(null);
  let stories = $state<StoryWithRelations[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  // Fetch creative and stories data
  $effect(() => {
    const id = $page.params.id;
    if (!id || isNaN(parseInt(id))) {
      error = 'Invalid Creative ID';
      isLoading = false;
      return;
    }

    creativeId = parseInt(id);
    fetchCreative(creativeId);
    fetchStories(creativeId);
  });

  async function fetchCreative(id: number) {
    try {
      const response = await fetch(`/api/creatives/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch creative. Status: ${response.status}`);
      }
      const data = await response.json();
      creativeName = data.name;
    } catch (e: any) {
      console.error('Error fetching creative:', e);
      error = e.message || 'Failed to load creative';
    }
  }

  async function fetchStories(creativeId: number) {
    isLoading = true;
    error = null;

    try {
      const response = await fetch(`/api/creatives/${creativeId}/stories`);
      if (!response.ok) {
        throw new Error(`Failed to fetch stories. Status: ${response.status}`);
      }
      stories = await response.json();
    } catch (e: any) {
      console.error('Error fetching stories:', e);
      error = e.message || 'Failed to load stories';
    } finally {
      isLoading = false;
    }
  }

  // Story management functions
  function handleAddStory() {
    if (creativeId) {
      goto(`/creatives/${creativeId}/stories/new`);
    }
  }

  function handleEditStory(storyId: number) {
    if (creativeId) {
      goto(`/creatives/${creativeId}/stories/${storyId}/edit`);
    }
  }

  async function handleDeleteStory(storyId: number) {
    if (!confirm('Are you sure you want to delete this story? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/stories/${storyId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete story. Status: ${response.status}`);
      }

      // Refresh stories list
      if (creativeId) {
        fetchStories(creativeId);
      }
    } catch (e: any) {
      console.error('Error deleting story:', e);
      alert(`Failed to delete story: ${e.message}`);
    }
  }

  function handleSelectStory(storyId: number) {
    if (creativeId) {
      goto(`/creatives/${creativeId}/stories/${storyId}`);
    }
  }
</script>

<div class="container mx-auto max-w-4xl py-8">
  <div class="mb-6 flex justify-between items-center">
    <div>
      <Button href={`/creatives/${creativeId}`} variant="outline" class="mb-2">
        <ArrowLeft class="mr-2 h-4 w-4" />
        Back to Creative
      </Button>
      <h1 class="text-3xl font-bold">{creativeName || 'Creative'} - Stories</h1>
    </div>
    
    <Button onclick={handleAddStory} variant="default">
      <Plus class="mr-2 h-4 w-4" />
      Add Story
    </Button>
  </div>

  {#if isLoading}
    <div class="flex justify-center p-12">
      <p>Loading stories...</p>
    </div>
  {:else if error}
    <div class="flex flex-col items-center justify-center rounded border border-dashed border-red-500 bg-red-50 p-12 text-center text-red-700">
      <h3 class="text-xl font-semibold">Error Loading Stories</h3>
      <p class="mb-4 text-sm">{error}</p>
      <Button href={`/creatives/${creativeId}`} variant="outline">Go Back</Button>
    </div>
  {:else}
    <div class="rounded border p-6 shadow">
      <StoryList 
        {stories}
        creativeId={creativeId || 0}
        onAddStory={handleAddStory}
        onEditStory={handleEditStory}
        onDeleteStory={handleDeleteStory}
        onSelectStory={handleSelectStory}
      />
    </div>
  {/if}
</div>
