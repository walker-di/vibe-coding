<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { Button } from '$lib/components/ui/button';
  import { ArrowLeft, Edit, Trash2, Plus, BookOpen } from 'lucide-svelte';
  import SceneEditor from '$lib/components/story/SceneEditor.svelte'; // Import SceneEditor
  import type { StoryWithRelations, Clip } from '$lib/types/story.types';

   // State
  let creativeId = $state<number | null>(null);
  let storyId = $state<number | null>(null);
  let story = $state<StoryWithRelations | null>(null);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let isDeleting = $state(false);

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

  // Story management functions
  function handleEditStory() {
    if (creativeId && storyId) {
      goto(`/creatives/${creativeId}/stories/${storyId}/edit`);
    }
  }

  async function handleDeleteStory() {
    if (!storyId || isDeleting) return;

    if (!confirm('Are you sure you want to delete this story? This action cannot be undone.')) {
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

      goto(`/creatives/${creativeId}/stories`);
    } catch (e: any) {
      console.error('Error deleting story:', e);
      alert(`Failed to delete story: ${e.message}`);
    } finally {
      isDeleting = false;
    }
  }

  // Function to update a clip
  async function handleUpdateClip(clipId: number | undefined, data: Partial<Clip>) {
    // Validate clipId
    if (!clipId) {
      console.error('Cannot update clip: Invalid or undefined clip ID');
      throw new Error('Cannot update clip: Invalid clip ID');
    }

    try {
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

      // Removed fetchStory(storyId) - SceneEditor updates its state internally
      // and reactivity should handle UI updates based on the 'scenes' prop.
      const updatedClipData = await response.json();

      // Optionally, update the local 'story' state if absolutely necessary,
      // but prefer letting SceneEditor manage its view based on props.
      // Example (if needed):
      /*
      if (story?.scenes) {
        story.scenes = story.scenes.map(scene => {
          if (scene.clips) {
            scene.clips = scene.clips.map(c => c.id === clipId ? { ...c, ...updatedClipData } : c);
          }
          return scene;
        });
        story = { ...story }; // Trigger reactivity if needed
      }
      */

      return updatedClipData;
    } catch (e: any) {
      console.error('Error updating clip:', e);
      throw new Error(`Failed to update clip: ${e.message}`);
    }
  }

  // Scene management functions
  function handleAddScene() {
    if (creativeId && storyId) {
      goto(`/creatives/${creativeId}/stories/${storyId}/scenes/new`);
    }
  }

  function handleEditScene(sceneId: number) {
    if (creativeId && storyId) {
      goto(`/creatives/${creativeId}/stories/${storyId}/scenes/${sceneId}/edit`);
    }
  }

  async function handleDeleteScene(sceneId: number) {
    if (!confirm('Are you sure you want to delete this scene? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/scenes/${sceneId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete scene. Status: ${response.status}`);
      }

      // Removed fetchStory(storyId) - Update local state directly
      if (story?.scenes) {
        story.scenes = story.scenes.filter(scene => scene.id !== sceneId);
        story = { ...story }; // Trigger reactivity
      }
    } catch (e: any) {
      console.error('Error deleting scene:', e);
      alert(`Failed to delete scene: ${e.message}`);
    }
  }

  function handleSelectScene(sceneId: number) {
    // This function is passed down but might not be directly used by SceneEditor itself,
    // rather by the SceneList within it.
    if (creativeId && storyId) {
      goto(`/creatives/${creativeId}/stories/${storyId}/scenes/${sceneId}`);
    }
  }

  // Function to handle selecting a clip
  // This is a no-op because the SceneEditor component has its own internal handleSelectClip
  // that displays the clip in the canvas editor
  function handleSelectClip(clip: Clip) {
    // Do nothing - let the SceneEditor handle this
    console.log('Clip selected in page component, but letting SceneEditor handle it');
  }

  // Function to handle duplicating a clip
  async function handleDuplicateClip(clip: Clip) {
    try {
      // Create a new clip with the same data
      const response = await fetch('/api/clips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sceneId: clip.sceneId,
          orderIndex: clip.orderIndex + 0.5, // Position right after the current clip
          canvas: clip.canvas,
          narration: clip.narration,
          description: clip.description,
          duration: clip.duration,
          imageUrl: clip.imageUrl
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to duplicate clip. Status: ${response.status}`);
      }

      // Removed fetchStory(storyId) - SceneEditor updates its state internally
      // after its own duplication logic completes.
      // The page component doesn't need to refetch here.
      // Note: SceneEditor's handleDuplicateClip might need adjustment
      // if it relies on this page refetching.
    } catch (e: any) {
      console.error('Error duplicating clip:', e);
      alert(`Failed to duplicate clip: ${e.message}`);
    }
  }

</script>

<div class="container mx-auto py-1">
  {#if isLoading}
    <div class="flex justify-center p-12">
      <p>Loading story...</p>
    </div>
  {:else if error}
    <div class="flex flex-col items-center justify-center rounded border border-dashed border-red-500 bg-red-50 p-12 text-center text-red-700">
      <h3 class="text-xl font-semibold">Error Loading Story</h3>
      <p class="mb-4 text-sm">{error}</p>
      <Button variant="outline" onclick={() => history.back()}>Go Back</Button>
    </div>
  {:else if story}
    <!-- Render story details first -->
    <div class="space-y-6">
      <!-- Render SceneEditor section separately -->
      <div class="rounded border shadow">
        <div class="flex justify-between items-center p-4 border-b">
          <div class="flex ">
            <Button variant="outline" onclick={() => history.back()}>
              <ArrowLeft class="h-4 w-4" />
            </Button>
            <h1 class="text-xl font-semibold p-1.5 ml-2">{story.title}</h1>
            <Button variant="ghost" onclick={handleEditStory} disabled={!creativeId || !storyId}>
              <Edit class="h-4 w-4" />
            </Button>
          </div>
        </div>

        {#if creativeId !== null && storyId !== null}
          <SceneEditor
            scenes={story.scenes || []}
            storyId={story.id}
            aspectRatio={story.aspectRatio}
            onEditScene={handleEditScene}
            onDeleteScene={handleDeleteScene}
            onSelectScene={handleSelectScene}
            onUpdateClip={handleUpdateClip}
            onSelectClip={handleSelectClip}
            onDuplicateClip={handleDuplicateClip}
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
