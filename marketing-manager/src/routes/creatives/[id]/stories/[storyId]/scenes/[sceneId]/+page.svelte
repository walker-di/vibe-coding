<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { Button } from '$lib/components/ui/button';
  import { ArrowLeft, Edit, Trash2, Plus, Music, Play, FileText } from 'lucide-svelte';
  import ClipList from '$lib/components/story/ClipList.svelte';
  import type { SceneWithRelations } from '$lib/types/story.types';

  // State
  let creativeId = $state<number | null>(null);
  let storyId = $state<number | null>(null);
  let sceneId = $state<number | null>(null);
  let scene = $state<SceneWithRelations | null>(null);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let isDeleting = $state(false);

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

  // Scene management functions
  function handleEditScene() {
    if (creativeId && storyId && sceneId) {
      goto(`/creatives/${creativeId}/stories/${storyId}/scenes/${sceneId}/edit`);
    }
  }

  async function handleDeleteScene() {
    if (!sceneId || isDeleting) return;

    if (!confirm('Are you sure you want to delete this scene? This action cannot be undone.')) {
      return;
    }

    isDeleting = true;

    try {
      const response = await fetch(`/api/scenes/${sceneId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete scene. Status: ${response.status}`);
      }

      goto(`/creatives/${creativeId}/stories/${storyId}`);
    } catch (e: any) {
      console.error('Error deleting scene:', e);
      alert(`Failed to delete scene: ${e.message}`);
    } finally {
      isDeleting = false;
    }
  }

  // Clip management functions
  function handleAddClip() {
    if (creativeId && storyId && sceneId) {
      goto(`/creatives/${creativeId}/stories/${storyId}/scenes/${sceneId}/clips/new`);
    }
  }

  function handleEditClip(clipId: number) {
    if (creativeId && storyId && sceneId) {
      goto(`/creatives/${creativeId}/stories/${storyId}/scenes/${sceneId}/clips/${clipId}/edit`);
    }
  }

  async function handleDeleteClip(clipId: number) {
    if (!confirm('Are you sure you want to delete this clip? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/clips/${clipId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete clip. Status: ${response.status}`);
      }

      // Refresh scene data to update the clips list
      if (sceneId) {
        fetchScene(sceneId);
      }
    } catch (e: any) {
      console.error('Error deleting clip:', e);
      alert(`Failed to delete clip: ${e.message}`);
    }
  }

  function handleViewClip(clipId: number) {
    if (creativeId && storyId && sceneId) {
      goto(`/creatives/${creativeId}/stories/${storyId}/scenes/${sceneId}/clips/${clipId}`);
    }
  }

  function handlePlayScene() {
    if (creativeId && storyId && sceneId) {
      goto(`/creatives/${creativeId}/stories/${storyId}/scenes/${sceneId}/play`);
    }
  }
</script>

<div class="container mx-auto max-w-4xl py-8">
  <div class="mb-6 flex justify-between items-center">
    <Button href={`/creatives/${creativeId}/stories/${storyId}`} variant="outline">
      <ArrowLeft class="mr-2 h-4 w-4" />
      Back to Story
    </Button>

    <div class="flex gap-2">
      <Button variant="outline" onclick={handleEditScene}>
        <Edit class="mr-2 h-4 w-4" />
        Edit Scene
      </Button>
      <Button variant="destructive" onclick={handleDeleteScene} disabled={isDeleting}>
        <Trash2 class="mr-2 h-4 w-4" />
        {isDeleting ? 'Deleting...' : 'Delete Scene'}
      </Button>
    </div>
  </div>

  {#if isLoading}
    <div class="flex justify-center p-12">
      <p>Loading scene...</p>
    </div>
  {:else if error}
    <div class="flex flex-col items-center justify-center rounded border border-dashed border-red-500 bg-red-50 p-12 text-center text-red-700">
      <h3 class="text-xl font-semibold">Error Loading Scene</h3>
      <p class="mb-4 text-sm">{error}</p>
      <Button href={`/creatives/${creativeId}/stories/${storyId}`} variant="outline">Go Back</Button>
    </div>
  {:else if scene}
    <div class="space-y-6">
      <div class="rounded border p-6 shadow">
        <div class="flex justify-between items-start">
          <div>
            <h1 class="text-3xl font-bold mb-2">Scene {scene.orderIndex}</h1>
            {#if scene.description}
              <div class="flex items-center text-muted-foreground mb-2">
                <FileText class="h-4 w-4 mr-2" />
                <span>{scene.description}</span>
              </div>
            {/if}
            {#if scene.bgmName}
              <div class="flex items-center text-muted-foreground">
                <Music class="h-4 w-4 mr-2" />
                <span>{scene.bgmName}</span>
              </div>
            {/if}
          </div>

          <Button variant="default" onclick={handlePlayScene} class="flex items-center">
            <Play class="mr-2 h-4 w-4" />
            Play Scene
          </Button>
        </div>
      </div>

      <div class="rounded border p-6 shadow">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">Clips</h2>
          <Button onclick={handleAddClip} variant="default">
            <Plus class="mr-2 h-4 w-4" />
            Add Clip
          </Button>
        </div>

        {#if scene.clips && scene.clips.length > 0}
          <ClipList
            clips={scene.clips}
            sceneId={scene.id}
            onAddClip={handleAddClip}
            onEditClip={handleEditClip}
            onDeleteClip={handleDeleteClip}
            onViewClip={handleViewClip}
          />
        {:else}
          <div class="text-center py-8 border border-dashed rounded-md">
            <p class="text-muted-foreground mb-4">No clips found for this scene.</p>
            <Button onclick={handleAddClip} variant="default">
              <Plus class="mr-2 h-4 w-4" />
              Create Your First Clip
            </Button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
