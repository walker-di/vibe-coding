<script lang="ts">
  import StoryboardFrameComponent from '$lib/components/StoryboardFrame.svelte';
  import CreationModal from '$lib/components/CreationModal.svelte';
  import TransitionModal from '$lib/components/TransitionModal.svelte'; // Import the new modal
  // Import the specific frame type including transition fields
  import type { StoryboardFrameDb } from '$lib/types/storyboard';
  import type { PageData } from './$types'; // Import PageData type for this route
  import { invalidate } from '$app/navigation'; // For refreshing data for this specific page
  import { selectedVoice, ptBRVoices } from '$lib/stores/voiceStore'; // Import voice store and list
  import JSZip from 'jszip'; // Re-add JSZip for ZIP export
  import { onMount } from 'svelte';

  export let data: PageData; // Receive data from load function

  // data.storyboard should contain { id: string, name: string, createdAt: Date | null }
  // data.frames should be StoryboardFrameDb[] for this storyboard including transition fields
  $: storyboard = data.storyboard;
  // Ensure frames is mutable if we update it directly after saving transition
  let frames: StoryboardFrameDb[] = data.frames ? [...data.frames] : [];
  $: loadError = data.error; // Get potential error message from load

  // Update frames when data prop changes (e.g., after invalidation)
   $: if (data.frames) {
       frames = [...data.frames];
   }

  let showCreationModal = false; // Renamed for clarity
  let showTransitionModal = false; // State for the new modal
  let isLoading = false; // State for AI frame generation/addition
  let isInsertingFrame = false; // State for inserting a single blank frame
  let isDeletingFrame = false; // State for deleting a frame
  let isSavingTransition = false; // State for saving transition API call
  let isExportingFrames = false; // State for individual frame export loading
  let isExportingZip = false; // Added state for ZIP export loading
  let isExportingUnified = false; // State for unified video export loading
  let apiError: string | null = null; // State for API call errors
  let exportError: string | null = null; // State for export errors (can be shared or separated)
  let exportProgress = 0; // Generic progress for backend frame export (0 to 1)
  let exportLogMessages: string[] = []; // Generic logs for backend frame export

  // Store individual frame durations (Still needed for filtering)
  let frameDurations: { [key: string]: number } = {};

  // State for passing data to TransitionModal
  let modalCurrentFrameId: string | null = null;
  let modalNextFrameId: string | null = null;
  let modalInitialType: string = 'none';
  let modalInitialDuration: number = 1.0;

  // Calculate total duration reactively
  $: totalDuration = Object.values(frameDurations).reduce((sum, duration) => sum + (duration || 0), 0);

  onMount(async () => {
    // Check directly from data prop inside onMount
    if (!data.storyboard?.id) {
      console.error("Storyboard ID not found in page data onMount!");
    }
  });

  function openCreationModal() {
    apiError = null; // Clear previous errors when opening modal
    showCreationModal = true;
  }

  function closeCreationModal() {
    showCreationModal = false;
  }

  function openTransitionModal(currentFrame: StoryboardFrameDb, nextFrame: StoryboardFrameDb) {
    if (!currentFrame || !nextFrame) return;
    apiError = null; // Clear errors
    modalCurrentFrameId = currentFrame.id;
    modalNextFrameId = nextFrame.id;
    // Use existing values from the current frame (transition happens *after* this frame)
    modalInitialType = currentFrame.transitionTypeAfter || 'none';
    modalInitialDuration = currentFrame.transitionDurationAfter ?? 1.0;
    showTransitionModal = true;
  }

  function closeTransitionModal() {
    showTransitionModal = false;
    // Reset modal state just in case
    modalCurrentFrameId = null;
    modalNextFrameId = null;
  }

  // Function to handle duration change event from child components
  function handleDurationChange(event: CustomEvent<{ id: string, duration: number }>) {
    const { id, duration } = event.detail;
    if (id && typeof duration === 'number' && isFinite(duration)) {
      frameDurations = { ...frameDurations, [id]: duration };
    }
  }

  // Function to handle deleting a specific frame
  async function handleDeleteFrame(event: CustomEvent<{ id: string }>) {
    const frameIdToDelete = event.detail.id;
    const currentStoryboardId = data.storyboard?.id;

    if (!frameIdToDelete || !currentStoryboardId) {
      apiError = "Cannot delete frame: Frame ID or Storyboard ID is missing.";
      return;
    }

    // Simple confirmation dialog
    if (!window.confirm(`Tem certeza que deseja excluir o quadro ${frameIdToDelete.substring(0, 8)}...? Esta ação não pode ser desfeita.`)) {
      return;
    }

    console.log(`Requesting to delete frame: ${frameIdToDelete}`);
    isDeletingFrame = true;
    apiError = null;

    try {
      const response = await fetch(`/api/storyboard/${currentStoryboardId}/frame/${frameIdToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `API Error: ${response.statusText}` }));
        throw new Error(errorData.message || `API Error: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('API Response (Delete Frame):', result);
      // Invalidate data for this page to refresh the frame list
      await invalidate((url) => url.pathname === `/storyboard/${currentStoryboardId}`);

    } catch (err: any) {
      console.error('Failed to delete frame:', err);
      apiError = err.message || 'An unknown error occurred while deleting the frame.';
    } finally {
      isDeletingFrame = false;
    }
  }

  // Function to handle inserting a blank frame after a specific frame
  async function handleAddFrameAfter(frameIdToInsertAfter: string) {
    const currentStoryboardId = data.storyboard?.id;
    if (!currentStoryboardId || !frameIdToInsertAfter) {
      apiError = "Cannot insert frame: Storyboard ID or previous Frame ID is missing.";
      return;
    }
    console.log(`Requesting to insert blank frame after: ${frameIdToInsertAfter}`);
    isInsertingFrame = true;
    apiError = null;

    try {
      const response = await fetch(`/api/storyboard/${currentStoryboardId}/add-frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insertAfterFrameId: frameIdToInsertAfter }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `API Error: ${response.statusText}` }));
        throw new Error(errorData.message || `API Error: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('API Response (Insert Blank Frame):', result);
      // Invalidate data for this page to refresh the frame list
      await invalidate((url) => url.pathname === `/storyboard/${currentStoryboardId}`);

    } catch (err: any) {
      console.error('Failed to insert blank frame:', err);
      apiError = err.message || 'An unknown error occurred while inserting the frame.';
    } finally {
      isInsertingFrame = false;
    }
  }


  // Function to format seconds into MM:SS
  function formatDuration(seconds: number | null | undefined): string {
    if (seconds === null || seconds === undefined || !isFinite(seconds)) {
      return '--:--';
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Handles adding new frames to THIS storyboard
  async function handleAddFrames(event: CustomEvent) {
    const currentStoryboardId = data.storyboard?.id;
    if (!currentStoryboardId) {
      apiError = "Cannot add frames: Storyboard ID is missing.";
      return;
    }
    console.log('Add frames event received:', event.detail);
    isLoading = true;
    apiError = null;
    closeCreationModal(); // Close modal immediately

    try {
      const response = await fetch(`/api/storyboard/${currentStoryboardId}/add-frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event.detail),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API Error: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('API Response (Add Frames):', result);
      await invalidate((url) => url.pathname === `/storyboard/${currentStoryboardId}`);

    } catch (err: any) {
      console.error('Failed to add frames to storyboard:', err);
      apiError = err.message || 'An unknown error occurred while adding frames.';
    } finally {
      isLoading = false;
    }
  }

  // Helper function to fetch asset and return as Blob - KEEP for ZIP export
  async function fetchAssetAsBlobForZip(url: string): Promise<Blob | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch asset for ZIP: ${url}, Status: ${response.status}`);
        return null;
      }
      return await response.blob();
    } catch (error) {
      console.error(`Error fetching asset for ZIP ${url}:`, error);
      return null;
    }
  }

  // Helper function to get extension
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

  // ZIP export function
  async function exportStoryboardFrames() {
    if (isExportingZip || !frames || frames.length === 0 || !storyboard) return;

    isExportingZip = true;
    exportError = null;
    const zip = new JSZip();
    const safeStoryboardName = storyboard.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'storyboard';

    try {
      await Promise.all(frames.map(async (frame, index) => {
        const frameNumber = frame.frameOrder !== undefined ? frame.frameOrder + 1 : index + 1;
        const framePrefix = `Frame_${frameNumber.toString().padStart(3, '0')}`;

        if (frame.backgroundImageUrl) {
          const blob = await fetchAssetAsBlobForZip(frame.backgroundImageUrl);
          if (blob) zip.file(`${framePrefix}_bg${getExtension(frame.backgroundImageUrl, blob)}`, blob);
        }
        if (frame.mainImageUrl) {
          const blob = await fetchAssetAsBlobForZip(frame.mainImageUrl);
          if (blob) zip.file(`${framePrefix}_main${getExtension(frame.mainImageUrl, blob)}`, blob);
        }
        if (frame.narrationAudioUrl) {
          const blob = await fetchAssetAsBlobForZip(frame.narrationAudioUrl);
          if (blob) zip.file(`${framePrefix}_narration${getExtension(frame.narrationAudioUrl, blob)}`, blob);
        }
        if (frame.bgmUrl) {
          const blob = await fetchAssetAsBlobForZip(frame.bgmUrl);
          if (blob) zip.file(`${framePrefix}_bgm${getExtension(frame.bgmUrl, blob)}`, blob);
        }
      }));

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${safeStoryboardName}_export.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err: any) {
      console.error('Failed to export storyboard ZIP:', err);
      exportError = `ZIP Export failed: ${err.message || 'Unknown error'}`;
    } finally {
      isExportingZip = false;
    }
  }

  // Function to export individual frames using the backend API
  async function exportIndividualFrames() {
    console.log("--- exportIndividualFrames START (Backend) ---");
    exportLogMessages = ['--- exportIndividualFrames START (Backend) ---'];

    if (isExportingFrames || !frames || frames.length === 0 || !storyboard) {
        console.log(`Frame export skipped: isExportingFrames=${isExportingFrames}, frames=${frames?.length}, storyboard=${!!storyboard}`);
        if (!frames || frames.length === 0) exportError = "No frames to export.";
        return;
    }

    isExportingFrames = true;
    exportError = null;
    exportProgress = 0;
    exportLogMessages = ['Starting backend individual frame export...'];
    const safeStoryboardName = storyboard.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'storyboard';

    try {
      const validFrames = frames
        .filter(f => f.narrationAudioUrl && frameDurations[f.id] && frameDurations[f.id] > 0)
        .sort((a, b) => (a.frameOrder ?? Infinity) - (b.frameOrder ?? Infinity));

      if (validFrames.length === 0) throw new Error("No frames with narration and duration found to export.");

      exportLogMessages = [...exportLogMessages, `Found ${validFrames.length} valid frames to process.`];
      console.log(`Starting backend frame export loop for ${validFrames.length} frames.`);

      for (let i = 0; i < validFrames.length; i++) {
        const frame = validFrames[i];
        const frameIndex = i;
        const frameLogPrefix = `Frame ${frameIndex + 1}/${validFrames.length} (ID: ${frame.id.substring(0, 6)}):`;
        exportLogMessages = [...exportLogMessages, `${frameLogPrefix} Requesting backend generation...`];
        exportProgress = (i / validFrames.length);

        try {
          console.log(`${frameLogPrefix} Calling API: /api/storyboard/${storyboard.id}/export-frame/${frame.id}`);
          const response = await fetch(`/api/storyboard/${storyboard.id}/export-frame/${frame.id}`);

          if (!response.ok) {
            let errorMsg = `API Error (${response.status}): ${response.statusText}`;
            try { const errorData = await response.json(); errorMsg = errorData.message || errorMsg; } catch (e) { /* Ignore */ }
            throw new Error(errorMsg);
          }

          const segmentBlob = await response.blob();
          console.log(`${frameLogPrefix} Received video blob from backend (size: ${segmentBlob.size})`);
          exportLogMessages = [...exportLogMessages, `${frameLogPrefix} Received video from backend. Downloading...`];

          const frameOutputFilename = `${safeStoryboardName}_frame_${frameIndex + 1}.mp4`;
          const frameUrl = URL.createObjectURL(segmentBlob);
          const frameA = document.createElement('a');
          frameA.style.display = 'none';
          frameA.href = frameUrl;
          frameA.download = frameOutputFilename;
          document.body.appendChild(frameA);
          frameA.click();
          document.body.removeChild(frameA);
          URL.revokeObjectURL(frameUrl);
          console.log(`${frameLogPrefix} Download initiated for ${frameOutputFilename}.`);
          exportLogMessages = [...exportLogMessages, `${frameLogPrefix} Download initiated for ${frameOutputFilename}.`];

        } catch (frameErr: any) {
          console.error(`${frameLogPrefix} Error processing frame via backend:`, frameErr);
          exportLogMessages = [...exportLogMessages, `${frameLogPrefix} Error: ${frameErr.message}`];
          exportError = `Error exporting frame ${frameIndex + 1}: ${frameErr.message}`;
          continue;
        }
      }

      console.log(`Frame loop finished.`);
      exportLogMessages = [...exportLogMessages, `Frame loop finished. Individual frame downloads initiated.`];
      exportProgress = 1;

    } catch (err: any) {
      console.error('Failed during frame export process:', err);
      exportError = `Individual frame export failed: ${err.message || 'Unknown error'}`;
      exportLogMessages = [...exportLogMessages, `Error: ${exportError}`];
    } finally {
      isExportingFrames = false;
      console.log("--- exportIndividualFrames END (Backend) ---");
      exportLogMessages = [...exportLogMessages, '--- exportIndividualFrames END (Backend) ---'];
    }
  }

  // Handles saving transition settings from the modal
  async function handleSaveTransition(event: CustomEvent<{ frameId: string; transitionType: string; transitionDuration: number }>) {
    const { frameId, transitionType, transitionDuration } = event.detail;
    const currentStoryboardId = data.storyboard?.id;

    if (!frameId || !currentStoryboardId) {
      apiError = "Cannot save transition: Frame ID or Storyboard ID is missing.";
      return;
    }

    isSavingTransition = true;
    apiError = null;

    try {
      console.log(`Saving transition for frame ${frameId}: ${transitionType}, ${transitionDuration}s`);
      const response = await fetch(`/api/storyboard/${currentStoryboardId}/frame/${frameId}/update-transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transitionType, transitionDuration }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API Error: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('API Response (Update Transition):', result);

      // Update local state immediately
      const frameIndex = frames.findIndex(f => f.id === frameId);
      if (frameIndex !== -1) {
        frames[frameIndex] = { ...frames[frameIndex], transitionTypeAfter: transitionType, transitionDurationAfter: transitionDuration };
        frames = [...frames]; // Trigger reactivity
        console.log('Local frame data updated for transition.');
      } else {
         console.warn(`Frame ${frameId} not found in local state after saving transition.`);
      }

      closeTransitionModal(); // Close modal on success

    } catch (err: any) {
      console.error('Failed to save transition settings:', err);
      apiError = err.message || 'An unknown error occurred while saving transition.';
    } finally {
      isSavingTransition = false;
    }
  }

  // Function to export the unified video using the backend API
  async function exportUnifiedVideo() {
    console.log("--- exportUnifiedVideo START (Backend) ---");

    if (isExportingUnified || isExportingFrames || isExportingZip || !frames || frames.length === 0 || !storyboard) {
      console.log(`Unified export skipped: isExportingUnified=${isExportingUnified}, isExportingFrames=${isExportingFrames}, isExportingZip=${isExportingZip}, frames=${frames?.length}, storyboard=${!!storyboard}`);
      if (!frames || frames.length === 0) exportError = "No frames to export.";
      return;
    }

    isExportingUnified = true;
    exportError = null;
    const safeStoryboardName = storyboard.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'storyboard';

    try {
      console.log(`Calling API: /api/storyboard/${storyboard.id}/export-unified`);
      // Pass transition info if needed in future (currently backend reads DB)
      const response = await fetch(`/api/storyboard/${storyboard.id}/export-unified`);

      if (!response.ok) {
        let errorMsg = `API Error (${response.status}): ${response.statusText}`;
        try { const errorData = await response.json(); errorMsg = errorData.message || errorMsg; } catch (e) { /* Ignore */ }
        throw new Error(errorMsg);
      }

      const videoBlob = await response.blob();
      console.log(`Received unified video blob from backend (size: ${videoBlob.size})`);

      const outputFilename = `${safeStoryboardName}_unified.mp4`;
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = outputFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log(`Download initiated for ${outputFilename}.`);

    } catch (err: any) {
      console.error('Failed during unified video export process:', err);
      exportError = `Unified Video export failed: ${err.message || 'Unknown error'}`;
    } finally {
      isExportingUnified = false;
      console.log("--- exportUnifiedVideo END (Backend) ---");
    }
  }

</script>

<svelte:head>
  <title>Storyboard: {storyboard?.name || 'Loading...'}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
</svelte:head>

<div class="container mt-4">
  <!-- Header Row -->
  <div class="d-flex justify-content-between align-items-center mb-2">
    <h1 class="mb-0">
      <a href="/" class="text-decoration-none me-2" title="Back to Storyboards List" aria-label="Back to Storyboards List"><i class="bi bi-arrow-left-circle"></i></a>
      Storyboard: {storyboard?.name || 'Loading...'}
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

      <button class="btn btn-success me-2" on:click={openCreationModal} disabled={isLoading || isInsertingFrame || isDeletingFrame || isExportingFrames || isExportingZip || isExportingUnified || isSavingTransition}>
        <i class="bi bi-plus-circle me-1"></i> Adicionar Quadros
      </button>
      <!-- ZIP Export Button -->
      <button class="btn btn-outline-secondary me-2" on:click={exportStoryboardFrames} disabled={isExportingZip || isLoading || isInsertingFrame || isDeletingFrame || frames.length === 0 || isExportingFrames || isExportingUnified || isSavingTransition}>
        {#if isExportingZip}
          <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          Exportando Arquivos...
        {:else}
          <i class="bi bi-file-earmark-zip me-1"></i> Exportar Arquivos
        {/if}
      </button>
      <!-- Individual Frame Export Button -->
      <button class="btn btn-outline-primary me-2" on:click={exportIndividualFrames} disabled={isExportingFrames || isLoading || isInsertingFrame || isDeletingFrame || frames.length === 0 || isExportingZip || isExportingUnified || isSavingTransition}>
        {#if isExportingFrames}
          <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          Exportando Quadros... ({ (exportProgress * 100).toFixed(0) }%)
        {:else}
          <i class="bi bi-film me-1"></i> Exportar Quadros (Separados)
        {/if}
      </button>
       <!-- Unified Video Export Button -->
       <button class="btn btn-primary" on:click={exportUnifiedVideo} disabled={isExportingUnified || isLoading || isInsertingFrame || isDeletingFrame || frames.length === 0 || isExportingZip || isExportingFrames || isSavingTransition}>
         {#if isExportingUnified}
           <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
           Exportando Vídeo Unificado...
         {:else}
           <i class="bi bi-collection-play me-1"></i> Exportar Vídeo Unificado
         {/if}
       </button>
    </div>
  </div>

  <!-- Total Duration Display -->
  <div class="text-muted mb-4">
      Duração Total da Narração: <strong>{formatDuration(totalDuration)}</strong>
  </div>

  <!-- Loading/Saving Indicators -->
  {#if isLoading || isSavingTransition || isInsertingFrame || isDeletingFrame}
    <div class="d-flex justify-content-center my-3">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
       <span class="ms-2">
         {#if isLoading}Gerando e adicionando quadros...{:else if isSavingTransition}Salvando transição...{:else if isInsertingFrame}Inserindo quadro...{:else if isDeletingFrame}Excluindo quadro...{/if}
       </span>
    </div>
  {/if}

  <!-- Export Status/Error Display -->
   {#if isExportingFrames || isExportingZip || isExportingUnified || exportError}
       <div class="alert {exportError ? 'alert-danger' : 'alert-info'} alert-dismissible fade show mt-3" role="alert">
         {#if isExportingFrames}
            <div class="d-flex justify-content-between align-items-center">
                <span>
                    <strong>Exportando quadros separados...</strong> ({ (exportProgress * 100).toFixed(0) }%)
                    {#if exportLogMessages.length > 0}
                        <code class="d-block small text-muted mt-1">{exportLogMessages[exportLogMessages.length - 1]}</code>
                    {/if}
                </span>
                 <button type="button" class="btn-close ms-2" on:click={() => {isExportingFrames = false; exportError = null;}} aria-label="Close"></button>
            </div>
            <div class="progress mt-2" style="height: 5px;">
                <div class="progress-bar" role="progressbar" style="width: {exportProgress * 100}%" aria-valuenow={exportProgress * 100} aria-valuemin="0" aria-valuemax="100"></div>
            </div>
         {:else if isExportingZip}
            <div class="d-flex justify-content-between align-items-center">
                 <strong>Exportando arquivos ZIP...</strong>
                 <button type="button" class="btn-close ms-2" on:click={() => {isExportingZip = false; exportError = null;}} aria-label="Close"></button>
            </div>
            <div class="progress mt-2" style="height: 5px;">
                 <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 100%" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
          {:else if isExportingUnified}
             <div class="d-flex justify-content-between align-items-center">
                  <strong>Exportando vídeo unificado... (Isso pode demorar)</strong>
                  <button type="button" class="btn-close ms-2" on:click={() => {isExportingUnified = false; exportError = null;}} aria-label="Close"></button>
             </div>
             <div class="progress mt-2" style="height: 5px;">
                  <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 100%" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"></div>
             </div>
         {:else if exportError}
            {exportError}
            <button type="button" class="btn-close" on:click={() => exportError = null} aria-label="Close"></button>
         {/if}
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
    {#if frames.length > 0 && storyboard?.id} <!-- Ensure storyboard.id exists -->
      <!-- Render frames sorted by frameOrder -->
      {#each frames.sort((a, b) => (a.frameOrder ?? 0) - (b.frameOrder ?? 0)) as frame, i (frame.id)}
        <StoryboardFrameComponent
          {frame}
          storyboardId={storyboard.id}
          on:durationchange={handleDurationChange}
          on:deleteframe={handleDeleteFrame}
        />

        <!-- Transition Button Area (between frames) -->
        {#if i < frames.length - 1}
          {@const nextFrame = frames[i + 1]}
          {@const currentTransitionType = frame.transitionTypeAfter || 'none'}
          {@const currentTransitionDuration = frame.transitionDurationAfter ?? 1.0}
          <div class="text-center my-2 py-1 border-top border-bottom">
             <button
               class="btn btn-sm btn-outline-secondary"
               title="Configurar transição para o próximo quadro"
               on:click={() => openTransitionModal(frame, nextFrame)}
               disabled={isSavingTransition || isLoading || isInsertingFrame || isDeletingFrame || isExportingFrames || isExportingZip || isExportingUnified}
             >
               <i class="bi bi-arrow-left-right me-1"></i>
               Transição: {currentTransitionType === 'none' ? 'Nenhuma' : `${currentTransitionType} (${currentTransitionDuration}s)`}
             </button>
             <!-- Add New Frame Button -->
             <button
               class="btn btn-sm btn-outline-success ms-2"
               title="Adicionar quadro em branco após este"
               on:click={() => handleAddFrameAfter(frame.id)}
               disabled={isLoading || isSavingTransition || isInsertingFrame || isDeletingFrame || isExportingFrames || isExportingZip || isExportingUnified}
             >
               <i class="bi bi-plus-lg"></i>
             </button>
          </div>
        {/if}
      {/each}
    {:else if !loadError && !isLoading}
      <p class="text-center text-muted">Nenhum quadro criado ainda para este storyboard. Clique em "Adicionar Quadros" para começar.</p>
    {/if}
  </div>

  <!-- Add Button (alternative trigger) -->
   <div class="text-center mb-4">
     <button class="btn btn-outline-success" on:click={openCreationModal} disabled={isLoading || isInsertingFrame || isDeletingFrame || isExportingFrames || isExportingZip || isExportingUnified || isSavingTransition}>
       + Adicionar Quadros
     </button>
   </div>

</div>

<!-- Creation Modal -->
<CreationModal bind:show={showCreationModal} on:close={closeCreationModal} on:create={handleAddFrames} />

<!-- Transition Modal -->
<TransitionModal
  bind:show={showTransitionModal}
  currentFrameId={modalCurrentFrameId}
  nextFrameId={modalNextFrameId}
  initialTransitionType={modalInitialType}
  initialTransitionDuration={modalInitialDuration}
  on:close={closeTransitionModal}
  on:save={handleSaveTransition}
/>
