<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  // Remove static imports related to phaser/main.ts
  // import { launch } from '$lib/phaser-game/src/main';
  // import type { Game } from '$lib/phaser-game/src/main';
  import type Phaser from 'phaser'; // Keep type import if needed elsewhere, or define locally

  const containerId = 'phaser-container';
  let gameInstance: Phaser.Game | null = null; // Use Phaser.Game type directly

  onMount(() => {
    // Define an async function to handle the dynamic import and initialization
    const initPhaser = async () => {
      try {
        const { launch } = await import('$lib/phaser-game/src/main');

        // Ensure the container exists before launching
        if (document.getElementById(containerId)) {
          console.log('Launching Phaser game...');
          // Assign to the component's gameInstance variable
          gameInstance = launch(containerId);
        } else {
          console.error(`Phaser container with ID "${containerId}" not found.`);
        }
      } catch (error) {
        console.error('Failed to load or launch Phaser game:', error);
      }
    };

    // Call the async initialization function
    initPhaser();

    // Return the cleanup function synchronously
    return () => {
      // This cleanup function will be called when the component is destroyed
      // It uses the gameInstance variable which initPhaser populates
      if (gameInstance) {
        console.log('onMount cleanup: Destroying Phaser game instance...');
        try {
            gameInstance.destroy(true); // true to remove canvas from DOM
            gameInstance = null;
            console.log('onMount cleanup: Phaser game instance destroyed.');
        } catch (error) {
            console.error('onMount cleanup: Error destroying Phaser game instance:', error);
        }
      }
    };
  });

    // Optional: Handle component destruction explicitly if needed
    onDestroy(() => {
      if (gameInstance) {
        console.log('onDestroy: Attempting to destroy Phaser game instance...');
        try {
            gameInstance.destroy(true);
            gameInstance = null;
            console.log('Phaser game instance destroyed.');
        } catch (error) {
            console.error('Error destroying Phaser game instance:', error);
        }
    }
  });

</script>

<div id="{containerId}" class="phaser-container">
  <!-- Phaser canvas will be injected here -->
</div>

<style>
  .phaser-container {
    /* Optional: Add some basic styling */
    width: 800px; /* Match game config width */
    height: 600px; /* Match game config height */
    margin: auto; /* Center the container */
    border: 1px solid #ccc; /* Optional border */
    overflow: hidden; /* Hide anything outside the canvas bounds */
  }
  /* Ensure canvas fills the container if needed */
  .phaser-container :global(canvas) {
      display: block;
      width: 100%;
      height: 100%;
  }
</style>
