<script lang="ts">
  import StoryboardFrameComponent from '$lib/components/StoryboardFrame.svelte';
  import CreationModal from '$lib/components/CreationModal.svelte';
  import type { StoryboardFrameDb } from '$lib/types/storyboard'; // Use the DB schema type
  import type { PageData } from './$types'; // Import PageData type
  import { invalidateAll } from '$app/navigation'; // For refreshing data
  import { selectedVoice, ptBRVoices } from '$lib/stores/voiceStore'; // Import voice store and list
  import JSZip from 'jszip';
  import fileSaver from 'file-saver'; // Use default import

  export let data: PageData; // Receive data from load function
  // data.frames should already be StoryboardFrameDb[] from the load function
  $: frames = data.frames || [];
  $: loadError = data.error; // Get potential error message from load

  let showModal = false;
  let isLoading = false; // State for API call loading
  let isExporting = false; // State for export loading
  let apiError: string | null = null; // State for API call errors
  let exportError: string | null = null; // State for export errors

  function openModal() {
    apiError = null; // Clear previous errors when opening modal
    showModal = true;
  }

  function closeModal() {
    showModal = false;
  }

  async function handleCreateFrame(event: CustomEvent) {
    console.log('Create frame event received:', event.detail);
    isLoading = true;
    apiError = null;
    closeModal(); // Close modal immediately

    try {
      const response = await fetch('/api/storyboard/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event.detail), // Send prompts from modal
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API Error: ${response.statusText}`);
      }

      // API now returns a success message, not the frame data
      const result = await response.json(); // Read the success message
      console.log('API Response:', result);

      // Invalidate all loaded data to trigger a refresh from the server load function
      await invalidateAll();
      // The 'frames' variable will automatically update reactively when 'data' changes

    } catch (err: any) {
      console.error('Failed to create storyboard:', err);
      apiError = err.message || 'An unknown error occurred while creating the frame.';
      // Optionally re-open modal on error? Or show error message elsewhere.
      // showModal = true;
    } finally {
      isLoading = false;
    }
  }

  // Helper function to fetch asset and return as Blob
  async function fetchAssetAsBlob(url: string): Promise<Blob | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch asset: ${url}, Status: ${response.status}`);
        return null; // Skip if fetch fails
      }
      return await response.blob();
    } catch (error) {
      console.error(`Error fetching asset ${url}:`, error);
      return null; // Skip on network or other errors
    }
  }

  // Helper function to get extension from URL or MIME type
  function getExtension(url: string | null, blob: Blob | null): string {
      if (blob?.type) {
          const parts = blob.type.split('/');
          if (parts.length === 2) {
              // Basic mapping, can be expanded
              if (parts[1] === 'mpeg') return '.mp3';
              if (parts[1] === 'jpeg') return '.jpg';
              return `.${parts[1]}`; // e.g., .png, .gif
          }
      }
      // Fallback: try guessing from URL
      if (url) {
          const match = url.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
          if (match) return `.${match[1]}`;
      }
      // Default if unable to determine
      return '.bin';
  }


  async function exportAllFrames() {
    if (isExporting || !frames || frames.length === 0) return;

    isExporting = true;
    exportError = null;
    const zip = new JSZip();

    try {
      // Use Promise.all to fetch assets concurrently for efficiency
      await Promise.all(frames.map(async (frame, index) => {
        const frameNumber = index + 1;

        // Fetch and add background image
        if (frame.backgroundImageUrl) {
          const blob = await fetchAssetAsBlob(frame.backgroundImageUrl);
          if (blob) {
            const extension = getExtension(frame.backgroundImageUrl, blob);
            zip.file(`Frame_${frameNumber}_bg${extension}`, blob);
          }
        }

        // Fetch and add main image
        if (frame.mainImageUrl) {
          const blob = await fetchAssetAsBlob(frame.mainImageUrl);
          if (blob) {
             const extension = getExtension(frame.mainImageUrl, blob);
             zip.file(`Frame_${frameNumber}_main${extension}`, blob);
          }
        }

        // Fetch and add narration audio
        if (frame.narrationAudioUrl) {
          const blob = await fetchAssetAsBlob(frame.narrationAudioUrl);
           if (blob) {
             const extension = getExtension(frame.narrationAudioUrl, blob); // Assume mp3 if unknown
             zip.file(`Frame_${frameNumber}_narration${extension}`, blob);
           }
        }

        // Fetch and add BGM audio
        if (frame.bgmUrl) {
          const blob = await fetchAssetAsBlob(frame.bgmUrl);
           if (blob) {
             const extension = getExtension(frame.bgmUrl, blob); // Assume mp3 if unknown
             zip.file(`Frame_${frameNumber}_bgm${extension}`, blob);
           }
        }
      }));

      // Generate the zip file and trigger download
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      fileSaver.saveAs(zipBlob, 'storyboard_export.zip'); // Use default import object

    } catch (err: any) {
      console.error('Failed to export storyboard:', err);
      exportError = `Export failed: ${err.message || 'Unknown error'}`;
    } finally {
      isExporting = false;
    }
  }

</script>

<div class="container mt-4">
  <!-- Header Row -->
  <div class="d-flex justify-content-between align-items-center mb-4">
    <h1 class="mb-0">AI Storyboard Creator</h1>
    <div class="d-flex align-items-center"> <!-- Wrap controls for alignment -->
      <!-- Voice Selection Dropdown -->
      <div class="me-3"> <!-- Add margin to the right -->
        <label for="voiceSelect" class="form-label visually-hidden">Voz da Narração</label> <!-- Hidden label for accessibility -->
        <select id="voiceSelect" class="form-select form-select-sm" bind:value={$selectedVoice}>
          {#each ptBRVoices as voice}
            <option value={voice.value}>{voice.name}</option>
          {/each}
        </select>
      </div>

      <button class="btn btn-primary me-2" on:click={openModal} disabled={isLoading || isExporting}>
        <i class="bi bi-plus-lg me-1"></i> Criar Novo
      </button>
      <button class="btn btn-outline-secondary" on:click={exportAllFrames} disabled={isExporting || isLoading || frames.length === 0}>
        {#if isExporting}
          <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          Exportando...
        {:else}
          <i class="bi bi-box-arrow-up me-1"></i> Exportar Tudo
        {/if}
      </button>
    </div>
  </div>

  <!-- Loading Indicator -->
  {#if isLoading}
    <div class="d-flex justify-content-center my-3">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
       <span class="ms-2">Gerando quadro...</span>
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
      {#each frames as frame (frame.id)} <!-- Use frame.id for the key -->
        <StoryboardFrameComponent frame={frame} /> <!-- Pass frame data as prop -->
      {/each}
    {:else}
      <p class="text-center text-muted">Nenhum quadro criado ainda. Clique em "Criar Novo" para começar.</p>
    {/if}
  </div>

  <!-- Add Button (alternative trigger) -->
   <div class="text-center mb-4">
     <button class="btn btn-outline-primary" on:click={openModal}>
       + Adicionar Quadro
     </button>
   </div>

</div>

<!-- Creation Modal -->
<CreationModal bind:show={showModal} on:close={closeModal} on:create={handleCreateFrame} />

<!-- Add Bootstrap Icons CSS (if not already globally included) -->
<svelte:head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
</svelte:head>
