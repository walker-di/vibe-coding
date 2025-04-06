<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';

  export let isOpen = false;
  export let assetType: 'mainImage' | 'backgroundImage' | 'bgm'; // Determines which assets to load

  let assets: string[] = [];
  let isLoading = false;
  let error: string | null = null;
  let selectedAsset: string | null = null;

  const dispatch = createEventDispatcher<{ close: void; select: string }>();

  async function fetchAssets() {
    if (!isOpen) return; // Don't fetch if modal is closed

    isLoading = true;
    error = null;
    assets = [];
    selectedAsset = null;
    console.log(`Modal opened for asset type: ${assetType}. Fetching assets...`);

    const typeParam = assetType === 'bgm' ? 'bgm' : 'image'; // Map component type to API type

    try {
      const response = await fetch(`/api/list-assets?type=${typeParam}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: `API Error: ${response.statusText}` }));
        throw new Error(errData.message || `API Error: ${response.statusText}`);
      }
      const data = await response.json();
      assets = data.assets || [];
      console.log(`Assets loaded for type '${typeParam}':`, assets);
      if (assets.length === 0) {
        error = `Nenhum arquivo encontrado no diretório para '${typeParam}'. Verifique 'static/${typeParam === 'image' ? 'images' : 'audio/bgm'}'.`;
      }
    } catch (err: any) {
      console.error(`Failed to fetch assets for type ${typeParam}:`, err);
      error = `Erro ao carregar arquivos: ${err.message || 'Erro desconhecido'}`;
      assets = []; // Ensure assets is empty on error
    } finally {
      isLoading = false;
    }
  }

  function handleSelect(assetPath: string) {
    selectedAsset = assetPath;
    // Confirm selection immediately upon clicking an item
    confirmSelection();
  }

  function confirmSelection() {
    if (selectedAsset) {
      dispatch('select', selectedAsset);
      closeModal();
    }
  }

  function closeModal() {
    dispatch('close');
  }

  // Fetch assets when the modal becomes open
  $: if (isOpen) {
    fetchAssets();
  }

  // Handle Escape key to close modal
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isOpen) {
      closeModal();
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
  });

</script>

<!-- Handle keydown globally when component is mounted -->
<svelte:window on:keydown={handleKeydown}/>

{#if isOpen}
  <div class="modal fade show d-block" tabindex="-1" role="dialog" aria-modal="true" on:click|self={closeModal} transition:fade={{ duration: 150 }}>
    <div class="modal-dialog modal-lg modal-dialog-scrollable" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Selecionar {assetType === 'bgm' ? 'Música de Fundo (BGM)' : 'Imagem'}</h5>
          <button type="button" class="btn-close" aria-label="Close" on:click={closeModal}></button>
        </div>
        <div class="modal-body">
          {#if isLoading}
            <div class="text-center">
              <div class="spinner-border" role="status">
                <span class="visually-hidden">Carregando...</span>
              </div>
              <p>Carregando arquivos...</p>
            </div>
          {:else if error}
            <div class="alert alert-warning" role="alert">
              {error}
            </div>
          {:else if assets.length > 0}
            <p>Selecione um arquivo:</p>
            <div class="list-group">
              {#each assets as asset (asset)}
                <button
                  type="button"
                  class="list-group-item list-group-item-action d-flex align-items-center {selectedAsset === asset ? 'active' : ''}"
                  on:click={() => handleSelect(asset)}
                  aria-current={selectedAsset === asset}
                >
                  {#if assetType !== 'bgm'}
                    <!-- Image Preview -->
                    <img src={asset} alt="Preview" style="width: 50px; height: auto; object-fit: cover; margin-right: 10px; border: 1px solid #ddd;">
                  {/if}
                  <span class="flex-grow-1">{asset}</span>
                   {#if selectedAsset === asset}
                     <i class="bi bi-check-circle-fill ms-2"></i>
                   {/if}
                </button>
              {/each}
            </div>
          {:else}
             <!-- This case should be covered by the error message when assets are empty -->
             <p>Nenhum arquivo encontrado.</p>
          {/if}
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" on:click={closeModal}>Cancelar</button>
        </div>
      </div>
    </div> 
  </div>
  <div class="modal-backdrop fade show" transition:fade={{ duration: 150 }}></div>
{/if}

<style>
  /* Ensure modal appears above other content */
  .modal {
    z-index: 1050; /* Default Bootstrap modal z-index */
  }
  .modal-backdrop {
    z-index: 1040; /* Below modal but above other content */
  }
  .list-group-item img {
     max-height: 40px; /* Limit preview height */
  }
</style>
