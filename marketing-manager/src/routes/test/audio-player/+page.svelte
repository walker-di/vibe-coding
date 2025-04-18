<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { onMount } from 'svelte';

  let audioUrl = $state('');
  let audioElement: HTMLAudioElement;
  let isPlaying = $state(false);
  let error = $state('');
  let testUrls = $state([
    '/narration/clip-402-1745009038920-8v00e904.mp3', // Use the URL from your logs
  ]);

  function playAudio() {
    if (!audioUrl) {
      error = 'Please enter an audio URL';
      return;
    }

    error = '';
    
    try {
      if (audioElement) {
        // Add a timestamp to prevent browser caching
        const timestamp = Date.now();
        const audioUrlWithTimestamp = `${audioUrl}?t=${timestamp}`;
        
        audioElement.src = audioUrlWithTimestamp;
        audioElement.load();
        
        const playPromise = audioElement.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              isPlaying = true;
              console.log('Audio playback started successfully');
            })
            .catch(err => {
              error = `Error playing audio: ${err.message}`;
              console.error('Error playing audio:', err);
              isPlaying = false;
            });
        }
      } else {
        error = 'Audio element not found';
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
    }
  }

  function selectTestUrl(url: string) {
    audioUrl = url;
  }

  onMount(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  });
</script>

<svelte:head>
  <title>Audio Player Test</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-8">
  <h1 class="text-3xl font-bold mb-6">Audio Player Test</h1>
  
  <div class="space-y-6">
    <div class="rounded border p-6 shadow">
      <div class="space-y-4">
        <div>
          <Label for="audioUrl">Audio URL</Label>
          <div class="flex gap-2">
            <Input id="audioUrl" bind:value={audioUrl} placeholder="/narration/your-audio-file.mp3" />
            <Button onclick={playAudio} disabled={isPlaying}>Play</Button>
            <Button onclick={stopAudio} disabled={!isPlaying} variant="outline">Stop</Button>
          </div>
        </div>
        
        {#if error}
          <div class="p-3 bg-red-50 border border-red-200 rounded text-red-600">
            {error}
          </div>
        {/if}
        
        <div>
          <audio bind:this={audioElement} controls class="w-full"></audio>
        </div>
        
        <div class="space-y-2">
          <h3 class="text-lg font-semibold">Test URLs</h3>
          <div class="space-y-1">
            {#each testUrls as url}
              <div class="flex items-center gap-2">
                <Button variant="outline" onclick={() => selectTestUrl(url)} class="text-xs">Select</Button>
                <span class="text-sm font-mono">{url}</span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
    
    <div class="rounded border p-6 shadow">
      <h2 class="text-xl font-semibold mb-4">Debug Information</h2>
      <div class="space-y-2">
        <p><strong>Current URL:</strong> {audioUrl || 'None'}</p>
        <p><strong>Is Playing:</strong> {isPlaying ? 'Yes' : 'No'}</p>
        <p><strong>Audio Element:</strong> {audioElement ? 'Available' : 'Not Available'}</p>
      </div>
    </div>
  </div>
</div>
