<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { Button } from '$lib/components/ui/button';
  import { ArrowLeft, Edit, Trash2, Plus, BookOpen } from 'lucide-svelte';
  import SceneEditor from '$lib/components/story/SceneEditor.svelte';
  import type { StoryWithRelations } from '$lib/types/story.types';
  import { onMount } from 'svelte';

  const productId = $derived(parseInt(page.params.productId));
  const personaId = $derived(parseInt(page.params.personaId));
  const creativeId = $derived(parseInt(page.params.creativeId));
  const storyId = $derived(parseInt(page.params.storyId));
  const backLink = $derived(productId && personaId && creativeId
    ? `/products/${productId}/personas/${personaId}/creatives/${creativeId}`
    : '/');
  let story = $state<StoryWithRelations | null>(null);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let isDeleting = $state(false);

  // Fetch story data
  onMount(() => {
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
      story = await response.json();

      // Validate that the story belongs to the correct creative
      if (story && story.creativeId !== creativeId) {
        throw new Error('This story does not belong to the specified creative.');
      }
    } catch (e: any) {
      console.error('Error fetching story:', e);
      error = e.message || 'Failed to load story';
    } finally {
      isLoading = false;
    }
  }

  // Scene management functions
  async function handleAddScene() {
    if (!storyId || !creativeId) return;

    try {
      const response = await fetch('/api/scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          orderIndex: (story?.scenes?.length || 0),
          bgmName: null,
          bgmUrl: null
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to add scene. Status: ${response.status}`);
      }

      // Refresh story data
      fetchStory(storyId);
    } catch (e: any) {
      console.error('Error adding scene:', e);
      // Optionally show an error message
    }
  }

  async function handleEditScene(sceneId: number) {
    if (!productId || !personaId || !creativeId || !storyId) return;
    goto(`/products/${productId}/personas/${personaId}/creatives/${creativeId}/stories/${storyId}/scenes/${sceneId}/edit`);
  }

  async function handleDeleteScene(sceneId: number) {
    if (!storyId || !sceneId) return;

    if (!confirm('Are you sure you want to delete this scene?')) {
      return;
    }

    try {
      const response = await fetch(`/api/scenes/${sceneId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete scene. Status: ${response.status}`);
      }

      // Refresh story data
      fetchStory(storyId);
    } catch (e: any) {
      console.error('Error deleting scene:', e);
      // Optionally show an error message
    }
  }

  function handleSelectScene(sceneId: number) {
    if (!productId || !personaId || !creativeId || !storyId) return;
    goto(`/products/${productId}/personas/${personaId}/creatives/${creativeId}/stories/${storyId}/scenes/${sceneId}`);
  }

  // Story management functions
  function handleEditStory() {
    if (!productId || !personaId || !creativeId || !storyId) return;
    goto(`/products/${productId}/personas/${personaId}/creatives/${creativeId}/stories/${storyId}/edit`);
  }

  async function handleDeleteStory() {
    if (!storyId || isDeleting) return;

    if (!confirm('Are you sure you want to delete this story?')) {
      return;
    }

    isDeleting = true;

    try {
      const response = await fetch(`/api/stories/${storyId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete story. Status: ${response.status}`);
      }

      // Navigate back to creative page
      if (productId && personaId && creativeId) {
        goto(`/products/${productId}/personas/${personaId}/creatives/${creativeId}`);
      }
    } catch (e: any) {
      console.error('Error deleting story:', e);
      // Optionally show an error message
    } finally {
      isDeleting = false;
    }
  }

</script>

<div class="container mx-auto max-w-4xl py-8">
  <div class="mb-6 flex items-center justify-between">
    <Button href={backLink} variant="outline">
      <ArrowLeft class="mr-2 h-4 w-4" />
      Back to Creative
    </Button>

    {#if story && !isLoading}
      <div class="flex gap-2">
        <Button variant="outline" onclick={handleEditStory}>
          <Edit class="mr-2 h-4 w-4" />
          Edit Story
        </Button>
        <Button variant="destructive" onclick={handleDeleteStory} disabled={isDeleting}>
          {#if isDeleting}
            Deleting...
          {:else}
            <Trash2 class="mr-2 h-4 w-4" />
            Delete Story
          {/if}
        </Button>
      </div>
    {/if}
  </div>

  {#if isLoading}
    <div class="flex justify-center p-12">
      <p>Loading story...</p>
    </div>
  {:else if error}
    <div class="flex flex-col items-center justify-center rounded border border-dashed border-red-500 bg-red-50 p-12 text-center text-red-700">
      <h3 class="text-xl font-semibold">Error Loading Story</h3>
      <p class="mb-4 text-sm">{error}</p>
      <Button href={backLink} variant="outline">Go Back</Button>
    </div>
  {:else if story}
    <!-- Render story details first -->
    <div class="space-y-6">
      <div class="rounded border p-6 shadow">
        <h1 class="text-3xl font-bold mb-2">{story.title}</h1>
        {#if story.description}
          <p class="text-muted-foreground">{story.description}</p>
        {/if}
      </div>

      <!-- Scene Editor -->
      <div class="rounded border p-6 shadow">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-xl font-semibold">Scenes</h2>
          <Button variant="outline" onclick={handleAddScene}>
            <Plus class="mr-2 h-4 w-4" />
            Add Scene
          </Button>
        </div>

        {#if creativeId !== null && storyId !== null}
          <SceneEditor
            scenes={story.scenes || []}
            storyId={story.id}
            creativeId={creativeId}
            onAddScene={handleAddScene}
            onEditScene={handleEditScene}
            onDeleteScene={handleDeleteScene}
            onSelectScene={handleSelectScene}
          />
        {:else}
           <!-- Placeholder if IDs are missing, even if story loaded -->
           <div class="text-center py-8 border border-dashed rounded-md">
             <BookOpen class="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
             <p class="text-muted-foreground mb-4">Required creative or story ID is missing.</p>
           </div>
        {/if}
      </div>
    </div>
  {:else}
     <!-- Fallback if story is null after loading (shouldn't happen if no error) -->
     <div class="flex justify-center p-12">
       <p>Story data not available.</p>
     </div>
  {/if}
</div>
