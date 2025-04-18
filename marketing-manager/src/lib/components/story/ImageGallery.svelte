<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Loader2, RefreshCw } from 'lucide-svelte';

  // Props
  let { 
    onImageSelected 
  } = $props<{
    onImageSelected?: (url: string) => void;
  }>();

  // Types
  type ImageItem = {
    name: string;
    url: string;
    size: number;
    lastModified: Date;
  };

  // State
  let images = $state<ImageItem[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  // Load images on mount
  onMount(() => {
    loadImages();
  });

  // Function to load images
  async function loadImages() {
    isLoading = true;
    error = null;

    try {
      const response = await fetch('/api/upload/list-images');
      
      if (!response.ok) {
        throw new Error(`Failed to load images: ${response.statusText}`);
      }

      const data = await response.json();
      images = data.images.map((img: any) => ({
        ...img,
        lastModified: new Date(img.lastModified)
      }));
    } catch (err: any) {
      console.error('Error loading images:', err);
      error = err.message || 'Failed to load images';
    } finally {
      isLoading = false;
    }
  }

  // Format file size
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Handle image selection
  function selectImage(url: string) {
    onImageSelected?.(url);
  }
</script>

<div class="image-gallery w-full">
  <div class="flex justify-between items-center mb-4">
    <h3 class="text-sm font-medium">Image Gallery</h3>
    <Button variant="ghost" size="sm" onclick={loadImages} title="Refresh Gallery">
      <RefreshCw class="h-4 w-4" />
    </Button>
  </div>

  {#if isLoading}
    <div class="flex justify-center items-center py-8">
      <Loader2 class="h-8 w-8 animate-spin text-primary" />
    </div>
  {:else if error}
    <div class="text-center py-4 text-red-500">
      <p>{error}</p>
      <Button variant="outline" class="mt-2" onclick={loadImages}>Try Again</Button>
    </div>
  {:else if images.length === 0}
    <div class="text-center py-8 text-gray-500">
      <p>No images found</p>
      <p class="text-sm mt-2">Upload some images to see them here</p>
    </div>
  {:else}
    <div class="grid grid-cols-3 gap-2 w-full">
      {#each images as image (image.url)}
        <div 
          class="relative aspect-square border rounded-md overflow-hidden cursor-pointer hover:border-primary transition-colors"
          onclick={() => selectImage(image.url)}
          title={image.name}
        >
          <img 
            src={image.url} 
            alt={image.name} 
            class="w-full h-full object-cover"
            loading="lazy"
          />
          <div class="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
            {image.name.length > 15 ? image.name.substring(0, 12) + '...' : image.name}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
