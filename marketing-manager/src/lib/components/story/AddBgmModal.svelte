<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Label } from '$lib/components/ui/label';
  import { FileUpload } from '$lib/components/ui/file-upload';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import { Music, X, Upload, Sparkles } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import { onMount, createEventDispatcher } from 'svelte';

  // Props
  let {
    open = $bindable(false),
    sceneId = null,
    sceneName = '',
    isLoading = false
  } = $props<{
    open: boolean;
    sceneId: number | null;
    sceneName?: string;
    isLoading?: boolean;
  }>();

  // State
  let name = $state('');
  let description = $state('');
  let audioUrl = $state('');
  let activeTab = $state<'upload' | 'url' | 'generate' | 'auto-select'>('upload');
  let audioElement = $state<HTMLAudioElement | null>(null);
  let isPlaying = $state(false);
  let isAutoSelecting = $state(false);
  let isGenerating = $state(false);
  let musicDescription = $state('');
  let musicDuration = $state(30); // Default duration: 30 seconds
  let error = $state<string | null>(null);

  // Event dispatcher
  const dispatch = createEventDispatcher();

  // Reset form when modal opens/closes
  $effect(() => {
    if (!open) {
      resetForm();
    }
  });

  // Reset form fields
  function resetForm() {
    name = '';
    description = '';
    audioUrl = '';
    activeTab = 'upload';
    error = null;
    stopAudio();
  }

  // Handle file upload completion
  function handleFileUpload(event: CustomEvent<{ url: string, file: File }>) {
    const { url, file } = event.detail;
    audioUrl = url;

    // Use filename as name if not provided
    if (!name) {
      name = file.name.replace(/\.[^/.]+$/, ""); // Remove file extension
    }
  }

  // Handle auto-select BGM from existing files
  async function handleAutoSelectBgm() {
    if (!sceneId) {
      toast.error('Scene must be saved before auto-selecting BGM');
      return;
    }

    isAutoSelecting = true;
    error = null;

    try {
      const response = await fetch(`/api/scenes/${sceneId}/auto-select-bgm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed with status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data && data.data.selectedBgm) {
        // Update form with selected BGM
        audioUrl = data.data.selectedBgm.audioUrl;
        name = data.data.selectedBgm.name;
        description = data.data.selectedBgm.description || '';

        // Show success message
        toast.success(`BGM "${name}" auto-selected`);
      } else {
        throw new Error('Invalid response format or missing BGM data');
      }
    } catch (err: any) {
      console.error('Error auto-selecting BGM:', err);
      error = err.message || 'Failed to auto-select BGM';
      toast.error(error);
    } finally {
      isAutoSelecting = false;
    }
  }

  // Handle AI music generation
  async function handleGenerateMusic() {
    if (!musicDescription.trim()) {
      error = 'Please enter a description for the music you want to generate';
      return;
    }

    isGenerating = true;
    error = null;

    try {
      // If no name is provided, create one based on the description
      if (!name) {
        name = `Music for: ${musicDescription.substring(0, 30)}${musicDescription.length > 30 ? '...' : ''}`;
      }

      const requestBody = {
        description: musicDescription,
        name: name,
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

      if (data.success && data.data && data.data.audioUrl) {
        // Update form with generated BGM
        audioUrl = data.data.audioUrl;
        description = musicDescription;

        // Show success message
        toast.success('Music generated successfully');
      } else {
        throw new Error('Invalid response format or missing audio URL');
      }
    } catch (err: any) {
      console.error('Error generating music:', err);
      error = err.message || 'Failed to generate music';
      toast.error(error);
    } finally {
      isGenerating = false;
    }
  }

  // Play/pause audio preview
  function toggleAudioPreview() {
    if (!audioElement || !audioUrl) return;

    if (isPlaying) {
      stopAudio();
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

  // Stop audio playback
  function stopAudio() {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    isPlaying = false;
  }

  // Handle form submission
  function handleSubmit() {
    if (!name.trim()) {
      error = 'Name is required';
      return;
    }

    if (!audioUrl.trim()) {
      error = 'No audio file selected or URL provided';
      return;
    }

    // Stop any playing audio
    stopAudio();

    // Dispatch the select event with the BGM data
    dispatch('select', {
      bgmUrl: audioUrl,
      bgmName: name
    });

    // Close the modal
    dispatch('close');
  }

  // Handle close
  function handleClose() {
    stopAudio();
    dispatch('close');
  }

  // Clean up audio on component unmount
  onMount(() => {
    return () => {
      stopAudio();
    };
  });
</script>

{#if open}
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
    <div class="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold flex items-center">
          <Music class="h-5 w-5 mr-2" />
          Add Background Music
        </h2>
        <Button variant="ghost" size="icon" onclick={handleClose}>
          <X class="h-5 w-5" />
        </Button>
      </div>

      {#if error}
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4">
          {error}
        </div>
      {/if}

      <div class="space-y-4">
        <div>
          <Label for="name">Name</Label>
          <Input
            id="name"
            bind:value={name}
            placeholder="Enter a name for this BGM"
          />
        </div>

        <div>
          <Label for="description">Description (Optional)</Label>
          <Textarea
            id="description"
            bind:value={description}
            placeholder="Enter a description for this BGM"
            rows={3}
          />
        </div>

        <Tabs value={activeTab} onValueChange={(value) => activeTab = value as 'upload' | 'url' | 'generate' | 'auto-select'}>
          <TabsList class="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="url">URL</TabsTrigger>
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="auto-select">Auto-Select</TabsTrigger>
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
              <Label for="audioUrl">Audio URL</Label>
              <Input
                id="audioUrl"
                bind:value={audioUrl}
                placeholder="Enter URL to audio file"
              />
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

            <div>
              <Label for="music-duration">Duration (seconds)</Label>
              <div class="flex items-center gap-2">
                <Input
                  id="music-duration"
                  type="number"
                  min="10"
                  max="120"
                  bind:value={musicDuration}
                  class="w-24"
                />
                <span class="text-sm text-muted-foreground">seconds</span>
              </div>
              <p class="text-xs text-muted-foreground mt-1">Duration between 10-120 seconds</p>
            </div>

            <Button
              onclick={handleGenerateMusic}
              disabled={isGenerating || !musicDescription.trim()}
              class="w-full mt-2"
            >
              <Music class="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate Music'}
            </Button>
          </TabsContent>

          <TabsContent value="auto-select" class="space-y-4">
            <div class="flex flex-col items-center justify-center py-4">
              <Button
                onclick={handleAutoSelectBgm}
                disabled={isAutoSelecting || !sceneId}
                class="w-full"
              >
                <Sparkles class="h-4 w-4 mr-2" />
                {isAutoSelecting ? 'Selecting...' : 'Auto-Select BGM'}
              </Button>
              <p class="text-xs text-muted-foreground mt-2">
                Automatically select the most appropriate BGM from existing files based on the scene content.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <!-- Audio preview -->
        {#if audioUrl}
          <div class="mt-2 p-3 bg-muted rounded-md">
            <div class="flex items-center justify-between">
              <div class="font-medium">{name || 'Background Music'}</div>
              <Button
                variant="ghost"
                size="sm"
                onclick={toggleAudioPreview}
                class="h-8 px-2"
              >
                {isPlaying ? 'Stop' : 'Preview'}
              </Button>
            </div>
            <audio bind:this={audioElement} class="hidden"></audio>
          </div>
        {/if}

        <div class="flex justify-end gap-2 pt-4">
          <Button variant="outline" onclick={handleClose}>
            Cancel
          </Button>
          <Button
            onclick={handleSubmit}
            disabled={isLoading || isAutoSelecting}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}
