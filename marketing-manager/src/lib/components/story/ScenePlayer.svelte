<script lang="ts">
  import { onMount } from 'svelte';
  import CanvasPreview from './CanvasPreview.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-svelte';
  import type { Clip } from '$lib/types/story.types';
  import AudioDebugger from './AudioDebugger.svelte';

  let {
    clips = [],
    bgmUrl = '',
    bgmName = '',
    autoPlay = false,
    debug = false,
    narrationVolume = 1.0,
    bgmVolume = 0.09,
    narrationSpeed = 1.1
  } = $props<{
    clips: Clip[];
    bgmUrl?: string;
    bgmName?: string;
    autoPlay?: boolean;
    debug?: boolean;
    narrationVolume?: number;
    bgmVolume?: number;
    narrationSpeed?: number;
  }>();

  let currentClipIndex = $state(0);
  let bgmAudioElement = $state<HTMLAudioElement | null>(null);
  let narrationAudioElement = $state<HTMLAudioElement | null>(null);
  let isPlaying = $state(false);
  let isBgmMuted = $state(false);
  let isNarrationMuted = $state(false);
  let clipInterval: number | undefined;
  let clipDuration = $state(5000); // Default 5 seconds per clip
  let previousClipIndex = $state(-1); // Track previous clip to detect changes
  let narrationAudioUrl = $state(''); // Track the current narration audio URL
  let narrationError = $state(''); // Track any errors with narration playback

  // Effect to update the narration audio URL when the current clip changes
  $effect(() => {
    if (clips.length === 0) return;

    const currentClip = clips[currentClipIndex];
    if (currentClip?.narrationAudioUrl) {
      // Add a timestamp to prevent browser caching
      const timestamp = Date.now();
      narrationAudioUrl = `${currentClip.narrationAudioUrl}?t=${timestamp}`;
      console.log(`Updated narration audio URL: ${narrationAudioUrl}`);
    } else {
      narrationAudioUrl = '';
    }
  });

  // Effect to play narration audio when the clip changes during playback
  $effect(() => {
    if (!isPlaying || !narrationAudioUrl) return;

    // Only play narration when the clip index changes and we're playing
    if (currentClipIndex !== previousClipIndex) {
      console.log(`Playing narration for clip ${currentClipIndex}`);
      playNarrationAudio();
      previousClipIndex = currentClipIndex;
    }
  });

  // Function to play the narration audio
  function playNarrationAudio() {
    if (!narrationAudioUrl || !narrationAudioElement) return;

    narrationError = '';

    try {
      // Reset the audio element
      narrationAudioElement.pause();
      narrationAudioElement.currentTime = 0;

      // Set the source and load it
      narrationAudioElement.src = narrationAudioUrl;
      narrationAudioElement.load();

      // Apply global audio settings with fallbacks in case the database fields don't exist yet
      narrationAudioElement.muted = isNarrationMuted;
      narrationAudioElement.volume = typeof narrationVolume === 'number' ? narrationVolume : 1.0;
      narrationAudioElement.playbackRate = typeof narrationSpeed === 'number' ? narrationSpeed : 1.1;

      // Play the audio
      const playPromise = narrationAudioElement.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          narrationError = `Error playing narration: ${err.message}`;
          console.error('Error playing narration audio:', err);
        });
      }
    } catch (err: any) {
      narrationError = `Error: ${err.message}`;
      console.error('Error in playNarrationAudio:', err);
    }
  }

  onMount(() => {
    if (autoPlay) {
      playScene();
    }

    return () => {
      // Clean up
      if (bgmAudioElement) {
        bgmAudioElement.pause();
      }
      if (narrationAudioElement) {
        narrationAudioElement.pause();
      }
      if (clipInterval) {
        clearInterval(clipInterval);
      }
    };
  });

  function playScene() {
    if (bgmUrl && bgmAudioElement) {
      // Apply global BGM volume setting with fallback
      bgmAudioElement.volume = typeof bgmVolume === 'number' ? bgmVolume : 0.09;
      bgmAudioElement.play();
    }
    isPlaying = true;

    // Play narration for current clip
    playNarrationAudio();
    previousClipIndex = currentClipIndex;

    // Auto-advance clips
    if (clipInterval) {
      clearInterval(clipInterval);
    }

    clipInterval = setInterval(() => {
      if (currentClipIndex < clips.length - 1) {
        currentClipIndex++;
      } else {
        // Stop at the end
        pauseScene();
      }
    }, clipDuration) as unknown as number;
  }

  function pauseScene() {
    if (bgmUrl && bgmAudioElement) {
      bgmAudioElement.pause();
    }
    if (narrationAudioElement) {
      narrationAudioElement.pause();
    }
    isPlaying = false;

    if (clipInterval) {
      clearInterval(clipInterval);
      clipInterval = undefined;
    }
  }

  function nextClip() {
    // Pause any playing narration
    if (narrationAudioElement) {
      narrationAudioElement.pause();
    }

    if (currentClipIndex < clips.length - 1) {
      currentClipIndex++;

      // If playing, play the narration for the new clip
      if (isPlaying) {
        playNarrationAudio();
      }
      previousClipIndex = currentClipIndex;
    }
  }

  function prevClip() {
    // Pause any playing narration
    if (narrationAudioElement) {
      narrationAudioElement.pause();
    }

    if (currentClipIndex > 0) {
      currentClipIndex--;

      // If playing, play the narration for the new clip
      if (isPlaying) {
        playNarrationAudio();
      }
      previousClipIndex = currentClipIndex;
    }
  }

  function toggleBgmMute() {
    if (bgmAudioElement) {
      bgmAudioElement.muted = !bgmAudioElement.muted;
      isBgmMuted = bgmAudioElement.muted;
    }
  }

  function toggleNarrationMute() {
    isNarrationMuted = !isNarrationMuted;
    if (narrationAudioElement) {
      narrationAudioElement.muted = isNarrationMuted;
    }
  }

  function handleClipDurationChange(e: Event) {
    const value = parseInt((e.target as HTMLInputElement).value);
    clipDuration = value;

    // Restart interval if playing
    if (isPlaying && clipInterval) {
      clearInterval(clipInterval);
      clipInterval = setInterval(() => {
        if (currentClipIndex < clips.length - 1) {
          currentClipIndex++;
        } else {
          pauseScene();
        }
      }, clipDuration) as unknown as number;
    }
  }
