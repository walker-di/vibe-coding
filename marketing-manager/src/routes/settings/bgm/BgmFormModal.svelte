<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';
  import { FileUpload } from '$lib/components/ui/file-upload';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import { X, Save, Music, Play, Pause, Upload, Wand2 } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import type { BgmFileListItem } from '$lib/types/bgm.types';
  import { onMount } from 'svelte';

  // Props
  let {
    open = false,
    bgmFile = null,
    onClose,
    onSubmit
  } = $props<{
    open?: boolean;
    bgmFile?: BgmFileListItem | null;
    onClose?: () => void;
    onSubmit?: () => void;
  }>();

  // Form state
  let name = $state('');
  let description = $state('');
  let audioUrl = $state('');
  let isSubmitting = $state(false);
  let errors = $state<Record<string, string>>({});
  let audioElement = $state<HTMLAudioElement | null>(null);
  let isPlaying = $state(false);
  let showAudioUploadModal = $state(false);
  let duration = $state<number | null>(null);
  let fileSize = $state<number | null>(null);

  // Music generation state
  let activeTab = $state<'upload' | 'url' | 'generate'>('upload');
  let musicDescription = $state('');
  let musicPrompt = $state('');
  let musicDuration = $state(30); // Default duration: 30 seconds
  let isGenerating = $state(false);
  let generatedAudioUrl = $state('');

  // Initialize form with bgmFile data if provided
  $effect(() => {
    if (bgmFile) {
      name = bgmFile.name;
      description = bgmFile.description || '';
      audioUrl = bgmFile.audioUrl;
      duration = bgmFile.duration;
      fileSize = bgmFile.fileSize;
    } else {
      // Reset form for new BGM
      name = '';
      description = '';
      audioUrl = '';
      duration = null;
      fileSize = null;
    }
  });

  // Validate form
  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!audioUrl.trim()) {
      newErrors.audioUrl = 'Audio URL is required';
    }

    errors = newErrors;
    return Object.keys(newErrors).length === 0;
  }

  // Handle form submission
  async function handleSubmit() {
    if (!validate() || isSubmitting) return;

    isSubmitting = true;

    try {
      const bgmData = {
        name,
        description: description || null,
        audioUrl,
        duration,
        fileSize
      };

      let response;
      if (bgmFile) {
        // Update existing BGM
        response = await fetch(`/api/bgm/${bgmFile.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bgmData)
        });
      } else {
        // Create new BGM
        response = await fetch('/api/bgm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bgmData)
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed with status: ${response.status}`);
      }

      toast.success(bgmFile ? 'BGM updated successfully' : 'BGM added successfully');
      onSubmit?.();
    } catch (err: any) {
      console.error('Error saving BGM:', err);
      toast.error(`Failed to save BGM: ${err.message || 'Unknown error'}`);
    } finally {
      isSubmitting = false;
    }
  }

  // Generate music using AI
  async function generateMusic() {
    if ((!musicDescription && !musicPrompt) || isGenerating) return;

    isGenerating = true;
    errors = {};

    // Show a toast to indicate generation has started
    const toastId = toast.loading('Generating music... This may take up to 30 seconds');

    try {
      // If no name is provided, create one based on the description or prompt
      if (!name) {
        name = musicDescription ?
          `Music for: ${musicDescription.substring(0, 30)}${musicDescription.length > 30 ? '...' : ''}` :
          'Generated Background Music';
      }

      const requestBody = {
        description: musicDescription || undefined,
        prompt: musicPrompt || undefined,
        name: name || undefined,
        duration: musicDuration
      };

      const response = await fetch('/api/bgm/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed with status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        // Update form with generated data
        name = data.data.name;
        description = data.data.description || '';
        audioUrl = data.data.audioUrl;
        generatedAudioUrl = data.data.audioUrl;

        // Switch to the audio preview tab
        activeTab = 'url';

        // If we got a prompt back, update the prompt field
        if (data.data.prompt) {
          musicPrompt = data.data.prompt;
        }

        // Try to get audio duration
        if (audioElement) {
          audioElement.src = audioUrl;
          audioElement.load();
          audioElement.addEventListener('loadedmetadata', () => {
            if (audioElement) {
              duration = Math.round(audioElement.duration);
            }
          });
        }

        toast.dismiss(toastId);
        toast.success('Music generated successfully!');
      } else {
        toast.dismiss(toastId);
        throw new Error('Failed to generate music: No data returned');
      }
    } catch (err: any) {
      console.error('Error generating music:', err);
      toast.dismiss(toastId);
      toast.error(`Failed to generate music: ${err.message || 'Unknown error'}`);
    } finally {
      isGenerating = false;
    }
  }

  // Handle file upload completion
  function handleFileUpload(event: CustomEvent<{ url: string, file: File }>) {
    const { url, file } = event.detail;
    audioUrl = url;

    // Try to get file metadata
    fileSize = file.size;

    // Try to get audio duration
    if (audioElement) {
      audioElement.src = url;
      audioElement.load();
      audioElement.addEventListener('loadedmetadata', () => {
        if (audioElement) {
          duration = Math.round(audioElement.duration);
        }
      });
    }
  }

  // Play/pause audio preview
  function toggleAudioPreview() {
    if (!audioElement || !audioUrl) return;

    if (isPlaying) {
      audioElement.pause();
      audioElement.currentTime = 0;
      isPlaying = false;
    } else {
      // Add a timestamp to prevent browser caching
      const timestamp = Date.now();
      const audioUrlWithTimestamp = `${audioUrl}?t=${timestamp}`;

      audioElement.src = audioUrlWithTimestamp;
      audioElement.load();
      audioElement.play()
        .then(() => {
          isPlaying = true;
        })
        .catch(err => {
          console.error('Error playing audio:', err);
          isPlaying = false;
        });
    }
  }

  // Clean up audio on component unmount
  function cleanup() {
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
    }
  }

  onMount(() => {
    return cleanup;
  });
