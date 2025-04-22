<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { FileUpload } from '$lib/components/ui/file-upload';
  import { Music, X, Upload } from 'lucide-svelte';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import { onMount } from 'svelte';

  // Props
  let {
    open = false,
    onAudioSelected,
    onClose
  } = $props<{
    open?: boolean;
    onAudioSelected?: (url: string, name: string) => void;
    onClose?: () => void;
  }>();

  // State
  let audioUrl = $state('');
  let audioName = $state('');
  let activeTab = $state<'upload' | 'url'>('upload');
  let audioFiles = $state<Array<{ filename: string; url: string; size: number; createdAt: Date }>>([]);
  let isLoading = $state(false);
  let error = $state('');
  let previewAudio = $state<HTMLAudioElement | null>(null);
  let isPlaying = $state(false);


  // Load audio files on mount
  onMount(async () => {
    await loadAudioFiles();
  });

  // Load audio files from the server
  async function loadAudioFiles() {
    isLoading = true;
    error = '';

    try {
      const response = await fetch('/api/upload/list-audio');
      if (!response.ok) {
        throw new Error(`Failed to load audio files: ${response.statusText}`);
      }

      const data = await response.json();
      audioFiles = data.files || [];
    } catch (err: any) {
      console.error('Error loading audio files:', err);
      error = err.message || 'Failed to load audio files';
    } finally {
      isLoading = false;
    }
  }

  // Handle file upload completion
  function handleFileUpload(event: CustomEvent<{ url: string, file: File }>) {
    const { url, file } = event.detail;
    console.log('Audio upload successful in modal, URL:', url);
    onAudioSelected?.(url, file.name);
    close();
  }

  // Handle file upload error
  function handleUploadError(event: CustomEvent<{ message: string }>) {
    const { message } = event.detail;
    console.error('Audio upload error in modal:', message);
    error = message;
    // We don't close the modal on error so the user can try again
  }

  // Handle URL input
  function handleUrlSubmit() {
    if (audioUrl.trim() && audioName.trim()) {
      onAudioSelected?.(audioUrl.trim(), audioName.trim());
      close();
    } else if (audioUrl.trim() && !audioName.trim()) {
      error = 'Please enter a name for the audio';
    } else {
      error = 'Please enter a valid audio URL';
    }
  }

  // Handle selecting an audio from the list
  function selectAudio(url: string, filename: string) {
    // Use the filename as the name (without extension if needed)
    onAudioSelected?.(url, filename);
    close();
  }

  // Play audio preview
  function playAudio(url: string) {
    if (!previewAudio) return;

    // If already playing this URL, pause it
    if (isPlaying && previewAudio.src.endsWith(url)) {
      previewAudio.pause();
      isPlaying = false;
      return;
    }

    // Otherwise play the new URL
    previewAudio.src = url;
    previewAudio.load();
    previewAudio.play()
      .then(() => {
        isPlaying = true;
      })
      .catch(err => {
        console.error('Error playing audio:', err);
        isPlaying = false;
      });
  }

  // Stop audio preview
  function stopAudio() {
    if (previewAudio) {
      previewAudio.pause();
      previewAudio.currentTime = 0;
      isPlaying = false;
    }
  }

  // Close the modal
  function close() {
    stopAudio();
    onClose?.();
  }

  // Format file size
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
</script>

{#if open}
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
    <div class="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold flex items-center">
          <Music class="h-5 w-5 mr-2" />
          Add Background Music
        </h2>
        <Button variant="ghost" size="icon" onclick={close}>
          <X class="h-5 w-5" />
        </Button>
      </div>

      {#if error}
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4">
          {error}
        </div>
      {/if}

      <!-- Hidden audio element for previews -->
      <audio bind:this={previewAudio} onended={() => isPlaying = false}></audio>

      <Tabs value={activeTab} onValueChange={(value) => activeTab = value as 'upload' | 'url'}>
        <TabsList class="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="upload">Upload Audio</TabsTrigger>
          <TabsTrigger value="url">Audio URL</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" class="space-y-4">
          <div>
            <p class="mb-2 font-medium">Upload a new audio file:</p>
            <FileUpload
              buttonText="Choose Audio File"
              accept="audio/*"
              uploadEndpoint="/api/upload/audio"
              on:upload={handleFileUpload}
              on:error={handleUploadError}
            />
            <p class="text-xs text-muted-foreground mt-1">Supported formats: MP3, WAV, OGG</p>
          </div>

          <div class="border-t pt-4">
            <h3 class="font-medium mb-2">Previously Uploaded Audio</h3>

            {#if isLoading}
              <div class="text-center py-4">Loading audio files...</div>
            {:else if audioFiles.length === 0}
              <div class="text-center py-4 text-muted-foreground">No audio files uploaded yet</div>
            {:else}
              <div class="overflow-y-auto max-h-[300px] border rounded">
                <table class="w-full">
                  <thead class="bg-muted/50 sticky top-0">
                    <tr>
                      <th class="text-left p-2 text-sm font-medium">Name</th>
                      <th class="text-left p-2 text-sm font-medium">Size</th>
                      <th class="text-right p-2 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each audioFiles as file}
                      <tr class="border-t hover:bg-muted/20">
                        <td class="p-2 text-sm">{file.filename}</td>
                        <td class="p-2 text-sm">{formatFileSize(file.size)}</td>
                        <td class="p-2 text-right">
                          <div class="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onclick={() => playAudio(file.url)}
                              title={isPlaying && previewAudio?.src.endsWith(file.url) ? "Stop" : "Play"}
                            >
                              {#if isPlaying && previewAudio?.src.endsWith(file.url)}
                                Stop
                              {:else}
                                Play
                              {/if}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onclick={() => selectAudio(file.url, file.filename)}
                            >
                              Select
                            </Button>
                          </div>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </div>
        </TabsContent>

        <TabsContent value="url" class="space-y-4">
          <div class="space-y-4">
            <div>
              <Label for="audioUrl">Audio URL</Label>
              <Input
                id="audioUrl"
                bind:value={audioUrl}
                placeholder="https://example.com/audio.mp3"
              />
            </div>

            <div>
              <Label for="audioName">Audio Name</Label>
              <Input
                id="audioName"
                bind:value={audioName}
                placeholder="Background Music Name"
              />
            </div>

            <Button onclick={handleUrlSubmit} class="w-full">
              <Upload class="h-4 w-4 mr-2" />
              Use This Audio
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  </div>
{/if}
