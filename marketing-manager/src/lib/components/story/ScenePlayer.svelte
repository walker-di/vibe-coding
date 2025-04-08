<script lang="ts">
  import { onMount } from 'svelte';
  import CanvasPreview from './CanvasPreview.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-svelte';
  import type { Clip } from '$lib/types/story.types';

  let { 
    clips = [], 
    bgmUrl = '',
    bgmName = '',
    autoPlay = false
  } = $props<{ 
    clips: Clip[];
    bgmUrl?: string;
    bgmName?: string;
    autoPlay?: boolean;
  }>();
  
  let currentClipIndex = $state(0);
  let audioElement: HTMLAudioElement;
  let isPlaying = $state(false);
  let isMuted = $state(false);
  let clipInterval: number | undefined;
  let clipDuration = $state(5000); // Default 5 seconds per clip
  
  onMount(() => {
    if (autoPlay) {
      playScene();
    }
    
    return () => {
      // Clean up
      if (audioElement) {
        audioElement.pause();
      }
      if (clipInterval) {
        clearInterval(clipInterval);
      }
    };
  });
  
  function playScene() {
    if (bgmUrl && audioElement) {
      audioElement.play();
    }
    isPlaying = true;
    
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
    if (bgmUrl && audioElement) {
      audioElement.pause();
    }
    isPlaying = false;
    
    if (clipInterval) {
      clearInterval(clipInterval);
      clipInterval = undefined;
    }
  }
  
  function nextClip() {
    if (currentClipIndex < clips.length - 1) {
      currentClipIndex++;
    }
  }
  
  function prevClip() {
    if (currentClipIndex > 0) {
      currentClipIndex--;
    }
  }
  
  function toggleMute() {
    if (audioElement) {
      audioElement.muted = !audioElement.muted;
      isMuted = audioElement.muted;
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
    <audio bind:this={audioElement} src={bgmUrl} loop></audio>
  {/if}
  
  <div class="canvas-container">
    {#if clips.length > 0}
      <CanvasPreview canvasData={clips[currentClipIndex].canvas} />
      
      {#if clips[currentClipIndex].narration}
        <div class="narration">
          {clips[currentClipIndex].narration}
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
          onclick={toggleMute}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {#if isMuted}
            <VolumeX class="h-4 w-4" />
          {:else}
            <Volume2 class="h-4 w-4" />
          {/if}
        </Button>
      {/if}
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
