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
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  // Get IDs from URL
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
    isLoading = false;
  });

  // Handle form submission
  async function handleSubmit(sceneData: Partial<Scene>) {
    try {
      const response = await fetch('/api/scenes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sceneData)
      });

      if (!response.ok) {
        throw new Error(`Failed to create scene. Status: ${response.status}`);
      }

      const newScene = await response.json();
      goto(`/creatives/${creativeId}/stories/${storyId}/scenes/${newScene.id}`);
    } catch (e: any) {
      console.error('Error creating scene:', e);
      alert(`Failed to create scene: ${e.message}`);
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
  {:else}
    <div class="rounded border p-6 shadow">
      <SceneForm 
        storyId={storyId || 0}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  {/if}
</div>
