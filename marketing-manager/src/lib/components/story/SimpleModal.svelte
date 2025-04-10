<script>
  import { createEventDispatcher } from 'svelte';

  // Props
  export let show = false;
  export let title = '';
  export let isLoading = false;

  const dispatch = createEventDispatcher();
</script>

{#if show}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white p-6 rounded-lg shadow-lg w-[500px] max-w-[90vw]">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">{title}</h2>
        <button
          class="text-gray-500 hover:text-gray-700"
          on:click={() => { if (!isLoading) { dispatch('close'); } }}
          disabled={isLoading}
        >
          &times;
        </button>
      </div>

      <slot></slot>

      <div class="flex justify-end space-x-2 mt-4">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
{/if}
