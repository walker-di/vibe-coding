<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { AlertCircle } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import StoryForm from '$lib/components/story/StoryForm.svelte';
  import type { Story } from '$lib/types/story.types';

  // State
  let creativeId = $state<number | null>(null);
  let storyId = $state<number | null>(null);
  let story = $state<Story | null>(null);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  // Fetch story data
  $effect(() => {
    const cId = $page.params.id;
    const sId = $page.params.storyId;

    if (!cId || isNaN(parseInt(cId)) || !sId || isNaN(parseInt(sId))) {
      error = 'Invalid ID parameters';
      isLoading = false;
      return;
    }

    creativeId = parseInt(cId);
    storyId = parseInt(sId);
    fetchStory(storyId);
  });

  async function fetchStory(id: number) {
    isLoading = true;
    error = null;

    try {
      const response = await fetch(`/api/stories/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch story. Status: ${response.status}`);
      }
      const responseData = await response.json();

      // Handle the new response format with success, data, and message fields
      if (responseData.success && responseData.data) {
        story = responseData.data;
      } else if (responseData.id) {
        // Handle the old format for backward compatibility
        story = responseData;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (e: any) {
      console.error('Error fetching story:', e);
      error = e.message || 'Failed to load story';
    } finally {
      isLoading = false;
    }
  }

  // Handle form submission
  async function handleSubmit(storyData: Partial<Story>) {
    try {
      const response = await fetch(`/api/stories/${storyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(storyData)
      });

      if (!response.ok) {
        throw new Error(`Failed to update story. Status: ${response.status}`);
      }

      goto(`/creatives/${creativeId}/stories/${storyId}`);
    } catch (e: any) {
      console.error('Error updating story:', e);
      alert(`Failed to update story: ${e.message}`);
    }
  }

  // Handle cancel
  function handleCancel() {
    goto(`/creatives/${creativeId}/stories/${storyId}`);
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
      <Button href={`/creatives/${creativeId}/stories/${storyId}`} variant="outline">Go Back</Button>
    </div>
  {:else if story}
    <div class="rounded border p-6 shadow">
      <StoryForm
        {story}
        creativeId={creativeId || 0}
        isEditing={true}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  {/if}
</div>
