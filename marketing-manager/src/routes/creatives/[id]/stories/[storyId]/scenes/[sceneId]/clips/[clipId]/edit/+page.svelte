<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { AlertCircle } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import ClipForm from '$lib/components/story/ClipForm.svelte';
  import type { Clip } from '$lib/types/story.types';

  // State
  let creativeId = $state<number | null>(null);
  let storyId = $state<number | null>(null);
  let sceneId = $state<number | null>(null);
  let clipId = $state<number | null>(null);
  let clip = $state<Clip | null>(null);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  // Fetch clip data
  $effect(() => {
    const cId = $page.params.id;
    const sId = $page.params.storyId;
    const scId = $page.params.sceneId;
    const clId = $page.params.clipId;
    
    if (!cId || isNaN(parseInt(cId)) || !sId || isNaN(parseInt(sId)) || 
        !scId || isNaN(parseInt(scId)) || !clId || isNaN(parseInt(clId))) {
      error = 'Invalid ID parameters';
      isLoading = false;
      return;
    }

    creativeId = parseInt(cId);
    storyId = parseInt(sId);
    sceneId = parseInt(scId);
    clipId = parseInt(clId);
    fetchClip(clipId);
  });

  async function fetchClip(id: number) {
    isLoading = true;
    error = null;

    try {
      const response = await fetch(`/api/clips/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch clip. Status: ${response.status}`);
      }
      clip = await response.json();
    } catch (e: any) {
      console.error('Error fetching clip:', e);
      error = e.message || 'Failed to load clip';
    } finally {
      isLoading = false;
    }
  }

  // Handle form submission
  async function handleSubmit(clipData: Partial<Clip>) {
    try {
      const response = await fetch(`/api/clips/${clipId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(clipData)
      });

      if (!response.ok) {
        throw new Error(`Failed to update clip. Status: ${response.status}`);
      }

      goto(`/creatives/${creativeId}/stories/${storyId}/scenes/${sceneId}/clips/${clipId}`);
    } catch (e: any) {
      console.error('Error updating clip:', e);
      alert(`Failed to update clip: ${e.message}`);
    }
  }

  // Handle cancel
  function handleCancel() {
    goto(`/creatives/${creativeId}/stories/${storyId}/scenes/${sceneId}/clips/${clipId}`);
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
      <Button href={`/creatives/${creativeId}/stories/${storyId}/scenes/${sceneId}/clips/${clipId}`} variant="outline">Go Back</Button>
    </div>
  {:else if clip}
    <div class="rounded border p-6 shadow">
      <ClipForm 
        {clip}
        sceneId={sceneId || 0}
        isEditing={true}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  {/if}
</div>
