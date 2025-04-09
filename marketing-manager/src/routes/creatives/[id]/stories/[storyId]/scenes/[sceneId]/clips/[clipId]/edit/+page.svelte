<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { AlertCircle } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import ClipForm from '$lib/components/story/ClipForm.svelte';
  import type { Clip } from '$lib/types/story.types';
  import type { PageData } from './$types'; // Import PageData

  // Get data from the load function
  let { data }: { data: PageData } = $props();

  // Access the loaded data directly
  // Note: If clip is null/undefined from load (e.g., error), handle appropriately below
  const { clip, creativeId, storyId, sceneId, clipId } = data;

  // State (Client-side fetch state removed)
  // let creativeId = $state<number | null>(null); // Now from data
  // let storyId = $state<number | null>(null); // Now from data
  // let sceneId = $state<number | null>(null); // Now from data
  // let clipId = $state<number | null>(null); // Now from data
  // let clip = $state<Clip | null>(null); // Now from data
  // let isLoading = $state(true); // Loading handled by server load
  // let error = $state<string | null>(null); // Error handled by server load / SvelteKit error page

  // Fetch clip data (Removed - Handled by server load function)
  // $effect(() => {
  //   const cId = $page.params.id; // $page store no longer needed here
  //   const sId = $page.params.storyId;
  //   const scId = $page.params.sceneId;
  //   const clId = $page.params.clipId;
    
  //   if (!cId || isNaN(parseInt(cId)) || !sId || isNaN(parseInt(sId)) || 
  //       !scId || isNaN(parseInt(scId)) || !clId || isNaN(parseInt(clId))) {
  //     // Error handling now done in load function
  //     return;
  //   }
  //   // IDs now come directly from data prop
  //   fetchClip(clipId); // fetchClip function removed
  // });

  // async function fetchClip(id: number) { // Function removed
  //   // ...
  // }

  // Handle form submission
  async function handleSubmit(clipData: Partial<Clip>): Promise<Clip | null> { // Update return type
    try {
      const response = await fetch(`/api/clips/${clipId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(clipData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update clip. Status: ${response.status}. ${errorText}`);
      }

      const updatedClip: Clip = await response.json(); // Get updated clip from response

      // Navigate only after successful update and getting the result
      goto(`/creatives/${creativeId}/stories/${storyId}/scenes/${sceneId}/clips/${clipId}`);

      return updatedClip; // Return the updated clip

    } catch (e: any) {
      console.error('Error updating clip:', e);
      alert(`Failed to update clip: ${e.message}`);
      return null; // Return null on error
    }
  }

  // Handle cancel
  function handleCancel() {
    goto(`/creatives/${creativeId}/stories/${storyId}/scenes/${sceneId}/clips/${clipId}`);
  }
</script>

<div class="container mx-auto max-w-4xl py-8">
  {#if clip} <!-- Render only if clip data is available from load -->
    <div class="rounded border p-6 shadow">
      <ClipForm 
        {clip}
        sceneId={sceneId || 0} 
        isEditing={true}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  {:else}
    <!-- Optional: Add a message or fallback UI if clip is unexpectedly null/undefined 
         after a successful load, though this shouldn't typically happen if load guards correctly. -->
    <div class="flex justify-center p-12">
      <p>Clip data not available.</p> 
    </div>
  {/if}
</div>
