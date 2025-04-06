<script lang="ts">
  import type { StoryboardFrameDb } from '$lib/types/storyboard'; // Use the DB schema type
  import { selectedVoice } from '$lib/stores/voiceStore'; // Import the voice store
  import { get } from 'svelte/store'; // To get the current store value non-reactively
  import { createEventDispatcher, onMount } from 'svelte'; // Import onMount

  export let frame: StoryboardFrameDb;
  export let storyboardId: string; // Add storyboardId prop
  export let isFirst: boolean = false; // Is this the first frame?
  export let isLast: boolean = false; // Is this the last frame?

  // State for active tab
  let activeTab: 'narration' | 'mainImage' | 'background' | 'bgm' = 'narration';

  // State for editable fields
  let editedNarration = frame.narration ?? '';
  let editedMainImagePrompt = frame.mainImagePrompt ?? '';
  let editedBackgroundImagePrompt = frame.backgroundImagePrompt ?? '';
  let editedBgmPrompt = frame.bgmPrompt ?? '';
  let isDirty = false; // Track if changes have been made
  let isSaving = false; // Track saving state
  let saveError: string | null = null;

  // Update edited fields if the frame prop changes externally
  $: {
      if (!isDirty) { // Only update if not currently editing
          editedNarration = frame.narration ?? '';
          editedMainImagePrompt = frame.mainImagePrompt ?? '';
          editedBackgroundImagePrompt = frame.backgroundImagePrompt ?? '';
          editedBgmPrompt = frame.bgmPrompt ?? '';
    }
  }

  // Add 'deleteframe', 'moveframeup', 'moveframedown' to the dispatcher types
  const dispatch = createEventDispatcher<{
    durationchange: { id: string, duration: number };
    deleteframe: { id: string };
    moveframeup: { id: string };
    moveframedown: { id: string };
  }>();

  // Loading state per asset type - Add bgmAudio
  let isGenerating: { [key in 'mainImage' | 'backgroundImage' | 'narrationAudio' | 'bgmAudio']?: boolean } = {};
  let generationError: string | null = null;

  // Narration Audio State
  let narrationAudioElement: HTMLAudioElement | null = null; // Reference to the narration audio element
  let isNarrationPlaying = false; // Track narration playback state
  let narrationDuration: number | null = null; // Store narration duration in seconds

  // BGM Audio State
  let bgmAudioElement: HTMLAudioElement | null = null; // Reference to the BGM audio element
  let isBgmPlaying = false; // Track BGM playback state
  $: if (bgmAudioElement) bgmAudioElement.volume = 0.1; // Set BGM volume to 20%

  // Placeholder image - Use frame.mainImageUrl if available
  const placeholderImage = 'https://placehold.co/400x225';

  onMount(() => {
    // Check if metadata might have loaded before listener attached
    if (narrationAudioElement && narrationAudioElement.readyState >= 2) { // HAVE_CURRENT_DATA or higher
      handleNarrationMetadataLoaded();
    }
  });

  function handleImageError(event: Event) {
    // Assert the target is an HTMLImageElement
    const imgElement = event.currentTarget as HTMLImageElement;
    imgElement.src = placeholderImage;
  }

  // Function to regenerate a specific asset - Add bgmAudio type
  async function regenerateAsset(assetType: 'mainImage' | 'backgroundImage' | 'narrationAudio' | 'bgmAudio') {
    // Prevent clicking if any asset is currently generating
    if (Object.values(isGenerating).some(val => val)) return;

    isGenerating = { ...isGenerating, [assetType]: true }; // Set loading state for this type
    generationError = null;
    console.log(`Initiating regeneration for ${assetType} on frame ${frame.id}`);

    // Prepare the request body
    let requestBody: { assetType: string; voiceName?: string } = { assetType };
    if (assetType === 'narrationAudio') {
        requestBody.voiceName = get(selectedVoice); // Get current voice from store
        console.log(`Including selected voice: ${requestBody.voiceName}`);
    }

    try {
        const response = await fetch(`/api/storyboard/${frame.id}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody) // Send the body with optional voiceName
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `API Error: ${response.statusText}` }));
            throw new Error(errorData.message || `API Error: ${response.statusText}`);
        }

        const result = await response.json();
        console.log(`Regeneration API response for ${assetType} on ${frame.id}:`, result);

        // Update local frame data directly with the returned updated frame
        if (result.updatedFrame) {
            // Update only the relevant fields to avoid potential stale data issues
            // This assumes the API returns the full updated frame object
            frame = { ...frame, ...result.updatedFrame };
            console.log(`Frame ${frame.id} updated locally.`);
            // If audio was regenerated, reset playback state
            if (assetType === 'narrationAudio' && narrationAudioElement) {
                isNarrationPlaying = false;
                narrationDuration = null; // Reset duration as it needs recalculation
                // narrationAudioElement.load(); // Optional: force reload
            }
            if (assetType === 'bgmAudio' && bgmAudioElement) {
                isBgmPlaying = false;
                // bgmAudioElement.load(); // Optional: force reload
            }
        } else {
            console.warn("API did not return updated frame data.");
            // Optionally fall back to invalidateAll() here if needed
            // await invalidateAll();
        }

    } catch (err: any) {
        console.error(`Failed to regenerate ${assetType} for frame ${frame.id}:`, err);
        generationError = `Error regenerating ${assetType}: ${err.message || 'Unknown error'}`;
    } finally {
        isGenerating = { ...isGenerating, [assetType]: false }; // Reset loading state for this type
    }
  }


  function toggleNarrationPlayback() {
    if (!narrationAudioElement) return;

    if (narrationAudioElement.paused || narrationAudioElement.ended) {
      narrationAudioElement.play().catch(e => console.error("Error playing narration audio:", e));
    } else {
      narrationAudioElement.pause();
    }
    // isNarrationPlaying state is updated by the on:play/on:pause listeners
  }

  function toggleBgmPlayback() {
      if (!bgmAudioElement) return;

      if (bgmAudioElement.paused || bgmAudioElement.ended) {
          bgmAudioElement.play().catch(e => console.error("Error playing BGM audio:", e));
      } else {
          bgmAudioElement.pause();
      }
      // isBgmPlaying state is updated by the on:play/on:pause listeners
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

  // Handler for when audio metadata (including duration) is loaded
  function handleNarrationMetadataLoaded() {
    if (narrationAudioElement) {
      // Check if duration is already set to avoid redundant updates/dispatches
      if (narrationDuration !== narrationAudioElement.duration) {
          narrationDuration = narrationAudioElement.duration;
          // Dispatch event with frame ID and duration
          dispatch('durationchange', { id: frame.id, duration: narrationDuration });
      }
    } else {
    }
  }

  // Handler for audio loading errors
  function handleNarrationAudioError(event: Event) {
      console.error(`DEBUG: Error loading narration audio for frame ${frame.id}. Event:`, event);
      const audioElement = event.target as HTMLAudioElement;
      if (audioElement.error) {
          console.error(`DEBUG: Audio error code: ${audioElement.error.code}, message: ${audioElement.error.message}`);
      }
      narrationDuration = null; // Ensure duration is reset on error
  }

  // Function to mark fields as dirty
  function markDirty() {
      isDirty = true;
      saveError = null; // Clear previous save errors on new edit
  }

  // Function to save text changes
  async function saveTextChanges() {
      if (!isDirty || isSaving) return;

      isSaving = true;
      saveError = null;
      console.log(`Saving text changes for frame ${frame.id} in storyboard ${storyboardId}`);

      try {
          // Use the storyboardId prop in the fetch URL
          const response = await fetch(`/api/storyboard/${storyboardId}/frame/${frame.id}/update-text`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  narration: editedNarration,
                  mainImagePrompt: editedMainImagePrompt,
                  backgroundImagePrompt: editedBackgroundImagePrompt,
                  bgmPrompt: editedBgmPrompt
              })
          });

          if (!response.ok) {
              const errorData = await response.json().catch(() => ({ message: `API Error: ${response.statusText}` }));
              throw new Error(errorData.message || `API Error: ${response.statusText}`);
          }

          const result = await response.json();
          console.log(`Save API response for frame ${frame.id}:`, result);

          // Update the original frame prop with the saved data
          // Assuming the API returns the updated frame or at least confirms success
          if (result.updatedFrame) {
             // Update the frame prop which will trigger the reactive block to update edited fields
             frame = { ...frame, ...result.updatedFrame };
             // Explicitly reset edited fields AFTER frame update if needed, though reactive block should handle it
             editedNarration = frame.narration ?? '';
             editedMainImagePrompt = frame.mainImagePrompt ?? '';
             editedBackgroundImagePrompt = frame.backgroundImagePrompt ?? '';
             editedBgmPrompt = frame.bgmPrompt ?? '';
          } else {
             // Fallback if API doesn't return full frame
             frame.narration = editedNarration;
             frame.mainImagePrompt = editedMainImagePrompt;
             frame.backgroundImagePrompt = editedBackgroundImagePrompt;
             frame.bgmPrompt = editedBgmPrompt;
          }


          isDirty = false; // Reset dirty flag after successful save

      } catch (err: any) {
          console.error(`Failed to save text changes for frame ${frame.id}:`, err);
          saveError = `Error saving: ${err.message || 'Unknown error'}`;
      } finally {
          isSaving = false;
      }
  }

</script>

<div class="card mb-3">
  <div class="row g-0">
    <div class="col-md-7">
      <!-- Container for 16:9 Background Image -->
      <div
        class="position-relative overflow-hidden"
        style:padding-top="56.25%"
        style:background-image={frame.backgroundImageUrl ? `url('${frame.backgroundImageUrl}')` : 'none'}
        style:background-size="cover"
        style:background-position="center"
        style:background-color={frame.backgroundImageUrl ? 'transparent' : '#e9ecef'}
      >
         <!-- Absolutely Positioned 1:1 Main Image Wrapper -->
         {#if frame.mainImageUrl || placeholderImage}
         <div
            class="position-absolute top-50 start-50 translate-middle rounded overflow-hidden"
            style="height: 80%; /* Size based on parent height */
                   aspect-ratio: 1 / 1; /* Maintain square */
                   z-index: 1;
                   border: 2px solid rgba(255, 255, 255, 0.5);
                   box-shadow: 0 2px 4px rgba(0,0,0,0.2);"
         >
            <img
               src={frame.mainImageUrl || placeholderImage}
               alt={frame.title || 'Main storyboard image'}
               style="width: 100%;
                      height: 100%;
                      object-fit: cover;"
               on:error={handleImageError}
            />
         </div>
         {/if}
      </div>
    </div>
    <div class="col-md-5">
      <div class="card-body d-flex flex-column">
        {#if frame.title}
          <h5 class="card-title">{frame.title}</h5>
        {/if}

        <!-- Tab Navigation -->
        <ul class="nav nav-tabs mb-2" role="tablist">
          <li class="nav-item" role="presentation">
            <button
              class="nav-link {activeTab === 'narration' ? 'active' : ''}"
              type="button"
              role="tab"
              aria-selected={activeTab === 'narration'}
              on:click={() => activeTab = 'narration'}
            >
              Narração
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button
              class="nav-link {activeTab === 'mainImage' ? 'active' : ''}"
              type="button"
              role="tab"
              aria-selected={activeTab === 'mainImage'}
              on:click={() => activeTab = 'mainImage'}
            >
              Imagem Principal
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button
              class="nav-link {activeTab === 'background' ? 'active' : ''}"
              type="button"
              role="tab"
              aria-selected={activeTab === 'background'}
              on:click={() => activeTab = 'background'}
            >
              Fundo
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button
              class="nav-link {activeTab === 'bgm' ? 'active' : ''}"
              type="button"
              role="tab"
              aria-selected={activeTab === 'bgm'}
              on:click={() => activeTab = 'bgm'}
            >
              BGM
            </button>
          </li>
        </ul>

        <!-- Tab Content -->
        <div class="tab-content mb-2" style="min-height: 120px;"> <!-- Increased min-height for textarea -->
          {#if activeTab === 'narration'}
            <div class="tab-pane fade show active" role="tabpanel">
              <h6 class="card-subtitle mb-1 text-muted visually-hidden">Narração:</h6>
              <textarea
                class="form-control form-control-sm"
                rows="4"
                bind:value={editedNarration}
                on:input={markDirty}
                placeholder="Digite a narração aqui..."
              ></textarea>
            </div>
          {/if}
          {#if activeTab === 'mainImage'}
            <div class="tab-pane fade show active" role="tabpanel">
              <h6 class="card-subtitle mb-1 text-muted visually-hidden">Prompt Imagem Principal:</h6>
               <textarea
                 class="form-control form-control-sm font-monospace small"
                 rows="4"
                 bind:value={editedMainImagePrompt}
                 on:input={markDirty}
                 placeholder="Digite o prompt da imagem principal..."
               ></textarea>
            </div>
          {/if}
          {#if activeTab === 'background'}
            <div class="tab-pane fade show active" role="tabpanel">
               <h6 class="card-subtitle mb-1 text-muted visually-hidden">Prompt Fundo:</h6>
               <textarea
                 class="form-control form-control-sm font-monospace small"
                 rows="4"
                 bind:value={editedBackgroundImagePrompt}
                 on:input={markDirty}
                 placeholder="Digite o prompt da imagem de fundo..."
               ></textarea>
            </div>
          {/if}
          {#if activeTab === 'bgm'}
            <div class="tab-pane fade show active" role="tabpanel">
               <h6 class="card-subtitle mb-1 text-muted visually-hidden">Prompt BGM:</h6>
                <textarea
                  class="form-control form-control-sm font-monospace small"
                  rows="4"
                  bind:value={editedBgmPrompt}
                  on:input={markDirty}
                  placeholder="Digite o prompt da música de fundo..."
                ></textarea>
            </div>
          {/if}
        </div>

         <!-- Save Button & Error -->
         {#if isDirty || saveError}
            <div class="mb-2 text-end">
                 {#if saveError}
                    <small class="text-danger me-2">{saveError}</small>
                 {/if}
                 <button
                    class="btn btn-primary btn-sm"
                    on:click={saveTextChanges}
                    disabled={!isDirty || isSaving}
                 >
                    {#if isSaving}
                        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        Salvando...
                    {:else}
                        Salvar Alterações
                    {/if}
                 </button>
            </div>
         {/if}

        <!-- Audio Controls -->
        <div class="mt-auto pt-2">
            <div class="d-flex flex-wrap gap-2 align-items-center"> <!-- Added inner flex container -->
                <!-- Log URL before the #if block -->
                <!-- Narration Player -->
                 {#if frame.narrationAudioUrl}
                   <div class="d-flex align-items-center">
                      <span class="me-2 text-muted small">Narração:</span>
                      <button
                         class="btn btn-sm btn-outline-secondary py-0 px-1"
                         on:click={toggleNarrationPlayback}
                         title={isNarrationPlaying ? 'Pausar Narração' : 'Tocar Narração'}
                         aria-label={isNarrationPlaying ? 'Pausar Narração' : 'Tocar Narração'}
                      >
                          <i class:bi-play-fill={!isNarrationPlaying} class:bi-pause-fill={isNarrationPlaying} class="bi fs-6"></i>
                      </button>
                      <!-- Hidden narration audio element -->
                     <audio
                         bind:this={narrationAudioElement}
                         src={frame.narrationAudioUrl}
                         on:play={() => isNarrationPlaying = true}
                         on:pause={() => isNarrationPlaying = false}
                         on:ended={() => isNarrationPlaying = false}
                         on:loadedmetadata={handleNarrationMetadataLoaded}
                         on:error={handleNarrationAudioError}
                         preload="metadata"
                     ></audio>
                     <!-- Display Narration Duration next to button -->
                     <span class="text-muted small ms-1">({formatDuration(narrationDuration)})</span>
                  </div>
                {:else}
                   <!-- Log if the #if block is false -->
                {/if}

                <!-- BGM Player -->
                 {#if frame.bgmUrl}
                   <div class="d-flex align-items-center">
                      <span class="me-2 text-muted small">BGM:</span>
                      <!-- This is the BGM Play/Pause Button -->
                       <button
                          class="btn btn-sm btn-outline-secondary py-0 px-1"
                          on:click={toggleBgmPlayback}
                          title={isBgmPlaying ? 'Pausar BGM' : 'Tocar BGM'}
                          aria-label={isBgmPlaying ? 'Pausar BGM' : 'Tocar BGM'}
                       >
                          <i class:bi-play-fill={!isBgmPlaying} class:bi-pause-fill={isBgmPlaying} class="bi fs-6"></i>
                      </button>
                      <!-- Hidden BGM audio element -->
                     <audio
                         bind:this={bgmAudioElement}
                         src={frame.bgmUrl}
                         on:play={() => isBgmPlaying = true}
                         on:pause={() => isBgmPlaying = false}
                         on:ended={() => isBgmPlaying = false}
                         preload="metadata"
                         loop
                     ></audio>
                  </div>
                {/if}
            </div>
        </div>


        <!-- Regeneration Buttons & Status -->
        <div class="mt-2"> <!-- Adjusted margin -->
            <div class="btn-group btn-group-sm" role="group" aria-label="Regenerate Assets">
                <button
                    type="button"
                    class="btn btn-outline-secondary"
                    on:click={() => regenerateAsset('backgroundImage')}
                    disabled={Object.values(isGenerating).some(val => val)}
                    title="Regenerar Imagem de Fundo"
                >
                    {#if isGenerating['backgroundImage']}
                        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    {:else}
                        <i class="bi bi-image"></i> BG
                    {/if}
                </button>
                <button
                    type="button"
                    class="btn btn-outline-secondary"
                    on:click={() => regenerateAsset('mainImage')}
                    disabled={Object.values(isGenerating).some(val => val)}
                    title="Regenerar Imagem Principal"
                >
                    {#if isGenerating['mainImage']}
                        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    {:else}
                        <i class="bi bi-person-bounding-box"></i> Main
                    {/if}
                </button>
                <button
                    type="button"
                    class="btn btn-outline-secondary"
                    on:click={() => regenerateAsset('narrationAudio')}
                    disabled={Object.values(isGenerating).some(val => val)}
                    title="Regenerar Narração"
                >
                     {#if isGenerating['narrationAudio']}
                        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    {:else}
                        <i class="bi bi-mic-fill"></i> Audio
                    {/if}
                </button>
                 <button
                    type="button"
                    class="btn btn-outline-secondary"
                    on:click={() => regenerateAsset('bgmAudio')}
                    disabled={Object.values(isGenerating).some(val => val)}
                    title="Regenerar BGM"
                >
                     {#if isGenerating['bgmAudio']}
                        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    {:else}
                        <i class="bi bi-music-note-beamed"></i> BGM
                    {/if}
                </button>
            </div>
             {#if generationError}
                 <small class="text-danger d-block mt-1">{generationError}</small>
              {/if}
         </div>
         <!-- Delete Button -->
         <div class="mt-2 text-end">
             <button
                 type="button"
                 class="btn btn-sm btn-outline-danger"
                 on:click={() => dispatch('deleteframe', { id: frame.id })}
                 title="Excluir este quadro"
                  disabled={Object.values(isGenerating).some(val => val) || isSaving}
              >
                  <i class="bi bi-trash3"></i> Excluir Quadro
              </button>
          </div>
          <!-- Reorder Buttons -->
          <div class="mt-2 text-end">
              <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary me-1"
                  on:click={() => dispatch('moveframeup', { id: frame.id })}
                  title="Mover quadro para cima"
                  disabled={isFirst || Object.values(isGenerating).some(val => val) || isSaving}
              >
                  <i class="bi bi-arrow-up"></i>
              </button>
              <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  on:click={() => dispatch('moveframedown', { id: frame.id })}
                  title="Mover quadro para baixo"
                  disabled={isLast || Object.values(isGenerating).some(val => val) || isSaving}
              >
                  <i class="bi bi-arrow-down"></i>
              </button>
          </div>
        </div>
     </div>
   </div>
</div>