</script>

<div class="scene-player">
  {#if bgmUrl}
    <audio bind:this={bgmAudioElement} src={bgmUrl} loop></audio>
  {/if}

  <!-- Hidden narration audio element -->
  <audio
    bind:this={narrationAudioElement}
    preload="auto"
    onended={() => console.log('Narration audio ended')}
    onerror={(e) => console.error('Narration audio error:', e)}
  ></audio>

  <div class="canvas-container">
    {#if clips.length > 0}
      <CanvasPreview canvasData={clips[currentClipIndex].canvas} />

      {#if clips[currentClipIndex].narration}
        <div class="narration">
          {clips[currentClipIndex].narration}
        </div>
      {/if}

      {#if narrationError}
        <div class="narration-error">
          {narrationError}
        </div>
      {/if}

      {#if debug && clips[currentClipIndex]?.narrationAudioUrl}
        <div class="debug-section">
          <h3 class="text-sm font-semibold mb-2">Audio Debug</h3>
          <AudioDebugger audioUrl={narrationAudioUrl || ''} title="Narration Audio" />
        </div>
      {/if}
    {:else}
      <div class="empty-state">
        <p>No clips in this scene</p>
      </div>
    {/if}
  </div>

  <div class="controls">
    <div class="clip-info">
      {#if clips.length > 0}
        <span>Clip {currentClipIndex + 1} of {clips.length}</span>
      {:else}
        <span>No clips</span>
      {/if}
    </div>

    <div class="playback-controls">
      <Button
        variant="outline"
        size="icon"
        onclick={prevClip}
        disabled={currentClipIndex === 0 || clips.length === 0}
        title="Previous Clip"
      >
        <SkipBack class="h-4 w-4" />
      </Button>

      {#if isPlaying}
        <Button
          variant="outline"
          size="icon"
          onclick={pauseScene}
          disabled={clips.length === 0}
          title="Pause"
        >
          <Pause class="h-4 w-4" />
        </Button>
      {:else}
        <Button
          variant="outline"
          size="icon"
          onclick={playScene}
          disabled={clips.length === 0}
          title="Play"
        >
          <Play class="h-4 w-4" />
        </Button>
      {/if}

      <Button
        variant="outline"
        size="icon"
        onclick={nextClip}
        disabled={currentClipIndex === clips.length - 1 || clips.length === 0}
        title="Next Clip"
      >
        <SkipForward class="h-4 w-4" />
      </Button>

      {#if bgmUrl}
        <Button
          variant="outline"
          size="icon"
          onclick={toggleBgmMute}
          title={isBgmMuted ? "Unmute BGM" : "Mute BGM"}
        >
          {#if isBgmMuted}
            <VolumeX class="h-4 w-4" />
          {:else}
            <Volume2 class="h-4 w-4" />
          {/if}
        </Button>
      {/if}

      <!-- Narration Audio Mute Toggle -->
      <Button
        variant="outline"
        size="icon"
        onclick={toggleNarrationMute}
        title={isNarrationMuted ? "Unmute Narration" : "Mute Narration"}
      >
        {#if isNarrationMuted}
          <VolumeX class="h-4 w-4" />
        {:else}
          <Volume2 class="h-4 w-4" />
        {/if}
      </Button>
    </div>

    <div class="clip-duration">
      <label for="clipDuration" class="text-sm">Clip Duration: {clipDuration / 1000}s</label>
      <input
        id="clipDuration"
        type="range"
        min="1000"
        max="10000"
        step="500"
        value={clipDuration}
        onchange={handleClipDurationChange}
        class="w-full"
      />
    </div>
  </div>

  {#if bgmName}
    <div class="bgm-info">
      <span>BGM: {bgmName}</span>
    </div>
  {/if}
</div>

<style>
  .scene-player {
    display: flex;
    flex-direction: column;
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: hidden;
    background-color: #fff;
  }

  .canvas-container {
    padding: 16px;
    min-height: 400px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .narration {
    margin-top: 16px;
    padding: 12px;
    background-color: #f5f5f5;
    border-radius: 4px;
    width: 100%;
    max-width: 800px;
    text-align: center;
    font-style: italic;
  }

  .narration-error {
    margin-top: 8px;
    padding: 8px;
    background-color: #fee2e2;
    border: 1px solid #fecaca;
    border-radius: 4px;
    width: 100%;
    max-width: 800px;
    text-align: center;
    color: #b91c1c;
    font-size: 14px;
  }

  .debug-section {
    margin-top: 16px;
    padding: 12px;
    background-color: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 4px;
    width: 100%;
    max-width: 800px;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    background-color: #f9f9f9;
    border-top: 1px solid #ddd;
  }

  .clip-info {
    text-align: center;
    font-size: 14px;
    color: #666;
  }

  .playback-controls {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin: 8px 0;
  }

  .clip-duration {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .bgm-info {
    padding: 8px 16px;
    background-color: #f0f0f0;
    border-top: 1px solid #ddd;
    font-size: 12px;
    color: #666;
    text-align: center;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 300px;
    width: 100%;
    background-color: #f9f9f9;
    border-radius: 4px;
    color: #666;
  }
</style>
