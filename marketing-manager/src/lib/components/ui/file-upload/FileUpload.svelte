<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Upload, Loader2 } from 'lucide-svelte';

  // Props
  let {
    buttonText = 'Upload File',
    accept = 'image/*',
    disabled = false,
    variant = 'outline',
    size = 'default'
  } = $props<{
    buttonText?: string;
    accept?: string;
    disabled?: boolean;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
  }>();

  // State
  let fileInput: HTMLInputElement;
  let isUploading = $state(false);
  let error = $state<string | null>(null);

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    upload: { url: string, file: File };
    error: { message: string };
  }>();

  // Handle file selection
  async function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];
    console.log('Selected file:', file.name, file.type, file.size);
    isUploading = true;
    error = null;

    try {
      // Create FormData object
      const formData = new FormData();
      formData.append('file', file);

      console.log('Uploading file:', file.name);
      console.log('FormData entries:', [...formData.entries()].map(e => e[0]));

      // Send the request
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData
      });

      console.log('Upload response status:', response.status);

      // Handle error responses
      if (!response.ok) {
        let errorMessage = `Upload failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      // Parse the successful response
      let data;
      try {
        data = await response.json();
        console.log('Upload response data:', data);
      } catch (parseError) {
        console.error('Error parsing success response:', parseError);
        throw new Error('Invalid response from server');
      }

      if (!data.imageUrl) {
        throw new Error('No image URL returned from server');
      }

      // Dispatch success event with the URL
      dispatch('upload', { url: data.imageUrl, file });
    } catch (err: any) {
      console.error('Error uploading file:', err);
      error = err.message || 'Failed to upload file';
      dispatch('error', { message: error });
    } finally {
      isUploading = false;
      // Reset the input so the same file can be selected again
      if (fileInput) {
        fileInput.value = '';
      }
    }
  }

  // Trigger file input click
  function openFileDialog() {
    if (fileInput && !disabled && !isUploading) {
      fileInput.click();
    }
  }
</script>

<div class="file-upload">
  <input
    type="file"
    bind:this={fileInput}
    onchange={handleFileChange}
    {accept}
    class="hidden"
    disabled={disabled || isUploading}
  />

  <Button
    {variant}
    {size}
    type="button"
    onclick={openFileDialog}
    disabled={disabled || isUploading}
  >
    {#if isUploading}
      <Loader2 class="h-4 w-4 mr-2 animate-spin" />
      Uploading...
    {:else}
      <Upload class="h-4 w-4 mr-2" />
      {buttonText}
    {/if}
  </Button>

  {#if error}
    <p class="text-sm text-red-500 mt-1">{error}</p>
  {/if}
</div>
