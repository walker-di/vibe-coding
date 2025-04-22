<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { FileUpload } from '$lib/components/ui/file-upload';
  import { ImageUp, X, Upload, Image as ImageIcon } from 'lucide-svelte';
  import ImageGallery from './ImageGallery.svelte';

  // Props
  let {
    open = false,
    onImageSelected,
    onClose,
    isForBackground = false,
    onUnsetBackground
  } = $props<{
    open?: boolean;
    onImageSelected?: (url: string) => void;
    onClose?: () => void;
    isForBackground?: boolean;
    onUnsetBackground?: () => void;
  }>();

  // State
  let imageUrl = $state('');
  let activeTab = $state<'upload' | 'gallery'>('upload');

  // Handle file upload completion
  function handleFileUpload(event: CustomEvent<{ url: string, file: File }>) {
    const { url } = event.detail;
    console.log('Image upload successful in modal, URL:', url);
    onImageSelected?.(url);
    close();
  }

  // Handle file upload error
  function handleUploadError(event: CustomEvent<{ message: string }>) {
    const { message } = event.detail;
    console.error('Image upload error in modal:', message);
    // We don't close the modal on error so the user can try again
  }

  // Handle URL input
  function handleUrlSubmit() {
    if (imageUrl.trim()) {
      onImageSelected?.(imageUrl.trim());
      close();
    }
  }

  // Close the modal
  function close() {
    imageUrl = '';
    onClose?.();
  }
</script>

{#if open}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-medium">Add Image</h3>
        <Button variant="ghost" size="icon" onclick={close}>
          <X class="h-4 w-4" />
        </Button>
      </div>

      <!-- Tabs -->
      <div class="border-b mb-4">
        <div class="flex space-x-2">
          <button
            class={`px-4 py-2 font-medium text-sm ${activeTab === 'upload' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
            onclick={() => activeTab = 'upload'}
          >
            <div class="flex items-center">
              <Upload class="h-4 w-4 mr-2" /> Upload
            </div>
          </button>
          <button
            class={`px-4 py-2 font-medium text-sm ${activeTab === 'gallery' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
            onclick={() => activeTab = 'gallery'}
          >
            <div class="flex items-center">
              <ImageIcon class="h-4 w-4 mr-2" /> Gallery
            </div>
          </button>
        </div>
      </div>

      <!-- Tab Content -->
      <div class="space-y-6">
        {#if activeTab === 'upload'}
          <div>
            <p class="mb-2 font-medium">Upload a new image:</p>
            <FileUpload
              buttonText="Choose Image"
              accept="image/*"
              on:upload={handleFileUpload}
              on:error={handleUploadError}
            />
          </div>

          <div class="border-t pt-4">
            <p class="mb-2 font-medium">Or add from URL:</p>
            <div class="flex gap-2">
              <input
                type="url"
                bind:value={imageUrl}
                placeholder="https://example.com/image.jpg"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <Button variant="outline" onclick={handleUrlSubmit} disabled={!imageUrl.trim()}>
                <ImageUp class="h-4 w-4 mr-2" /> Add
              </Button>
            </div>
          </div>
        {:else if activeTab === 'gallery'}
          <div class="h-[400px] overflow-hidden">
            <ImageGallery onImageSelected={(url) => {
              onImageSelected?.(url);
              close();
            }} />
          </div>
        {/if}

        <div class="flex justify-end gap-2">
          {#if isForBackground}
            <Button variant="destructive" onclick={() => {
              onUnsetBackground?.();
              close();
            }}>
              Remove Background
            </Button>
          {/if}
          <Button variant="ghost" onclick={close}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}