</script>

{#if open}
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
    <div class="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold flex items-center">
          <Music class="h-5 w-5 mr-2" />
          {bgmFile ? 'Edit' : 'Add'} Background Music
        </h2>
        <Button variant="ghost" size="icon" onclick={onClose}>
          <X class="h-5 w-5" />
        </Button>
      </div>

      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
        <div>
          <Label for="bgm-name">Name</Label>
          <Input
            id="bgm-name"
            bind:value={name}
            placeholder="Enter a name for this BGM"
            class={errors.name ? 'border-red-500' : ''}
          />
          {#if errors.name}
            <p class="text-xs text-red-500 mt-1">{errors.name}</p>
          {/if}
        </div>

        <div>
          <Label for="bgm-description">Description (Optional)</Label>
          <Textarea
            id="bgm-description"
            bind:value={description}
            placeholder="Enter a description for this BGM"
            rows={3}
          />
        </div>

        <Tabs value={activeTab} onValueChange={(value) => activeTab = value as 'upload' | 'url' | 'generate'}>
          <TabsList class="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="url">URL</TabsTrigger>
            <TabsTrigger value="generate">Generate</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" class="space-y-4">
            <div>
              <Label>Audio File</Label>
              <div class="mt-2">
                <FileUpload
                  buttonText="Upload Audio File"
                  accept="audio/*"
                  uploadEndpoint="/api/upload/audio"
                  on:upload={handleFileUpload}
                />
                <p class="text-xs text-muted-foreground mt-1">Supported formats: MP3, WAV, OGG</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="url" class="space-y-4">
            <div>
              <Label for="bgm-url">Audio URL</Label>
              <Input
                id="bgm-url"
                bind:value={audioUrl}
                placeholder="Enter URL to audio file"
                class={errors.audioUrl ? 'border-red-500' : ''}
              />
              {#if errors.audioUrl}
                <p class="text-xs text-red-500 mt-1">{errors.audioUrl}</p>
              {/if}
            </div>
          </TabsContent>

          <TabsContent value="generate" class="space-y-4">
            <div>
              <Label for="music-description">Music Description</Label>
              <Textarea
                id="music-description"
                bind:value={musicDescription}
                placeholder="Describe the music you want to generate (e.g., 'Upbeat corporate music with piano and light percussion')"
                rows={3}
              />
              <p class="text-xs text-muted-foreground mt-1">Describe the style, mood, and instruments for your background music</p>
            </div>

            <div class="text-center text-sm text-muted-foreground my-2">- or -</div>

            <div>
              <Label for="music-prompt">Advanced Prompt</Label>
              <Textarea
                id="music-prompt"
                bind:value={musicPrompt}
                placeholder="Enter a detailed prompt for the music generation model (e.g., 'Uplifting corporate music with piano arpeggios, light percussion, and strings. 120 BPM, major key, optimistic mood.')"
                rows={3}
              />
              <p class="text-xs text-muted-foreground mt-1">For advanced users: directly provide a prompt for the music generation model</p>
            </div>

            <div>
              <Label for="music-duration">Duration (seconds)</Label>
              <div class="flex items-center gap-2">
                <input
                  id="music-duration"
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  bind:value={musicDuration}
                  class="flex-1"
                />
                <span class="text-sm font-medium w-10 text-right">{musicDuration}s</span>
              </div>
              <p class="text-xs text-muted-foreground mt-1">Select the duration of the generated music (5-60 seconds)</p>
            </div>

            <Button
              type="button"
              onclick={generateMusic}
              disabled={isGenerating || (!musicDescription && !musicPrompt)}
              class="w-full"
            >
              {#if isGenerating}
                <div class="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                Generating Music...
              {:else}
                <Wand2 class="h-4 w-4 mr-2" />
                Generate Music
              {/if}
            </Button>
          </TabsContent>
        </Tabs>

        <!-- Audio preview -->
        {#if audioUrl}
          <div class="mt-2 p-3 bg-muted rounded-md">
            <div class="flex items-center justify-between">
              <div>
                <div class="font-medium">Audio Preview</div>
                {#if duration !== null}
                  <div class="text-xs text-muted-foreground">
                    Duration: {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
                  </div>
                {/if}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onclick={toggleAudioPreview}
                class="h-8 px-2"
              >
                {#if isPlaying}
                  <Pause class="h-4 w-4 mr-1" /> Stop
                {:else}
                  <Play class="h-4 w-4 mr-1" /> Play
                {/if}
              </Button>
            </div>
            <audio bind:this={audioElement} class="hidden"></audio>
          </div>
        {/if}

        <div class="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onclick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {#if isSubmitting}
              <div class="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
              Saving...
            {:else}
              <Save class="h-4 w-4 mr-2" />
              Save
            {/if}
          </Button>
        </div>
      </form>
    </div>
  </div>
{/if}
