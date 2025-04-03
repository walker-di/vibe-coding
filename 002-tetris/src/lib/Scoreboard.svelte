<script lang="ts">
  export let level: number = 1;
  export let score: number = 0;
</script>

<div>
  <p class="mb-1">Nível: <span class="fw-bold">{level}</span></p>
  <p class="mb-0">Score: <span class="fw-bold">{score}</span></p>
</div>

<style>
  /* Add any specific styles for the scoreboard if needed */
  div {
    font-size: 1.1rem;
  }
</style>
