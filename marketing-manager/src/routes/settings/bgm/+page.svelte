<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '$lib/components/ui/card';
  import { PlusCircle, Edit, Trash2, Play, Pause, Music } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import type { BgmFileListItem } from '$lib/types/bgm.types';
  import BgmFormModal from './BgmFormModal.svelte';

  // State
  let bgmFiles = $state<BgmFileListItem[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let showFormModal = $state(false);
  let currentBgmFile = $state<BgmFileListItem | null>(null);
  let audioElement = $state<HTMLAudioElement | null>(null);
  let playingBgmId = $state<number | null>(null);

  // Fetch BGM files from the API
  async function fetchBgmFiles() {
    isLoading = true;
    error = null;

    try {
      const response = await fetch('/api/bgm');
      if (!response.ok) {
        throw new Error(`Failed to fetch BGM files: ${response.statusText}`);
      }

      const data = await response.json();
      bgmFiles = data.data.items || [];
    } catch (err: any) {
      console.error('Error fetching BGM files:', err);
      error = err.message || 'An unknown error occurred';
      toast.error(`Failed to load BGM files: ${error}`);
    } finally {
      isLoading = false;
    }
  }

  // Delete a BGM file
  async function deleteBgmFile(id: number) {
    if (!confirm('Are you sure you want to delete this BGM file?')) {
      return;
    }

    try {
      const response = await fetch(`/api/bgm/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete BGM file: ${response.statusText}`);
      }

      toast.success('BGM file deleted successfully');
      fetchBgmFiles(); // Refresh the list
    } catch (err: any) {
      console.error('Error deleting BGM file:', err);
      toast.error(`Failed to delete BGM file: ${err.message || 'Unknown error'}`);
    }
  }

  // Edit a BGM file
  function editBgmFile(bgmFile: BgmFileListItem) {
    currentBgmFile = bgmFile;
    showFormModal = true;
  }

  // Handle form submission
  function handleFormSubmit() {
    showFormModal = false;
    currentBgmFile = null;
    fetchBgmFiles(); // Refresh the list
  }

  // Play/pause audio
  function toggleAudio(bgmFile: BgmFileListItem) {
    if (!audioElement) return;

    if (playingBgmId === bgmFile.id) {
      // Currently playing this BGM, so pause it
      audioElement.pause();
      playingBgmId = null;
    } else {
      // Stop any currently playing audio
      if (playingBgmId !== null) {
        audioElement.pause();
      }

      // Play the selected BGM
      audioElement.src = bgmFile.audioUrl;
      audioElement.load();
      audioElement.play()
        .then(() => {
          playingBgmId = bgmFile.id;
        })
        .catch(err => {
          console.error('Error playing audio:', err);
          toast.error(`Failed to play audio: ${err.message || 'Unknown error'}`);
          playingBgmId = null;
        });
    }
  }

  // Format file size
  function formatFileSize(bytes: number | null): string {
    if (bytes === null) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // Format duration
  function formatDuration(seconds: number | null): string {
    if (seconds === null) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Clean up audio on component unmount
  function cleanup() {
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
    }
  }

  onMount(() => {
    fetchBgmFiles();
    return cleanup;
  });
</script>

<svelte:head>
  <title>Background Music - Settings</title>
</svelte:head>

<div class="container mx-auto p-4 md:p-6 lg:p-8">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-bold">Background Music</h1>
    <Button onclick={() => { currentBgmFile = null; showFormModal = true; }}>
      <PlusCircle class="mr-2 h-4 w-4" /> Add New BGM
    </Button>
  </div>

  <!-- Hidden audio element for previews -->
  <audio bind:this={audioElement} onended={() => playingBgmId = null}></audio>

  {#if isLoading}
    <div class="flex justify-center items-center h-40">
      <div class="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
    </div>
  {:else if error}
    <div class="text-red-600 bg-red-100 border border-red-400 p-4 rounded">
      <p>Error loading BGM files: {error}</p>
      <Button onclick={fetchBgmFiles} variant="outline" class="mt-2">Retry</Button>
    </div>
  {:else if bgmFiles.length === 0}
    <div class="text-center p-8 border rounded-lg bg-muted">
      <Music class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <p class="text-lg font-medium mb-2">No background music files found</p>
      <p class="text-muted-foreground mb-4">Add your first BGM file to get started.</p>
      <Button onclick={() => { currentBgmFile = null; showFormModal = true; }}>
        <PlusCircle class="mr-2 h-4 w-4" /> Add BGM
      </Button>
    </div>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full border-collapse">
        <thead>
          <tr class="bg-muted">
            <th class="text-left p-3 border-b">Name</th>
            <th class="text-left p-3 border-b">Description</th>
            <th class="text-left p-3 border-b">Duration</th>
            <th class="text-left p-3 border-b">Size</th>
            <th class="text-right p-3 border-b">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each bgmFiles as bgmFile (bgmFile.id)}
            <tr class="border-b hover:bg-muted/50">
              <td class="p-3">
                <div class="font-medium">{bgmFile.name}</div>
              </td>
              <td class="p-3">
                <div class="text-sm text-muted-foreground">{bgmFile.description || 'No description'}</div>
              </td>
              <td class="p-3">
                <div class="text-sm">{formatDuration(bgmFile.duration)}</div>
              </td>
              <td class="p-3">
                <div class="text-sm">{formatFileSize(bgmFile.fileSize)}</div>
              </td>
              <td class="p-3 text-right">
                <div class="flex justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onclick={() => toggleAudio(bgmFile)}
                    title={playingBgmId === bgmFile.id ? "Pause" : "Play"}
                  >
                    {#if playingBgmId === bgmFile.id}
                      <Pause class="h-4 w-4" />
                    {:else}
                      <Play class="h-4 w-4" />
                    {/if}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onclick={() => editBgmFile(bgmFile)}
                    title="Edit"
                  >
                    <Edit class="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onclick={() => deleteBgmFile(bgmFile.id)}
                    title="Delete"
                  >
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <!-- BGM Form Modal -->
  <BgmFormModal
    open={showFormModal}
    bgmFile={currentBgmFile}
    onClose={() => { showFormModal = false; currentBgmFile = null; }}
    onSubmit={handleFormSubmit}
  />
</div>
