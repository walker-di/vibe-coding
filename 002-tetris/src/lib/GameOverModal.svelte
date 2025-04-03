<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let level: number = 0;
  export let score: number = 0;
  export let show: boolean = false; // Controls modal visibility

  const dispatch = createEventDispatcher();

  function handleRestart() {
    dispatch('restart');
  }

  // Optional: Handle closing via backdrop or escape key if needed,
  // but for now, only the button triggers the restart.
</script>

{#if show}
  <div class="modal-backdrop fade show"></div>
  <div class="modal fade show d-block" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-dialog-centered" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Game Over!</h5>
          <!-- No close button for now, force restart -->
          <!-- <button type="button" class="btn-close" aria-label="Close" on:click={() => show = false}></button> -->
        </div>
        <div class="modal-body">
          <p>Fim de jogo!</p>
          <p>Seu Nível Final: <span class="fw-bold">{level}</span></p>
          <p>Seu Score Final: <span class="fw-bold">{score}</span></p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" on:click={handleRestart}>
            Iniciar Novo Jogo
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Ensure backdrop is styled correctly if not using Bootstrap JS */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1040; /* Below modal */
    width: 100vw;
    height: 100vh;
    background-color: #000;
    opacity: 0.5;
  }

  /* Ensure modal is displayed correctly */
  .modal.d-block {
      display: block;
      z-index: 1050; /* Above backdrop */
  }
</style>
