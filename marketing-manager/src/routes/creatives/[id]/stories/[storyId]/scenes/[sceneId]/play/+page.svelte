<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { Button } from '$lib/components/ui/button';
  import { ArrowLeft } from 'lucide-svelte';
  import ScenePlayer from '$lib/components/story/ScenePlayer.svelte';
  import type { SceneWithRelations } from '$lib/types/story.types';

  // State
  let creativeId = $state<number | null>(null);
  let storyId = $state<number | null>(null);
  let sceneId = $state<number | null>(null);
  let scene = $state<SceneWithRelations | null>(null);
  let story = $state<any>(null);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let narrationVolume = $state(1.0);
  let bgmVolume = $state(0.5);
  let narrationSpeed = $state(1.0);

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

    // Fetch both story and scene data
    fetchStory(storyId);
    fetchScene(sceneId);
  });

  async function fetchStory(id: number) {
    try {
      const response = await fetch(`/api/stories/${id}`);
      if (!response.ok) {
        console.error(`Failed to fetch story. Status: ${response.status}`);
        return;
      }

      const responseData = await response.json();

      // Handle the response format
      if (responseData.success && responseData.data) {
        story = responseData.data;
      } else if (responseData.id) {
        story = responseData;
      }

      // Update audio settings from story data
      if (story) {
        narrationVolume = story.narrationVolume ?? 1.0;
        bgmVolume = story.bgmVolume ?? 0.5;
        narrationSpeed = story.narrationSpeed ?? 1.0;
      }
    } catch (e: any) {
      console.error('Error fetching story:', e);
    }
  };

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

  function handleBack() {
    if (creativeId && storyId && sceneId) {
      goto(`/creatives/${creativeId}/stories/${storyId}/scenes/${sceneId}`);
    }
  }
</script>

<div class="container mx-auto max-w-4xl py-8">
  <div class="mb-6">
    <Button onclick={handleBack} variant="outline">
      <ArrowLeft class="mr-2 h-4 w-4" />
      Back to Scene
    </Button>
  </div>

  {#if isLoading}
    <div class="flex justify-center p-12">
      <p>Loading scene...</p>
    </div>
  {:else if error}
    <div class="flex flex-col items-center justify-center rounded border border-dashed border-red-500 bg-red-50 p-12 text-center text-red-700">
      <h3 class="text-xl font-semibold">Error Loading Scene</h3>
      <p class="mb-4 text-sm">{error}</p>
      <Button onclick={handleBack} variant="outline">Go Back</Button>
    </div>
  {:else if scene}
    <div class="space-y-6">
      <div class="rounded border p-6 shadow">
        <h1 class="text-3xl font-bold mb-6 text-center">Scene {scene.orderIndex + 1}</h1>

        {#if scene.clips && scene.clips.length > 0}
          <ScenePlayer
            clips={scene.clips}
            bgmUrl={scene.bgmUrl || ''}
            bgmName={scene.bgmName || ''}
            autoPlay={true}
            narrationVolume={narrationVolume}
            bgmVolume={bgmVolume}
            narrationSpeed={narrationSpeed}
          />
        {:else}
          <div class="text-center py-8 border border-dashed rounded-md">
            <p class="text-muted-foreground mb-4">No clips found in this scene.</p>
            <Button onclick={handleBack} variant="outline">Go Back</Button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
