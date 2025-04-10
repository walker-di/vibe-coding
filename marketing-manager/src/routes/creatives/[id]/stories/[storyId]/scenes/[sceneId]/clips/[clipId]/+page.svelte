<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { Button } from '$lib/components/ui/button';
  import { ArrowLeft, Edit, Trash2, FileText, MessageSquare } from 'lucide-svelte';
  import type { Clip } from '$lib/types/story.types';
  import CanvasPreview from '$lib/components/story/CanvasPreview.svelte'; // Import the preview component
  import ClipNarrationModal from '$lib/components/story/ClipNarrationModal.svelte';

  // State
  let creativeId = $state<number | null>(null);
  let storyId = $state<number | null>(null);
  let sceneId = $state<number | null>(null);
  let clipId = $state<number | null>(null);
  let clip = $state<Clip | null>(null);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let isDeleting = $state(false);
  let isNarrationModalOpen = $state(false);
  // Remove canvasObject state, it's handled by CanvasPreview now
  // let canvasObject = $state<any>(null);

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
      const responseData = await response.json();

      // Handle the new response format with success, data, and message fields
      if (responseData.success && responseData.data) {
        clip = responseData.data;
      } else if (responseData.id) {
        // Handle the old format for backward compatibility
        clip = responseData;
      } else {
        throw new Error('Invalid response format');
      }

      // No need to parse canvas data here anymore
      // if (clip && clip.canvas) {
      //   try {
      //     canvasObject = JSON.parse(clip.canvas);
      //   } catch (e) {
      //     console.error('Error parsing canvas data:', e);
      //   }
      // }
    } catch (e: any) {
      console.error('Error fetching clip:', e);
      error = e.message || 'Failed to load clip';
    } finally {
      isLoading = false;
    }
  }

  // Clip management functions
  function handleEditClip() {
    if (creativeId && storyId && sceneId && clipId) {
      goto(`/creatives/${creativeId}/stories/${storyId}/scenes/${sceneId}/clips/${clipId}/edit`);
    }
  }

  function handleEditNarration() {
    isNarrationModalOpen = true;
  }

  async function handleSaveNarration(data: { narration: string | null; description: string | null; duration: number | null }) {
    if (!clipId) return;

    const response = await fetch(`/api/clips/${clipId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to update clip. Status: ${response.status}`);
    }

    // Update local state with the updated clip data
    const updatedClip = await response.json();
    clip = updatedClip;
  }

  async function handleDeleteClip() {
    if (!clipId || isDeleting) return;

    if (!confirm('Are you sure you want to delete this clip? This action cannot be undone.')) {
      return;
    }

    isDeleting = true;

    try {
      const response = await fetch(`/api/clips/${clipId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete clip. Status: ${response.status}`);
      }

      goto(`/creatives/${creativeId}/stories/${storyId}/scenes/${sceneId}`);
    } catch (e: any) {
      console.error('Error deleting clip:', e);
      alert(`Failed to delete clip: ${e.message}`);
    } finally {
      isDeleting = false;
    }
  }
</script>

<div class="container mx-auto max-w-4xl py-8">
  <div class="mb-6 flex justify-between items-center">
    <Button href={`/creatives/${creativeId}/stories/${storyId}/scenes/${sceneId}`} variant="outline">
      <ArrowLeft class="mr-2 h-4 w-4" />
      Back to Scene
    </Button>

    <div class="flex gap-2">
      <Button variant="outline" onclick={handleEditNarration}>
        <MessageSquare class="mr-2 h-4 w-4" />
        Edit Content
      </Button>
      <Button variant="outline" onclick={handleEditClip}>
        <Edit class="mr-2 h-4 w-4" />
        Edit Canvas
      </Button>
      <Button variant="destructive" onclick={handleDeleteClip} disabled={isDeleting}>
        <Trash2 class="mr-2 h-4 w-4" />
        {isDeleting ? 'Deleting...' : 'Delete Clip'}
      </Button>
    </div>
  </div>

  {#if isLoading}
    <div class="flex justify-center p-12">
      <p>Loading clip...</p>
    </div>
  {:else if error}
    <div class="flex flex-col items-center justify-center rounded border border-dashed border-red-500 bg-red-50 p-12 text-center text-red-700">
      <h3 class="text-xl font-semibold">Error Loading Clip</h3>
      <p class="mb-4 text-sm">{error}</p>
      <Button href={`/creatives/${creativeId}/stories/${storyId}/scenes/${sceneId}`} variant="outline">Go Back</Button>
    </div>
  {:else if clip}
    <div class="space-y-6">
      <div class="rounded border p-6 shadow">
        <h1 class="text-3xl font-bold mb-2">Clip {clip.orderIndex}</h1>
        {#if clip.description}
          <div class="flex items-center text-muted-foreground mb-2">
            <FileText class="h-4 w-4 mr-2" />
            <span>{clip.description}</span>
          </div>
        {/if}
        <div class="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
          <p>Order: {clip.orderIndex}</p>
          <p>Duration: {clip.duration ? (clip.duration / 1000).toFixed(1) + 's' : 'Not set'}</p>
        </div>
      </div>

      <div class="rounded border p-6 shadow">
        <h2 class="text-xl font-semibold mb-4">Canvas Content</h2>
        {#if clip.canvas}
          <CanvasPreview canvasData={clip.canvas} width={600} height={400} />
        {:else}
          <div class="border rounded-md overflow-hidden bg-gray-100 p-4 text-center text-muted-foreground">
            No canvas data available for this clip.
          </div>
        {/if}
      </div>

      {#if clip.narration}
        <div class="rounded border p-6 shadow">
          <h2 class="text-xl font-semibold mb-4 flex items-center">
            <FileText class="mr-2 h-5 w-5" />
            Narration
          </h2>
          <div class="border rounded-md p-4 bg-gray-50">
            <p class="whitespace-pre-wrap">{clip.narration}</p>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  {#if clip}
    <ClipNarrationModal
      bind:open={isNarrationModalOpen}
      clip={clip}
      onSave={handleSaveNarration}
    />
  {/if}
</div>
