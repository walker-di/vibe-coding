<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Label } from '$lib/components/ui/label';
  import { Loader2, Music, Check } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import type { BgmFileListItem } from '$lib/types/bgm.types';
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  // Props
  let {
    open = $bindable(false),
    sceneId,
    sceneName = '',
    isLoading = false
  } = $props<{
    open: boolean;
    sceneId: number;
    sceneName?: string;
    isLoading?: boolean;
  }>();

  // Create a dispatcher for events
  const dispatch = createEventDispatcher();

  // State
  let suggestedBgms = $state<BgmFileListItem[]>([]);
  let selectedBgmId = $state<number | null>(null);
  let musicPrompt = $state<string | null>(null);
  let audioElement = $state<HTMLAudioElement | null>(null);
  let playingBgmId = $state<number | null>(null);
  let isFetchingSuggestions = $state(false);
  let errorMessage = $state<string | null>(null);

  // Track previous open state to prevent infinite loops
  let wasOpen = $state(false);

  // Fetch suggested BGMs when the modal opens
  $effect(() => {
    // Only take action when the open state changes
    if (open !== wasOpen) {
      wasOpen = open;

      if (open && sceneId && sceneId > 0) {
        fetchSuggestedBgms();
      } else if (!open) {
        // Reset state when modal closes
        suggestedBgms = [];
        selectedBgmId = null;
        musicPrompt = null;
        stopAllAudio();
      }
    }
  });

  // Clean up audio when component is unmounted
  onMount(() => {
    return () => {
      stopAllAudio();
    };
  });

  // Fetch suggested BGMs from the API
  async function fetchSuggestedBgms() {
    if (!sceneId || isFetchingSuggestions) return;

    isFetchingSuggestions = true;
    errorMessage = null;
    suggestedBgms = [];

    try {
      const response = await fetch(`/api/scenes/${sceneId}/suggest-bgm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        let message = `Failed with status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) {
            message = errorData.message;
          }
        } catch (e) {
          console.error('Error parsing error response:', e);
        }

        // Special handling for common errors
        if (response.status === 404 && message.includes('No BGM files found')) {
          throw new Error('No BGM files available. Please upload some BGM files in the Settings page first.');
        }

        throw new Error(message);
      }

      const data = await response.json();

      if (data.success && data.data) {
        suggestedBgms = data.data.suggestedBgms || [];
        musicPrompt = data.data.musicPrompt || null;

        if (suggestedBgms.length === 0) {
          errorMessage = 'No matching BGM files found. Try uploading more BGM files with descriptions.';
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      console.error('Error fetching suggested BGMs:', err);
      errorMessage = err.message || 'Failed to fetch suggested BGMs';
    } finally {
      isFetchingSuggestions = false;
    }
  }

  // Play/pause audio preview
  function toggleAudio(bgmId: number) {
    if (!audioElement) return;

    if (playingBgmId === bgmId) {
      // Currently playing this BGM, so pause it
      audioElement.pause();
      playingBgmId = null;
    } else {
      // Stop any currently playing audio
      if (playingBgmId !== null) {
        audioElement.pause();
      }

      // Find the BGM
      const bgm = suggestedBgms.find(b => b.id === bgmId);
      if (!bgm) return;

      // Play the selected BGM
      const timestamp = Date.now();
      const audioUrlWithTimestamp = `${bgm.audioUrl}?t=${timestamp}`;

      audioElement.src = audioUrlWithTimestamp;
      audioElement.load();
      audioElement.play()
        .then(() => {
          playingBgmId = bgmId;
        })
        .catch(err => {
          console.error('Error playing audio:', err);
          toast.error(`Failed to play audio: ${err.message || 'Unknown error'}`);
          playingBgmId = null;
        });
    }
  }

  // Stop all audio playback
  function stopAllAudio() {
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
    }
    playingBgmId = null;
  }

  // Handle selection of a BGM
  function handleSelectBgm() {
    if (!selectedBgmId) {
      toast.error('Please select a BGM first');
      return;
    }

    const selectedBgm = suggestedBgms.find(bgm => bgm.id === selectedBgmId);
    if (!selectedBgm) {
      toast.error('Selected BGM not found');
      return;
    }

    // Stop any playing audio
    stopAllAudio();

    // Dispatch the select event with the selected BGM
    dispatch('select', {
      bgmUrl: selectedBgm.audioUrl,
      bgmName: selectedBgm.name
    });

    // Close the modal
    dispatch('close');
  }

  // Handle close
  function handleClose() {
    stopAllAudio();
    dispatch('close');
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
      <!-- Header -->
      <div class="p-4 border-b flex items-center justify-between">
        <h2 class="text-xl font-semibold flex items-center">
          <Music class="h-5 w-5 mr-2" />
          Auto-Select BGM for {sceneName}
        </h2>
        <Button variant="ghost" size="sm" onclick={handleClose}>×</Button>
      </div>

      <!-- Content -->
      <div class="p-4 overflow-y-auto flex-grow">
        {#if musicPrompt}
          <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <Label class="font-medium mb-1 block">Music Prompt</Label>
            <p class="text-sm text-gray-700">{musicPrompt}</p>
          </div>
        {/if}

        {#if isFetchingSuggestions}
          <div class="py-8 flex flex-col items-center justify-center">
            <Loader2 class="h-8 w-8 animate-spin text-blue-500 mb-2" />
            <p>Finding the perfect background music...</p>
          </div>
        {:else if errorMessage}
          <div class="py-8 text-center">
            <p class="text-red-500 mb-4">{errorMessage}</p>
            <Button variant="outline" onclick={fetchSuggestedBgms}>Try Again</Button>
          </div>
        {:else if suggestedBgms.length === 0}
          <div class="py-8 text-center">
            <p class="text-gray-500 mb-4">No BGM suggestions available.</p>
            <Button variant="outline" onclick={fetchSuggestedBgms}>Refresh</Button>
          </div>
        {:else}
          <div class="space-y-4">
            <Label class="font-medium">Suggested Background Music</Label>
            <p class="text-sm text-gray-500 mb-2">Select the BGM that best fits your scene:</p>

            <div class="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
              {#each suggestedBgms as bgm (bgm.id)}
                <div
                  role="button"
                  tabindex="0"
                  class="p-3 border rounded-md hover:bg-gray-50 cursor-pointer flex items-center justify-between {selectedBgmId === bgm.id ? 'bg-blue-50 border-blue-300' : ''}"
                  onclick={() => selectedBgmId = bgm.id}
                  onkeydown={(e) => e.key === 'Enter' && (selectedBgmId = bgm.id)}
                >
                  <div class="flex-grow">
                    <div class="font-medium flex items-center">
                      {#if selectedBgmId === bgm.id}
                        <Check class="h-4 w-4 text-blue-500 mr-1" />
                      {/if}
                      {bgm.name}
                    </div>
                    {#if bgm.description}
                      <div class="text-sm text-gray-500 mt-1">{bgm.description}</div>
                    {/if}
                    {#if bgm.duration}
                      <div class="text-xs text-gray-400 mt-1">Duration: {Math.floor(bgm.duration / 60)}:{(bgm.duration % 60).toString().padStart(2, '0')}</div>
                    {/if}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={(e) => {
                      e.stopPropagation();
                      toggleAudio(bgm.id);
                    }}
                    class="h-8 px-2"
                  >
                    {playingBgmId === bgm.id ? 'Stop' : 'Preview'}
                  </Button>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Hidden audio element for previews -->
        <audio bind:this={audioElement} class="hidden"></audio>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t flex justify-end gap-2">
        <Button variant="outline" onclick={handleClose}>Cancel</Button>
        <Button
          onclick={handleSelectBgm}
          disabled={!selectedBgmId || isLoading}
        >
          {#if isLoading}
            <Loader2 class="h-4 w-4 mr-2 animate-spin" />
            Applying...
          {:else}
            Apply Selected BGM
          {/if}
        </Button>
      </div>
    </div>
  </div>
{/if}
