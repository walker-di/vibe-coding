<script lang="ts">
  import type { StoryboardFrameDb } from '$lib/types/storyboard'; // Use the DB schema type
  import { selectedVoice } from '$lib/stores/voiceStore'; // Import the voice store
  import { get } from 'svelte/store'; // To get the current store value non-reactively
  // import { invalidateAll } from '$app/navigation'; // To refresh data after generation (commented out as planned)

  export let frame: StoryboardFrameDb;

  // Loading state per asset type - Add bgmAudio
  let isGenerating: { [key in 'mainImage' | 'backgroundImage' | 'narrationAudio' | 'bgmAudio']?: boolean } = {};
  let generationError: string | null = null;

  // Narration Audio State
  let narrationAudioElement: HTMLAudioElement | null = null; // Reference to the narration audio element
  let isNarrationPlaying = false; // Track narration playback state

  // BGM Audio State
  let bgmAudioElement: HTMLAudioElement | null = null; // Reference to the BGM audio element
  let isBgmPlaying = false; // Track BGM playback state
  $: if (bgmAudioElement) bgmAudioElement.volume = 0.1; // Set BGM volume to 20%

  // Placeholder image - Use frame.mainImageUrl if available
  const placeholderImage = 'https://via.placeholder.com/400x225.png/eee/aaa?text=Prompt+Output';

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

        <h6 class="card-subtitle mb-1 text-muted">Narração:</h6>
        <p class="card-text mb-2" style="max-height: 80px; overflow-y: auto;">
          {frame.narration || 'N/A'}
        </p>

        <h6 class="card-subtitle mb-1 text-muted">Prompt Imagem Principal:</h6>
        <p class="card-text small mb-2" style="max-height: 60px; overflow-y: auto;">
            <code style="white-space: pre-wrap;">{frame.mainImagePrompt || 'N/A'}</code>
        </p>

        <p class="card-text small mb-2">
          <strong class="text-muted">Prompt Fundo:</strong> <code style="white-space: pre-wrap;">{frame.backgroundImagePrompt || 'N/A'}</code>
          <br />
          <strong class="text-muted">Prompt BGM:</strong> <code style="white-space: pre-wrap;">{frame.bgmPrompt || 'N/A'}</code>
        </p>

        <!-- Audio Controls -->
        <div class="mt-auto pt-2"> <!-- Removed flex container, handle layout internally -->
            <div class="d-flex flex-wrap gap-2 align-items-center"> <!-- Added inner flex container -->
                <!-- Narration Player -->
                {#if frame.narrationAudioUrl}
                  <div class="d-flex align-items-center">
                     <span class="me-2 text-muted small">Narração:</span>
                     <button class="btn btn-sm btn-outline-secondary py-0 px-1" on:click={toggleNarrationPlayback} title={isNarrationPlaying ? 'Pause Narration' : 'Play Narration'}>
                         <i class:bi-play-fill={!isNarrationPlaying} class:bi-pause-fill={isNarrationPlaying} class="bi fs-6"></i>
                     </button>
                     <!-- Hidden narration audio element -->
                     <audio
                         bind:this={narrationAudioElement}
                         src={frame.narrationAudioUrl}
                         on:play={() => isNarrationPlaying = true}
                         on:pause={() => isNarrationPlaying = false}
                         on:ended={() => isNarrationPlaying = false}
                         preload="metadata"
                     ></audio>
                  </div>
                {/if}

                <!-- BGM Player -->
                {#if frame.bgmUrl}
                  <div class="d-flex align-items-center">
                     <span class="me-2 text-muted small">BGM:</span>
                     <!-- This is the BGM Play/Pause Button -->
                     <button class="btn btn-sm btn-outline-secondary py-0 px-1" on:click={toggleBgmPlayback} title={isBgmPlaying ? 'Pause BGM' : 'Play BGM'}>
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
        <!-- TODO: Add Edit/Delete buttons later -->
      </div>
    </div>
  </div>
</div>
