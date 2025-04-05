<script lang="ts">
  import StoryboardFrameComponent from '$lib/components/StoryboardFrame.svelte';
  import CreationModal from '$lib/components/CreationModal.svelte';
  // Import the specific frame type if needed, or rely on PageData inference
  // import type { StoryboardFrameDb } from '$lib/types/storyboard';
  import type { PageData } from './$types'; // Import PageData type for this route
  import { invalidate } from '$app/navigation'; // For refreshing data for this specific page
  import { selectedVoice, ptBRVoices } from '$lib/stores/voiceStore'; // Import voice store and list
  import JSZip from 'jszip'; // Re-add JSZip for ZIP export
  // file-saver removed
  import { onMount } from 'svelte';
  // import { tick } from 'svelte'; // No longer needed for FFmpeg FS
  // FFmpeg imports removed


  export let data: PageData; // Receive data from load function

  // data.storyboard should contain { id: string, name: string, createdAt: Date | null }
  // data.frames should be StoryboardFrameDb[] for this storyboard
  $: storyboard = data.storyboard;
  $: frames = data.frames || [];
  $: loadError = data.error; // Get potential error message from load

  let showModal = false;
  let isLoading = false; // State for API call loading (adding frames)
  let isExportingVideo = false; // Renamed state for video export loading
  let isExportingZip = false; // Added state for ZIP export loading
  let apiError: string | null = null; // State for API call errors
  let exportError: string | null = null; // State for export errors (can be shared or separated)
  let exportProgress = 0; // Generic progress for backend export (0 to 1)
  let exportLogMessages: string[] = []; // Generic logs for backend export

  // FFmpeg state REMOVED

  // Store individual frame durations (Still needed for filtering)
  let frameDurations: { [key: string]: number } = {};

  // Calculate total duration reactively
  $: totalDuration = Object.values(frameDurations).reduce((sum, duration) => sum + (duration || 0), 0);

  // Removed top-level const storyboardId

  onMount(async () => {
    // Check directly from data prop inside onMount
    if (!data.storyboard?.id) {
      console.error("Storyboard ID not found in page data onMount!");
      // Handle error, maybe redirect or show message
    }
    // No need to load FFmpeg on mount anymore
  });

  // Function to load FFmpeg instance REMOVED

  function openModal() {
    apiError = null; // Clear previous errors when opening modal
    showModal = true;
  }

  function closeModal() {
    showModal = false;
  }

  // Function to handle duration change event from child components
  function handleDurationChange(event: CustomEvent<{ id: string, duration: number }>) {
    const { id, duration } = event.detail;
    if (id && typeof duration === 'number' && isFinite(duration)) {
      frameDurations = { ...frameDurations, [id]: duration };
    }
  }

  // Function to format seconds into MM:SS (copied from child component for now)
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

  // readFileWithRetry helper REMOVED

  // fetchAssetAsBlob helper REMOVED (Backend handles fetching)

  // Helper function to fetch asset and return as Blob (same as before) - KEEP for ZIP export
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

  // Re-add the original ZIP export function
  async function exportStoryboardFrames() {
    if (isExportingZip || !frames || frames.length === 0 || !storyboard) return;

    isExportingZip = true;
    exportError = null; // Clear previous errors
    const zip = new JSZip();
    const safeStoryboardName = storyboard.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'storyboard';

    try {
      await Promise.all(frames.map(async (frame, index) => {
        // Use frameOrder if available and reliable, otherwise index
        const frameNumber = frame.frameOrder !== undefined ? frame.frameOrder + 1 : index + 1;
        const framePrefix = `Frame_${frameNumber.toString().padStart(3, '0')}`; // Pad for sorting

        // Use the renamed helper for ZIP export
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
        // Add metadata JSON file creation and addition if desired (currently removed)
        // const metadata = { ...frame }; // Copy frame data
        // delete metadata.backgroundImageUrl; // Optionally remove URLs if blobs are included
        // delete metadata.mainImageUrl;
        // delete metadata.narrationAudioUrl;
        // delete metadata.bgmUrl;
        // zip.file(`${framePrefix}_metadata.json`, JSON.stringify(metadata, null, 2));

      }));

      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Use native download for ZIP as well
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


  // Function to export frames using the backend API
  async function exportAllFrames() {
    console.log("--- exportAllFrames START (Backend) ---");
    exportLogMessages = ['--- exportAllFrames START (Backend) ---'];

    // Check basic conditions
    if (isExportingVideo || !frames || frames.length === 0 || !storyboard) {
        console.log(`Frame export skipped: isExportingVideo=${isExportingVideo}, frames=${frames?.length}, storyboard=${!!storyboard}`);
        if (!frames || frames.length === 0) {
            exportError = "No frames to export.";
        }
        return;
    }

    isExportingVideo = true;
    exportError = null;
    exportProgress = 0;
    exportLogMessages = ['Starting backend video export...'];
    const safeStoryboardName = storyboard.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'storyboard';

    try {
      // 1. Filter and sort frames (still need duration from frameDurations store)
      const validFrames = frames
        .filter(f => f.narrationAudioUrl && frameDurations[f.id] && frameDurations[f.id] > 0)
        .sort((a, b) => (a.frameOrder ?? Infinity) - (b.frameOrder ?? Infinity));

      if (validFrames.length === 0) {
        throw new Error("No frames with narration and duration found to export.");
      }

      exportLogMessages = [...exportLogMessages, `Found ${validFrames.length} valid frames to process.`];
      console.log(`Starting backend frame export loop for ${validFrames.length} frames.`);

      // 2. Process each frame by calling the backend API
      for (let i = 0; i < validFrames.length; i++) {
        const frame = validFrames[i];
        const frameIndex = i; // Use 0-based index for filenames/logging
        const frameLogPrefix = `Frame ${frameIndex + 1}/${validFrames.length} (ID: ${frame.id.substring(0, 6)}):`;
        exportLogMessages = [...exportLogMessages, `${frameLogPrefix} Requesting backend generation...`];
        exportProgress = (i / validFrames.length); // Update progress based on loop

        try {
          console.log(`${frameLogPrefix} Calling API: /api/storyboard/${storyboard.id}/export-frame/${frame.id}`);
          const response = await fetch(`/api/storyboard/${storyboard.id}/export-frame/${frame.id}`);

          if (!response.ok) {
            let errorMsg = `API Error (${response.status}): ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.message || errorMsg;
            } catch (e) { /* Ignore if response is not JSON */ }
            throw new Error(errorMsg);
          }

          // Get video data as Blob
          const segmentBlob = await response.blob();
          console.log(`${frameLogPrefix} Received video blob from backend (size: ${segmentBlob.size})`);
          exportLogMessages = [...exportLogMessages, `${frameLogPrefix} Received video from backend. Downloading...`];

          // Trigger download
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
          // Decide if you want to stop the whole export or just skip this frame
          // For now, let's skip the frame and continue
          exportError = `Error exporting frame ${frameIndex + 1}: ${frameErr.message}`; // Show last error
          continue; // Skip to next frame
        }
      }

      console.log(`Frame loop finished.`);
      exportLogMessages = [...exportLogMessages, `Frame loop finished. Individual frame downloads initiated.`];
      exportProgress = 1; // Mark as complete after loop

    } catch (err: any) {
      console.error('Failed during frame export process:', err);
      exportError = `Video export failed: ${err.message || 'Unknown error'}`;
      exportLogMessages = [...exportLogMessages, `Error: ${exportError}`];
    } finally {
      isExportingVideo = false; // Use correct state variable
      console.log("--- exportAllFrames END (Backend) ---");
      exportLogMessages = [...exportLogMessages, '--- exportAllFrames END (Backend) ---'];
    }
  }

</script>

<svelte:head>
  <title>Storyboard: {storyboard?.name || 'Loading...'}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
</svelte:head>

<div class="container mt-4">
  <!-- Header Row -->
  <div class="d-flex justify-content-between align-items-center mb-2"> <!-- Reduced bottom margin -->
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

      <button class="btn btn-success me-2" on:click={openModal} disabled={isLoading || isExportingVideo || isExportingZip}>
        <i class="bi bi-film me-1"></i> Adicionar Quadros
      </button>
      <!-- Add ZIP Export Button Back -->
      <button class="btn btn-outline-secondary me-2" on:click={exportStoryboardFrames} disabled={isExportingZip || isLoading || frames.length === 0 || isExportingVideo}>
        {#if isExportingZip}
          <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          Exportando ZIP...
        {:else}
          <i class="bi bi-box-arrow-up me-1"></i> Exportar Arquivos
        {/if}
      </button>
      <!-- Frame Export Button -->
      <button class="btn btn-primary" on:click={exportAllFrames} disabled={isExportingVideo || isLoading || frames.length === 0 || isExportingZip}>
        {#if isExportingVideo}
          <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          Exportando Quadros ({ (exportProgress * 100).toFixed(0) }%) <!-- Use exportProgress -->
        {:else}
          <i class="bi bi-film me-1"></i> Exportar Quadros
        {/if}
      </button>
    </div>
  </div>

  <!-- FFmpeg Load Error Display REMOVED -->

  <!-- Total Duration Display -->
  <div class="text-muted mb-4"> <!-- Added margin bottom -->
      Duração Total da Narração: <strong>{formatDuration(totalDuration)}</strong>
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
   <!-- Export Status/Error Display -->
   {#if isExportingVideo || isExportingZip || exportError}
       <div class="alert {exportError ? 'alert-danger' : 'alert-info'} alert-dismissible fade show mt-3" role="alert">
         {#if isExportingVideo} <!-- Still using isExportingVideo state -->
            <div>
                <strong>Exportando quadros...</strong> ({ (exportProgress * 100).toFixed(0) }%) <!-- Use exportProgress -->
                <div class="progress mt-2" style="height: 5px;">
                    <div class="progress-bar" role="progressbar" style="width: {exportProgress * 100}%" aria-valuenow={exportProgress * 100} aria-valuemin="0" aria-valuemax="100"></div> <!-- Use exportProgress -->
                </div>
                {#if exportLogMessages.length > 0} <!-- Use exportLogMessages -->
                    <pre class="mt-2 small bg-light p-2 rounded" style="max-height: 100px; overflow-y: auto;"><code>{exportLogMessages[exportLogMessages.length - 1]}</code></pre> <!-- Use exportLogMessages -->
                {/if}
            </div>
         {:else if isExportingZip}
             <div>
                 <strong>Exportando arquivos ZIP...</strong>
                 <div class="progress mt-2" style="height: 5px;">
                     <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 100%" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"></div>
                 </div>
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
    {#if frames.length > 0}
      <!-- Render frames sorted by frameOrder -->
      {#each frames.sort((a, b) => (a.frameOrder ?? 0) - (b.frameOrder ?? 0)) as frame (frame.id)}
        <StoryboardFrameComponent frame={frame} on:durationchange={handleDurationChange} />
      {/each}
    {:else if !loadError && !isLoading}
      <p class="text-center text-muted">Nenhum quadro criado ainda para este storyboard. Clique em "Adicionar Quadros" para começar.</p>
    {/if}
  </div>

  <!-- Add Button (alternative trigger) -->
   <div class="text-center mb-4">
     <button class="btn btn-outline-success" on:click={openModal} disabled={isLoading || isExportingVideo || isExportingZip}>
       + Adicionar Quadros
     </button>
   </div>

</div>

<!-- Creation Modal (used for adding frames now) -->
<!-- Pass storyboardId or other context if modal needs it -->
<CreationModal bind:show={showModal} on:close={closeModal} on:create={handleAddFrames} />
