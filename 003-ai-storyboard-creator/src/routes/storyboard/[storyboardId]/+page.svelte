<script lang="ts">
  import StoryboardFrameComponent from '$lib/components/StoryboardFrame.svelte';
  import CreationModal from '$lib/components/CreationModal.svelte';
  // Import the specific frame type if needed, or rely on PageData inference
  // import type { StoryboardFrameDb } from '$lib/types/storyboard';
  import type { PageData } from './$types'; // Import PageData type for this route
  import { invalidate } from '$app/navigation'; // For refreshing data for this specific page
  import { selectedVoice, ptBRVoices } from '$lib/stores/voiceStore'; // Import voice store and list
  import JSZip from 'jszip';
  import fileSaver from 'file-saver'; // Use default import
  import { onMount } from 'svelte';

  export let data: PageData; // Receive data from load function

  // data.storyboard should contain { id: string, name: string, createdAt: Date | null }
  // data.frames should be StoryboardFrameDb[] for this storyboard
  $: storyboard = data.storyboard;
  $: frames = data.frames || [];
  $: loadError = data.error; // Get potential error message from load

  let showModal = false;
  let isLoading = false; // State for API call loading (adding frames)
  let isExporting = false; // State for export loading
  let apiError: string | null = null; // State for API call errors
  let exportError: string | null = null; // State for export errors

  // Removed top-level const storyboardId

  onMount(() => {
    // Check directly from data prop inside onMount
    if (!data.storyboard?.id) {
      console.error("Storyboard ID not found in page data onMount!");
      // Handle error, maybe redirect or show message
    }
  });

  function openModal() {
    apiError = null; // Clear previous errors when opening modal
    showModal = true;
  }

  function closeModal() {
    showModal = false;
  }

  // Handles adding new frames to THIS storyboard
  async function handleAddFrames(event: CustomEvent) {
    // Get storyboardId directly from data when function is called
    const currentStoryboardId = data.storyboard?.id;
    if (!currentStoryboardId) {
      apiError = "Cannot add frames: Storyboard ID is missing.";
      return;
    }
    console.log('Add frames event received:', event.detail);
    isLoading = true;
    apiError = null;
    closeModal(); // Close modal immediately

    try {
      // Use the new endpoint, passing currentStoryboardId in the URL
      const response = await fetch(`/api/storyboard/${currentStoryboardId}/add-frame`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send prompts from modal (e.g., { storyPrompt: '...', title: '...' })
        body: JSON.stringify(event.detail),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API Error: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('API Response (Add Frames):', result);

      // Invalidate data for THIS page to trigger a refresh
      // Use the specific route ID for more targeted invalidation
      await invalidate((url) => url.pathname === `/storyboard/${currentStoryboardId}`);
      // The 'frames' variable will automatically update reactively

    } catch (err: any) {
      console.error('Failed to add frames to storyboard:', err);
      apiError = err.message || 'An unknown error occurred while adding frames.';
    } finally {
      isLoading = false;
    }
  }

  // Helper function to fetch asset and return as Blob (same as before)
  async function fetchAssetAsBlob(url: string): Promise<Blob | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch asset: ${url}, Status: ${response.status}`);
        return null;
      }
      return await response.blob();
    } catch (error) {
      console.error(`Error fetching asset ${url}:`, error);
      return null;
    }
  }

  // Helper function to get extension (same as before)
  function getExtension(url: string | null, blob: Blob | null): string {
      if (blob?.type) {
          const parts = blob.type.split('/');
          if (parts.length === 2) {
              if (parts[1] === 'mpeg') return '.mp3';
              if (parts[1] === 'jpeg') return '.jpg';
              return `.${parts[1]}`;
          }
      }
      if (url) {
          const match = url.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
          if (match) return `.${match[1]}`;
      }
      return '.bin';
  }

  // Exports frames for THIS storyboard
  async function exportStoryboardFrames() {
    if (isExporting || !frames || frames.length === 0 || !storyboard) return;

    isExporting = true;
    exportError = null;
    const zip = new JSZip();
    const safeStoryboardName = storyboard.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'storyboard';


    try {
      await Promise.all(frames.map(async (frame, index) => {
        // Use frameOrder if available and reliable, otherwise index
        const frameNumber = frame.frameOrder !== undefined ? frame.frameOrder + 1 : index + 1;
        const framePrefix = `Frame_${frameNumber.toString().padStart(3, '0')}`; // Pad for sorting

        if (frame.backgroundImageUrl) {
          const blob = await fetchAssetAsBlob(frame.backgroundImageUrl);
          if (blob) zip.file(`${framePrefix}_bg${getExtension(frame.backgroundImageUrl, blob)}`, blob);
        }
        if (frame.mainImageUrl) {
          const blob = await fetchAssetAsBlob(frame.mainImageUrl);
          if (blob) zip.file(`${framePrefix}_main${getExtension(frame.mainImageUrl, blob)}`, blob);
        }
        if (frame.narrationAudioUrl) {
          const blob = await fetchAssetAsBlob(frame.narrationAudioUrl);
          if (blob) zip.file(`${framePrefix}_narration${getExtension(frame.narrationAudioUrl, blob)}`, blob);
        }
        if (frame.bgmUrl) {
          const blob = await fetchAssetAsBlob(frame.bgmUrl);
          if (blob) zip.file(`${framePrefix}_bgm${getExtension(frame.bgmUrl, blob)}`, blob);
        }
        // Removed metadata JSON file creation and addition

      }));

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      fileSaver.saveAs(zipBlob, `${safeStoryboardName}_export.zip`);

    } catch (err: any) {
      console.error('Failed to export storyboard:', err);
      exportError = `Export failed: ${err.message || 'Unknown error'}`;
    } finally {
      isExporting = false;
    }
  }

</script>

<svelte:head>
  <title>Storyboard: {storyboard?.name || 'Loading...'}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
</svelte:head>

<div class="container mt-4">
  <!-- Header Row -->
  <div class="d-flex justify-content-between align-items-center mb-4">
    <h1 class="mb-0">
      <a href="/" class="text-decoration-none me-2" title="Back to Storyboards List" aria-label="Back to Storyboards List"><i class="bi bi-arrow-left-circle"></i></a>
      Storyboard: {storyboard?.name || 'Loading...'}
      <!-- Add edit name button here later -->
    </h1>
    <div class="d-flex align-items-center">
      <!-- Voice Selection Dropdown -->
      <div class="me-3">
        <label for="voiceSelect" class="form-label visually-hidden">Voz da Narração</label>
        <select id="voiceSelect" class="form-select form-select-sm" bind:value={$selectedVoice}>
          {#each ptBRVoices as voice}
            <option value={voice.value}>{voice.name}</option>
          {/each}
        </select>
      </div>

      <button class="btn btn-success me-2" on:click={openModal} disabled={isLoading || isExporting}>
        <i class="bi bi-film me-1"></i> Adicionar Quadros
      </button>
      <button class="btn btn-outline-secondary" on:click={exportStoryboardFrames} disabled={isExporting || isLoading || frames.length === 0}>
        {#if isExporting}
          <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          Exportando...
        {:else}
          <i class="bi bi-box-arrow-up me-1"></i> Exportar Storyboard
        {/if}
      </button>
    </div>
  </div>

  <!-- Loading Indicator for adding frames -->
  {#if isLoading}
    <div class="d-flex justify-content-center my-3">
      <div class="spinner-border text-success" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
       <span class="ms-2">Gerando e adicionando quadros...</span>
    </div>
  {/if}

  <!-- Export Error Display -->
   {#if exportError}
       <div class="alert alert-danger alert-dismissible fade show" role="alert">
         {exportError}
         <button type="button" class="btn-close" on:click={() => exportError = null} aria-label="Close"></button>
       </div>
   {/if}

  <!-- API Error Display -->
   {#if apiError}
       <div class="alert alert-danger alert-dismissible fade show" role="alert">
         {apiError}
         <button type="button" class="btn-close" on:click={() => apiError = null} aria-label="Close"></button>
       </div>
   {/if}

  <!-- Load Error Display -->
   {#if loadError}
       <div class="alert alert-warning" role="alert">
         {loadError}
       </div>
   {/if}


  <!-- Storyboard Frames List -->
  <div class="mb-3">
    {#if frames.length > 0}
      <!-- Render frames sorted by frameOrder -->
      {#each frames.sort((a, b) => (a.frameOrder ?? 0) - (b.frameOrder ?? 0)) as frame (frame.id)}
        <StoryboardFrameComponent frame={frame} />
      {/each}
    {:else if !loadError && !isLoading}
      <p class="text-center text-muted">Nenhum quadro criado ainda para este storyboard. Clique em "Adicionar Quadros" para começar.</p>
    {/if}
  </div>

  <!-- Add Button (alternative trigger) -->
   <div class="text-center mb-4">
     <button class="btn btn-outline-success" on:click={openModal} disabled={isLoading || isExporting}>
       + Adicionar Quadros
     </button>
   </div>

</div>

<!-- Creation Modal (used for adding frames now) -->
<!-- Pass storyboardId or other context if modal needs it -->
<CreationModal bind:show={showModal} on:close={closeModal} on:create={handleAddFrames} />
