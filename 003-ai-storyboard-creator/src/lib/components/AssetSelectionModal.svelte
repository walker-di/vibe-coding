<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';

  export let isOpen = false;
  export let assetType: 'mainImage' | 'backgroundImage' | 'bgm'; // Determines which assets to load

  let assets: string[] = [];
  let isLoading = false; // Loading existing assets
  let error: string | null = null; // Error loading existing assets or general errors
  let selectedAsset: string | null = null;
  let isUploading = false; // Uploading new asset
  let uploadError: string | null = null; // Error specific to uploading new asset

  const dispatch = createEventDispatcher<{ close: void; select: string }>();

  async function fetchAssets() {
    if (!isOpen) return; // Don't fetch if modal is closed

    isLoading = true;
    error = null; // Clear general errors
    uploadError = null; // Clear upload errors
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
      // Don't set error if assets are empty, just show the message in the template
      // if (assets.length === 0) {
      //   error = `Nenhum arquivo encontrado no diretório para '${typeParam}'. Verifique 'static/${typeParam === 'image' ? 'images' : 'audio/bgm'}'.`;
      // }
    } catch (err: any) {
      console.error(`Failed to fetch assets for type ${typeParam}:`, err);
      error = `Erro ao carregar arquivos existentes: ${err.message || 'Erro desconhecido'}`;
      assets = []; // Ensure assets is empty on error
    } finally {
      isLoading = false;
    }
  }

  // Handles selecting an *existing* asset from the list
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

  // Handles the file input change event for uploads
  async function handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return; // No file selected
    }

    const file = input.files[0];
    isUploading = true;
    uploadError = null; // Clear previous upload error
    error = null; // Clear previous listing errors

    const formData = new FormData();
    formData.append('file', file);
    // Map component assetType to API assetType ('mainImage'/'backgroundImage' -> 'image')
    const apiAssetType = assetType === 'bgm' ? 'bgm' : 'image';
    formData.append('assetType', apiAssetType);

    try {
      const response = await fetch('/api/upload-asset', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        // Use message from API response if available
        throw new Error(result.message || `Upload failed with status: ${response.status}`);
      }

      // Upload successful, dispatch select event with the new path and close
      console.log(`Upload successful. Selecting file: ${result.filePath}`);
      dispatch('select', result.filePath);
      closeModal();

    } catch (err: any) {
      console.error('Upload failed:', err);
      uploadError = `Erro no upload: ${err.message || 'Erro desconhecido'}`;
    } finally {
      isUploading = false;
      // Reset file input value so the same file can be selected again if needed
      if (input) {
          input.value = '';
      }
    }
  }

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
              <p>Carregando arquivos existentes...</p>
            </div>
          {:else if error}
             <!-- Show general error if present -->
            <div class="alert alert-warning" role="alert">
              {error}
            </div>
          {/if}

          <!-- Display existing assets list -->
          {#if !isLoading && assets.length > 0}
            <p>Selecione um arquivo existente:</p>
            <div class="list-group mb-3">
              {#each assets as asset (asset)}
                <button
                  type="button"
                  class="list-group-item list-group-item-action d-flex align-items-center {selectedAsset === asset ? 'active' : ''}"
                  on:click={() => handleSelect(asset)}
                  aria-current={selectedAsset === asset}
                  disabled={isUploading}
                >
                  {#if assetType !== 'bgm'}
                    <!-- Image Preview -->
                    <img src={asset} alt="Preview" style="width: 50px; height: auto; object-fit: cover; margin-right: 10px; border: 1px solid #ddd;">
                  {/if}
                  <span class="flex-grow-1">{asset}</span>
                   {#if selectedAsset === asset}
                     <i class="bi bi-check-circle-fill ms-2"></i>
                   {/if}
                </button> <!-- Disable selection while uploading -->
              {/each}
            </div>
          {:else if !isLoading && !error}
             <!-- Show message if no existing assets and no error -->
             <p>Nenhum arquivo existente encontrado.</p>
          {/if}
          <!-- Upload section removed from body -->
        </div>
        <div class="modal-footer d-flex justify-content-between align-items-center">
           <!-- Error display moved to footer -->
           <div style="flex-grow: 1; text-align: left;">
             {#if uploadError}
               <small class="text-danger">{uploadError}</small>
             {/if}
           </div>
           <!-- Hidden File Input (can be placed anywhere, logically here is fine) -->
           <input
             type="file"
             id="assetUploadInput"
             class="d-none"
             accept={assetType === 'bgm' ? 'audio/*' : 'image/*'}
             on:change={handleFileUpload}
             disabled={isUploading}
           />
           <!-- Upload Button Label -->
           <label for="assetUploadInput" class="btn btn-success btn-sm me-2" class:disabled={isUploading}>
             {#if isUploading}
               <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
               Enviando...
             {:else}
               <i class="bi bi-upload me-1"></i> Enviar do PC
             {/if}
           </label>
           <button type="button" class="btn btn-secondary btn-sm" on:click={closeModal} disabled={isUploading}>Cancelar</button>
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
  /* Style for disabled label button */
  label.btn.disabled {
      pointer-events: none;
      opacity: 0.65;
  }
</style>
