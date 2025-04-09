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
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  // Get IDs from URL
  $effect(() => {
    const cId = $page.params.id;
    const sId = $page.params.storyId;
    const scId = $page.params.sceneId;
    
    if (!cId || isNaN(parseInt(cId)) || !sId || isNaN(parseInt(sId)) || !scId || isNaN(parseInt(scId))) {
      error = 'Invalid ID parameters';
      isLoading = false;
      return;
    }

    creativeId = parseInt(cId);
    storyId = parseInt(sId);
    sceneId = parseInt(scId);
    isLoading = false;
  });

  // Handle form submission (Step 1: Create Clip)
  async function handleSubmit(clipData: Partial<Clip>): Promise<Clip | null> { // Return the created clip or null
    try {
      const response = await fetch('/api/clips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(clipData)
      });

      if (!response.ok) {
        throw new Error(`Failed to create clip. Status: ${response.status}`);
      }

      const newClip: Clip = await response.json();
      // Don't navigate yet, return the new clip data
      return newClip; 
    } catch (e: any) {
      console.error('Error creating clip:', e);
      alert(`Failed to create clip: ${e.message}`);
      return null; // Return null on error
    }
  }

  // Handle Image URL Update (Step 2: Update with Image URL)
  async function handleImageUrlUpdate(clipId: number, imageUrl: string) {
    try {
      const response = await fetch(`/api/clips/${clipId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: imageUrl }) // Only send imageUrl
      });

      if (!response.ok) {
        throw new Error(`Failed to update clip with image URL. Status: ${response.status}`);
      }
      
      // Now navigate after successful update
      goto(`/creatives/${creativeId}/stories/${storyId}/scenes/${sceneId}/clips/${clipId}`);

    } catch (e: any) {
      console.error('Error updating clip with image URL:', e);
      alert(`Failed to update clip image: ${e.message}`);
      // Optional: Navigate even if image update fails? Or stay on page?
      // For now, stay on page on error.
    }
  }

  // Handle cancel
  function handleCancel() {
    goto(`/creatives/${creativeId}/stories/${storyId}/scenes/${sceneId}`);
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
      <Button href={`/creatives/${creativeId}/stories/${storyId}/scenes/${sceneId}`} variant="outline">Go Back</Button>
    </div>
  {:else}
    <div class="rounded border p-6 shadow">
      <ClipForm 
        sceneId={sceneId || 0}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        onImageUrlUpdate={handleImageUrlUpdate}
      />
    </div>
  {/if}
</div>
