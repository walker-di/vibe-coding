<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import ScenePlayer from '$lib/components/story/ScenePlayer.svelte';
  import type { Clip } from '$lib/types/story.types';

  let sceneId = $state<number | null>(null);
  let scene = $state<any | null>(null);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let sceneIdInput = $state('');
  let debugMode = $state(true);

  async function fetchScene() {
    if (!sceneIdInput || isNaN(parseInt(sceneIdInput))) {
      error = 'Please enter a valid scene ID';
      return;
    }

    const id = parseInt(sceneIdInput);
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
      
      sceneId = id;
      console.log('Fetched scene:', scene);
    } catch (e: any) {
      console.error('Error fetching scene:', e);
      error = e.message || 'Failed to load scene';
    } finally {
      isLoading = false;
    }
  }

  function toggleDebugMode() {
    debugMode = !debugMode;
  }
</script>

<svelte:head>
  <title>Scene Player Test</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-8">
  <h1 class="text-3xl font-bold mb-6">Scene Player Test</h1>
  
  <div class="space-y-6">
    <div class="rounded border p-6 shadow">
      <div class="space-y-4">
        <div>
          <Label for="sceneId">Scene ID</Label>
          <div class="flex gap-2">
            <Input id="sceneId" bind:value={sceneIdInput} placeholder="Enter scene ID" />
            <Button onclick={fetchScene} disabled={isLoading}>Fetch Scene</Button>
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <Button onclick={toggleDebugMode} variant={debugMode ? "default" : "outline"}>
            {debugMode ? "Debug Mode: ON" : "Debug Mode: OFF"}
          </Button>
        </div>
        
        {#if error}
          <div class="p-3 bg-red-50 border border-red-200 rounded text-red-600">
            {error}
          </div>
        {/if}
      </div>
    </div>
    
    {#if isLoading}
      <div class="flex justify-center p-12">
        <p>Loading scene...</p>
      </div>
    {:else if scene}
      <div class="rounded border p-6 shadow">
        <h2 class="text-xl font-semibold mb-4">Scene {scene.orderIndex + 1}</h2>
        
        {#if scene.clips && scene.clips.length > 0}
          <ScenePlayer 
            clips={scene.clips} 
            bgmUrl={scene.bgmUrl || ''} 
            bgmName={scene.bgmName || ''}
            autoPlay={false}
            debug={debugMode}
          />
        {:else}
          <div class="text-center py-8 border border-dashed rounded-md">
            <p class="text-muted-foreground mb-4">No clips found in this scene.</p>
          </div>
        {/if}
      </div>
      
      <div class="rounded border p-6 shadow">
        <h2 class="text-xl font-semibold mb-4">Scene Data</h2>
        <pre class="bg-gray-100 p-4 rounded overflow-auto text-xs">{JSON.stringify(scene, null, 2)}</pre>
      </div>
    {/if}
  </div>
</div>
