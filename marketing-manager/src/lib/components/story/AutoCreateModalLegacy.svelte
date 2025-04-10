<script lang="ts">
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Sparkles } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';

  // Props
  export let show = false;
  export let isLoading = false;

  // State
  let storyPrompt = '';
  let modalElement: HTMLDivElement;

  // Create event dispatcher
  const dispatch = createEventDispatcher();

  function handleClose() {
    if (!isLoading) {
      show = false;
      dispatch('close');
    }
  }

  function handleSubmit() {
    if (!storyPrompt.trim()) {
      alert('Please enter a story prompt');
      return;
    }

    dispatch('create', { storyPrompt });
  }

  // Handle clicking outside the modal to close it
  function handleClickOutside(event: MouseEvent) {
    if (modalElement && !modalElement.contains(event.target as Node) && !isLoading) {
      handleClose();
    }
  }

  // Handle ESC key to close the modal
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && !isLoading) {
      handleClose();
    }
  }

  // Add/remove event listeners when the modal is shown/hidden
  if (show) {
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);
  } else {
    document.removeEventListener('mousedown', handleClickOutside);
    document.removeEventListener('keydown', handleKeydown);
  }
</script>

{#if show}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div
      class="bg-white p-6 rounded-lg shadow-lg w-[500px] max-w-[90vw]"
      bind:this={modalElement}
    >
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold flex items-center">
          <Sparkles class="h-5 w-5 mr-2 text-purple-500" />
          Auto-Create Story
        </h2>
        <button
          class="text-gray-500 hover:text-gray-700"
          on:click={handleClose}
          disabled={isLoading}
          type="button"
        >
          &times;
        </button>
      </div>

      <div class="mb-4">
        <Label for="storyPrompt" class="mb-2 block">Story Prompt</Label>
        <Textarea
          id="storyPrompt"
          bind:value={storyPrompt}
          placeholder="Describe the story you want to create..."
          rows={5}
          disabled={isLoading}
          class="w-full"
        />
        <p class="text-xs text-gray-500 mt-1">
          Provide a detailed description of the story you want to create. The AI will generate multiple clips based on your prompt.
        </p>
      </div>

      <div class="flex justify-end space-x-2">
        <button
          class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          on:click={handleClose}
          disabled={isLoading}
          type="button"
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 rounded-md bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 flex items-center justify-center"
          on:click={handleSubmit}
          disabled={isLoading}
          type="button"
        >
          {#if isLoading}
            <div class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
            Generating...
          {:else}
            <Sparkles class="h-4 w-4 mr-2" />
            Create Story
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
