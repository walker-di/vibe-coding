<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { Button } from '$lib/components/ui/button';
  import { ArrowLeft, Plus } from 'lucide-svelte';
  import StoryList from '$lib/components/story/StoryList.svelte';
  import type { StoryWithRelations } from '$lib/types/story.types';

  // State
  let productId = $state<number | null>(null);
  let personaId = $state<number | null>(null);
  let creativeId = $state<number | null>(null);
  let creativeName = $state<string | null>(null);
  let stories = $state<StoryWithRelations[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  // Fetch creative and stories data
  $effect(() => {
    const pId = $page.params.productId;
    const persId = $page.params.personaId;
    const cId = $page.params.creativeId;

    if (!pId || isNaN(parseInt(pId)) || 
        !persId || isNaN(parseInt(persId)) || 
        !cId || isNaN(parseInt(cId))) {
      error = 'Invalid ID parameters';
      isLoading = false;
      return;
    }

    productId = parseInt(pId);
    personaId = parseInt(persId);
    creativeId = parseInt(cId);
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
      
      // Validate that the creative belongs to the correct persona
      if (data.personaId !== personaId) {
        throw new Error('This creative does not belong to the specified persona.');
      }
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
    if (!productId || !personaId || !creativeId) return;
    goto(`/products/${productId}/personas/${personaId}/creatives/${creativeId}/stories/new`);
  }

  function handleEditStory(storyId: number) {
    if (!productId || !personaId || !creativeId) return;
    goto(`/products/${productId}/personas/${personaId}/creatives/${creativeId}/stories/${storyId}/edit`);
  }

  async function handleDeleteStory(storyId: number) {
    if (!storyId) return;
    
    if (!confirm('Are you sure you want to delete this story?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/stories/${storyId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete story. Status: ${response.status}`);
      }
      
      // Remove story from local state
      stories = stories.filter(s => s.id !== storyId);
    } catch (e: any) {
      console.error('Error deleting story:', e);
      // Optionally show an error message
    }
  }

  function handleSelectStory(storyId: number) {
    if (!productId || !personaId || !creativeId) return;
    goto(`/products/${productId}/personas/${personaId}/creatives/${creativeId}/stories/${storyId}`);
  }

  // Computed values
  $: backLink = productId && personaId && creativeId 
    ? `/products/${productId}/personas/${personaId}/creatives/${creativeId}`
    : '/';
</script>

<div class="container mx-auto max-w-4xl py-8">
  <div class="mb-6 flex items-center justify-between">
    <Button href={backLink}>
      <ArrowLeft class="mr-2 h-4 w-4" />
      Back to Creative
    </Button>
    
    <h1 class="text-2xl font-bold">
      {creativeName ? `Stories for ${creativeName}` : 'Stories'}
    </h1>
    
    <Button onclick={handleAddStory}>
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
      <Button href={backLink}>Go Back</Button>
    </div>
  {:else}
    <div class="rounded border p-6 shadow">
      <StoryList 
        stories={stories}
        creativeId={creativeId || 0}
        onAddStory={handleAddStory}
        onEditStory={handleEditStory}
        onDeleteStory={handleDeleteStory}
        onSelectStory={handleSelectStory}
      />
    </div>
  {/if}
</div>
