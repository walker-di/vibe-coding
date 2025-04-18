<script lang="ts">
  // This component helps debug audio playback issues
  
  let { 
    audioUrl = '',
    title = 'Audio Debugger'
  } = $props<{
    audioUrl: string;
    title?: string;
  }>();
  
  let audioElement = $state<HTMLAudioElement | null>(null);
  let isPlaying = $state(false);
  let error = $state('');
  let debugInfo = $state('');
  
  function playAudio() {
    if (!audioUrl) {
      error = 'No audio URL provided';
      return;
    }
    
    if (!audioElement) {
      error = 'Audio element not available';
      return;
    }
    
    error = '';
    debugInfo = '';
    
    try {
      // Reset the audio element
      audioElement.pause();
      audioElement.currentTime = 0;
      
      // Set the source and load it
      audioElement.src = audioUrl;
      audioElement.load();
      
      // Play the audio
      const playPromise = audioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            isPlaying = true;
            debugInfo = `Playing: ${audioUrl}`;
          })
          .catch(err => {
            error = `Error playing audio: ${err.message}`;
            console.error('Error playing audio:', err);
            isPlaying = false;
          });
      }
    } catch (err: any) {
      error = `Error: ${err.message}`;
      console.error('Error in playAudio:', err);
    }
  }
  
  function stopAudio() {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      isPlaying = false;
      debugInfo = 'Stopped';
    }
  }
</script>

<div class="audio-debugger">
  <h3 class="title">{title}</h3>
  
  <div class="controls">
    <button class="play-button" onclick={playAudio} disabled={isPlaying}>Play</button>
    <button class="stop-button" onclick={stopAudio} disabled={!isPlaying}>Stop</button>
  </div>
  
  <div class="audio-container">
    <audio bind:this={audioElement} controls class="audio-player"></audio>
  </div>
  
  {#if error}
    <div class="error">{error}</div>
  {/if}
  
  {#if debugInfo}
    <div class="debug-info">{debugInfo}</div>
  {/if}
  
  <div class="url-display">
    <span class="label">URL:</span>
    <span class="value">{audioUrl || 'None'}</span>
  </div>
</div>

<style>
  .audio-debugger {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 12px;
    margin: 8px 0;
    background-color: #f9f9f9;
    font-size: 14px;
  }
  
  .title {
    font-size: 16px;
    font-weight: bold;
    margin: 0 0 8px 0;
  }
  
  .controls {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }
  
  .play-button, .stop-button {
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid #ccc;
    background-color: #fff;
    cursor: pointer;
  }
  
  .play-button:disabled, .stop-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .audio-container {
    margin-bottom: 8px;
  }
  
  .audio-player {
    width: 100%;
    height: 32px;
  }
  
  .error {
    color: #b91c1c;
    background-color: #fee2e2;
    border: 1px solid #fecaca;
    padding: 4px 8px;
    border-radius: 4px;
    margin-bottom: 8px;
  }
  
  .debug-info {
    color: #1e40af;
    background-color: #dbeafe;
    border: 1px solid #bfdbfe;
    padding: 4px 8px;
    border-radius: 4px;
    margin-bottom: 8px;
  }
  
  .url-display {
    font-family: monospace;
    font-size: 12px;
    word-break: break-all;
  }
  
  .label {
    font-weight: bold;
    margin-right: 4px;
  }
</style>
