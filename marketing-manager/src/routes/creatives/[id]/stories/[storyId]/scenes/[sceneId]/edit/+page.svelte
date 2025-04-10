<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { AlertCircle } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import SceneForm from '$lib/components/story/SceneForm.svelte';
  import type { Scene } from '$lib/types/story.types';

  // State
  let creativeId = $state<number | null>(null);
  let storyId = $state<number | null>(null);
  let sceneId = $state<number | null>(null);
  let scene = $state<Scene | null>(null);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  // Fetch scene data
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
    fetchScene(sceneId);
  });

  async function fetchScene(id: number) {
    isLoading = true;
    error = null;

    try {
      const response = await fetch(`/api/scenes/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch scene. Status: ${response.status}`);
      }
      const responseData = await response.json();

      // Handle the new response format with success, data, and message fields
      if (responseData.success && responseData.data) {
        scene = responseData.data;
      } else if (responseData.id) {
        // Handle the old format for backward compatibility
        scene = responseData;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (e: any) {
      console.error('Error fetching scene:', e);
      error = e.message || 'Failed to load scene';
    } finally {
      isLoading = false;
    }
  }

  // Handle form submission
  async function handleSubmit(sceneData: Partial<Scene>) {
    try {
      const response = await fetch(`/api/scenes/${sceneId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sceneData)
      });

      if (!response.ok) {
        throw new Error(`Failed to update scene. Status: ${response.status}`);
      }

      goto(`/creatives/${creativeId}/stories/${storyId}/scenes/${sceneId}`);
    } catch (e: any) {
      console.error('Error updating scene:', e);
      alert(`Failed to update scene: ${e.message}`);
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
  {:else if scene}
    <div class="rounded border p-6 shadow">
      <SceneForm
        {scene}
        storyId={storyId || 0}
        isEditing={true}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  {/if}
</div>
