<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';

  export let isOpen = false;
  export let originalPrompt: string = '';
  export let assetType: 'narration' | 'mainImage' | 'backgroundImage' | 'bgm'; // Add narration and bgm
  export let storyboardId: string; // Added prop
  export let frameId: string; // Added prop

  let modificationInstructions: string = '';
  let isLoading = false;
  let error: string | null = null;

  const dispatch = createEventDispatcher<{ close: void; regenerated: string }>();

  function closeModal() {
    // Reset state on close
    modificationInstructions = '';
    isLoading = false;
    error = null;
    dispatch('close');
  }

  async function handleRegenerate() {
    // Remove check for empty instructions: !modificationInstructions.trim()
    if (isLoading) {
      return; // Only prevent if already loading
    }

    isLoading = true;
    error = null;

    try {
      // TODO: Replace with actual API endpoint call later
      console.log('Calling API to regenerate prompt...');
      console.log('Original Prompt:', originalPrompt);
      console.log('Instructions:', modificationInstructions);

      // Call the actual API endpoint
      const response = await fetch('/api/storyboard/regenerate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalPrompt: originalPrompt,
          instructions: modificationInstructions,
          assetType: assetType,
          storyboardId: storyboardId, // Send storyboardId
          frameId: frameId // Send frameId
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to regenerate prompt');
      }

      const newPrompt = result.newPrompt;

      if (!newPrompt) {
         throw new Error('API did not return a new prompt.');
      }

      dispatch('regenerated', newPrompt);
      closeModal();

    } catch (err: any) {
      console.error('Prompt regeneration failed:', err);
      error = `Erro ao regenerar prompt: ${err.message || 'Erro desconhecido'}`;
    } finally {
      isLoading = false;
    }
  }

  // Handle Escape key
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isOpen) {
      closeModal();
    } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !isLoading) {
      // Ctrl+Enter or Cmd+Enter to submit
      handleRegenerate();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown}/>

{#if isOpen}
  <div class="modal fade show d-block" tabindex="-1" role="dialog" aria-modal="true" on:click|self={closeModal} transition:fade={{ duration: 150 }}>
    <div class="modal-dialog modal-dialog-centered" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
             Regenerar {assetType === 'narration' ? 'Narração' : assetType === 'bgm' ? 'Prompt de BGM' : 'Prompt de Imagem'}
             ({assetType === 'mainImage' ? 'Principal' : assetType === 'backgroundImage' ? 'Fundo' : assetType === 'bgm' ? 'BGM' : 'Narração'})
          </h5>
          <button type="button" class="btn-close" aria-label="Close" on:click={closeModal} disabled={isLoading}></button>
        </div>
        <div class="modal-body">
          {#if error}
            <div class="alert alert-danger alert-sm p-1 small" role="alert">
              {error}
            </div>
          {/if}

          <div class="mb-3">
            <label class="form-label small text-muted">Prompt Original:</label>
            <textarea class="form-control form-control-sm font-monospace" rows="4" readonly disabled>{originalPrompt}</textarea>
          </div>

          <div class="mb-1">
            <label for="modificationInstructions" class="form-label small">Instruções para Modificação:</label>
            <textarea
              id="modificationInstructions"
              class="form-control form-control-sm"
              rows="4"
              bind:value={modificationInstructions}
              placeholder={assetType === 'narration' ? 'Ex: deixe mais formal, adicione uma pausa, mude o tom...' : assetType === 'bgm' ? 'Ex: mais épico, estilo jazz, remover a bateria...' : 'Ex: adicione um gato preto, estilo cyberpunk, mais vibrante...'}
              disabled={isLoading}
            ></textarea>
             <small class="form-text text-muted">Descreva como você quer alterar o texto original.</small>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary btn-sm" on:click={closeModal} disabled={isLoading}>Cancelar</button>
          <button
            type="button"
            class="btn btn-primary btn-sm"
            on:click={handleRegenerate}
            disabled={isLoading}
          > <!-- Allow click even if instructions are empty -->
            {#if isLoading}
              <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              Regenerando...
            {:else}
              <i class="bi bi-magic me-1"></i> Regenerar {assetType === 'narration' ? 'Narração' : 'Prompt'}
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show" transition:fade={{ duration: 150 }}></div>
{/if}

<style>
  .modal {
    z-index: 1060; /* Ensure it's above other modals if necessary */
  }
  .modal-backdrop {
    z-index: 1055;
  }
  textarea[readonly] {
      background-color: #e9ecef; /* Standard Bootstrap disabled style */
      cursor: not-allowed;
  }
</style>
