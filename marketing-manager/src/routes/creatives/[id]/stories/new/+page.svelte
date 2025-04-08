<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { AlertCircle } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import StoryForm from '$lib/components/story/StoryForm.svelte';
  import type { Story } from '$lib/types/story.types';

  // State
  let creativeId = $state<number | null>(null);
  let creativeName = $state<string | null>(null);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  // Fetch creative data
  $effect(() => {
    const id = $page.params.id;
    if (!id || isNaN(parseInt(id))) {
      error = 'Invalid Creative ID';
      isLoading = false;
      return;
    }

    creativeId = parseInt(id);
    fetchCreative(creativeId);
  });

  async function fetchCreative(id: number) {
    isLoading = true;
    error = null;

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
    } finally {
      isLoading = false;
    }
  }

  // Handle form submission
  async function handleSubmit(storyData: Partial<Story>) {
    try {
      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(storyData)
      });

      if (!response.ok) {
        throw new Error(`Failed to create story. Status: ${response.status}`);
      }

      const newStory = await response.json();
      goto(`/creatives/${creativeId}/stories/${newStory.id}`);
    } catch (e: any) {
      console.error('Error creating story:', e);
      alert(`Failed to create story: ${e.message}`);
    }
  }

  // Handle cancel
  function handleCancel() {
    goto(`/creatives/${creativeId}/stories`);
  }
</script>

<div class="container mx-auto max-w-4xl py-8">
  {#if isLoading}
    <div class="flex justify-center p-12">
      <p>Loading...</p>
    </div>
  {:else if error}
    <div class="flex flex-col items-center justify-center rounded border border-dashed border-red-500 bg-red-50 p-12 text-center text-red-700">
      <AlertCircle class="mb-2 h-8 w-8" />
      <h3 class="text-xl font-semibold">Error</h3>
      <p class="mb-4 text-sm">{error}</p>
      <Button href={`/creatives/${creativeId}/stories`} variant="outline">Go Back</Button>
    </div>
  {:else}
    <div class="rounded border p-6 shadow">
      <StoryForm 
        creativeId={creativeId || 0}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  {/if}
</div>
