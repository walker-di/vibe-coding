<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Loader2, RefreshCw, Sparkles } from 'lucide-svelte';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';

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
    isAiGenerated?: boolean;
  };

  // State
  let uploadedImages = $state<ImageItem[]>([]);
  let aiGeneratedImages = $state<ImageItem[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let activeTab = $state('uploaded');

  // Load images on mount
  onMount(() => {
    loadAllImages();
  });

  // Function to load all images
  async function loadAllImages() {
    isLoading = true;
    error = null;

    try {
      // Load both types of images in parallel
      await Promise.all([
        loadUploadedImages(),
        loadAiGeneratedImages()
      ]);
    } catch (err: any) {
      console.error('Error loading images:', err);
      error = err.message || 'Failed to load images';
    } finally {
      isLoading = false;
    }
  }

  // Function to load uploaded images
  async function loadUploadedImages() {
    try {
      const response = await fetch('/api/upload/list-images');

      if (!response.ok) {
        throw new Error(`Failed to load uploaded images: ${response.statusText}`);
      }

      const data = await response.json();
      uploadedImages = data.images.map((img: any) => ({
        ...img,
        lastModified: new Date(img.lastModified),
        isAiGenerated: false
      }));
    } catch (err: any) {
      console.error('Error loading uploaded images:', err);
      throw err;
    }
  }

  // Function to load AI-generated images
  async function loadAiGeneratedImages() {
    try {
      const response = await fetch('/api/upload/list-ai-images');

      if (!response.ok) {
        throw new Error(`Failed to load AI images: ${response.statusText}`);
      }

      const data = await response.json();
      aiGeneratedImages = data.images.map((img: any) => ({
        ...img,
        lastModified: new Date(img.lastModified),
        isAiGenerated: true
      }));
    } catch (err: any) {
      console.error('Error loading AI images:', err);
      throw err;
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

<div class="image-gallery w-full h-full flex flex-col">
  <div class="flex justify-between items-center mb-4">
    <h3 class="text-sm font-medium">Image Gallery</h3>
    <Button variant="ghost" size="sm" onclick={loadAllImages} title="Refresh Gallery">
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
      <Button variant="outline" class="mt-2" onclick={loadAllImages}>Try Again</Button>
    </div>
  {:else}
    <Tabs value={activeTab} onValueChange={(value) => activeTab = value} class="w-full">
      <TabsList class="grid w-full grid-cols-2">
        <TabsTrigger value="uploaded">Uploaded</TabsTrigger>
        <TabsTrigger value="ai-generated" class="flex items-center gap-1">
          <Sparkles class="h-3 w-3" />
          AI Generated
        </TabsTrigger>
      </TabsList>

      <TabsContent value="uploaded">
        {#if uploadedImages.length === 0}
          <div class="text-center py-8 text-gray-500">
            <p>No uploaded images found</p>
            <p class="text-sm mt-2">Upload some images to see them here</p>
          </div>
        {:else}
          <div class="grid grid-cols-3 gap-2 w-full mt-2 overflow-y-auto max-h-[calc(100vh-300px)] pr-1">
            {#each uploadedImages as image (image.url)}
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
      </TabsContent>

      <TabsContent value="ai-generated">
        {#if aiGeneratedImages.length === 0}
          <div class="text-center py-8 text-gray-500">
            <p>No AI-generated images found</p>
            <p class="text-sm mt-2">Use AI Fill to generate images</p>
          </div>
        {:else}
          <div class="grid grid-cols-3 gap-2 w-full mt-2 overflow-y-auto max-h-[calc(100vh-300px)] pr-1">
            {#each aiGeneratedImages as image (image.url)}
              <div
                class="relative aspect-square border rounded-md overflow-hidden cursor-pointer hover:border-primary transition-colors"
                onclick={() => selectImage(image.url)}
                title={image.name}
              >
                <div class="absolute top-0 right-0 bg-primary text-white text-xs p-1 z-10">
                  <Sparkles class="h-3 w-3" />
                </div>
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
      </TabsContent>
    </Tabs>
  {/if}
</div>

<style>
  /* Custom scrollbar styles */
  .overflow-y-auto {
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
  }

  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: transparent;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background-color: rgba(0, 0, 0, 0.3);
  }
</style>
