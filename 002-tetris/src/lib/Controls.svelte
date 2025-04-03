<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // Prop: current game state to determine which buttons to show
  export let gameState: 'playing' | 'paused' | 'gameOver' | 'initial'; // Include all relevant states

  const dispatch = createEventDispatcher();

  function handlePause() {
    dispatch('pause');
  }

  function handleResume() {
    dispatch('resume');
  }

  function handleStop() {
    dispatch('stop');
  }
</script>

<div class="d-grid gap-2">
  {#if gameState === 'playing'}
    <button class="btn btn-warning" on:click={handlePause}>Pausar</button>
  {:else if gameState === 'paused'}
    <button class="btn btn-success" on:click={handleResume}>Continuar</button>
  {/if}

  {#if gameState === 'playing' || gameState === 'paused'}
    <button class="btn btn-danger" on:click={handleStop}>Parar</button>
  {/if}

  <!-- No controls shown during 'initial' or 'gameOver' states in this component -->
</div>

<style>
  /* Add specific styles if needed */
</style>
