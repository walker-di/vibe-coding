<script lang="ts">
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Sparkles } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';

  // Props using Svelte 5 runes
  const { show = false, isLoading = false } = $props<{
    show: boolean;
    isLoading: boolean;
  }>();

  // State
  let storyPrompt = $state('');
  let aiProvider = $state<'gemini' | 'openai' | 'claude'>('gemini');
  let includeProductInfo = $state(true); // Default to including product info
  let includePersonaInfo = $state(true); // Default to including persona info
  let includeCreativeInfo = $state(true); // Default to including creative info
  let modalElement = $state<HTMLDivElement | null>(null);

  // Create event dispatcher
  const dispatch = createEventDispatcher<{
    close: void;
    create: {
      storyPrompt: string;
      aiProvider: 'gemini' | 'openai' | 'claude';
      includeProductInfo: boolean;
      includePersonaInfo: boolean;
      includeCreativeInfo: boolean;
    };
  }>();

  function handleClose() {
    if (!isLoading) {
      dispatch('close');
    }
  }

  function handleSubmit() {
    if (!storyPrompt.trim()) {
      alert('Please enter a story prompt');
      return;
    }

    dispatch('create', {
      storyPrompt,
      aiProvider,
      includeProductInfo,
      includePersonaInfo,
      includeCreativeInfo
    });
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

  $effect(() => {
    if (show) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeydown);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeydown);
    }
  });
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
          onclick={handleClose}
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

      <div class="mb-4">
        <Label for="aiProvider" class="mb-2 block">AI Provider</Label>
        <div class="flex flex-wrap gap-4">
          <label class="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="aiProvider"
              value="gemini"
              checked={aiProvider === 'gemini'}
              onchange={() => aiProvider = 'gemini'}
              disabled={isLoading}
              class="h-4 w-4 text-purple-600"
            />
            <span>Gemini</span>
          </label>
          <label class="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="aiProvider"
              value="openai"
              checked={aiProvider === 'openai'}
              onchange={() => aiProvider = 'openai'}
              disabled={isLoading}
              class="h-4 w-4 text-purple-600"
            />
            <span>OpenAI</span>
          </label>
          <label class="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="aiProvider"
              value="claude"
              checked={aiProvider === 'claude'}
              onchange={() => aiProvider = 'claude'}
              disabled={isLoading}
              class="h-4 w-4 text-purple-600"
            />
            <span>Claude</span>
          </label>
        </div>
        <p class="text-xs text-gray-500 mt-1">
          Select which AI provider to use for generating the story content.
        </p>
      </div>

      <div class="mb-4">
        <Label class="mb-2 block">Context Information</Label>
        <div class="space-y-2 ml-1">
          <div class="flex items-center justify-between">
            <label for="includeProductInfo" class="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                id="includeProductInfo"
                checked={includeProductInfo}
                onclick={() => includeProductInfo = !includeProductInfo}
                disabled={isLoading}
                class="h-4 w-4 text-purple-600 rounded"
              />
              <span>Include Product Information</span>
            </label>
          </div>

          <div class="flex items-center justify-between">
            <label for="includePersonaInfo" class="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                id="includePersonaInfo"
                checked={includePersonaInfo}
                onclick={() => includePersonaInfo = !includePersonaInfo}
                disabled={isLoading}
                class="h-4 w-4 text-purple-600 rounded"
              />
              <span>Include Persona/Target Audience Information</span>
            </label>
          </div>

          <div class="flex items-center justify-between">
            <label for="includeCreativeInfo" class="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                id="includeCreativeInfo"
                checked={includeCreativeInfo}
                onclick={() => includeCreativeInfo = !includeCreativeInfo}
                disabled={isLoading}
                class="h-4 w-4 text-purple-600 rounded"
              />
              <span>Include Creative Information</span>
            </label>
          </div>
        </div>
        <p class="text-xs text-gray-500 mt-2">
          Select which context information to include in the AI prompt.
        </p>
      </div>

      <div class="flex justify-end space-x-2">
        <button
          class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          onclick={handleClose}
          disabled={isLoading}
          type="button"
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 rounded-md bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 flex items-center justify-center"
          onclick={handleSubmit}
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
