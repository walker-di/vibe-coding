<script lang="ts">
  // Import the Phaser game component
  import PhaserGame from '$lib/components/PhaserGame.svelte';
  import { browser } from '$app/environment'; // Import browser check

  // Phaser needs the DOM, so we only render the component on the client-side
  let showPhaser = false;
  if (browser) {
    showPhaser = true;
  }
</script>

<svelte:head>
  <title>Manager UI Game</title>
  <meta name="description" content="Card stacking management game" />
</svelte:head>

<section>
  <h1>Card Management Game</h1>

  {#if showPhaser}
    <PhaserGame />
  {:else}
    <p>Loading Phaser Game...</p>
    <!-- You could add a loading spinner here -->
  {/if}

</section>

<style>
  section {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    flex: 1;
  }

  h1 {
    width: 100%;
    text-align: center;
    margin-bottom: 1rem;
  }

  /* Add any additional page styling if needed */
</style>
