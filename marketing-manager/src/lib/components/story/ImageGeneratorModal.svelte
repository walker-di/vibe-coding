<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Loader2, Image as ImageIcon, X } from 'lucide-svelte';
  import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';

  // Props
  let {
    open = false,
    onClose,
    onImageSelected
  } = $props<{
    open?: boolean;
    onClose?: () => void;
    onImageSelected?: (url: string) => void;
  }>();

  // State
  let imagePrompt = $state('');
  let aspectRatio = $state<'1:1' | '16:9'>('1:1');
  let isGenerating = $state(false);
  let error = $state<string | null>(null);
  let generatedImageUrl = $state<string | null>(null);

  // Close the modal
  function close() {
    if (onClose) onClose();
  }

  // Generate image handler
  async function handleGenerateImage() {
    if (!imagePrompt.trim()) {
      error = 'Please enter a prompt.';
      return;
    }

    isGenerating = true;
    error = null;
    generatedImageUrl = null;

    try {
      // Add a timeout to the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      try {
        const response = await fetch('/api/test/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: imagePrompt,
            aspectRatio
          }),
          signal: controller.signal
        });

        // Clear the timeout
        clearTimeout(timeoutId);

        const result = await response.json();

        if (!response.ok || !result.success) {
          // Handle API error response
          let errorMessage = result.message || `HTTP error! status: ${response.status}`;
          throw new Error(errorMessage);
        }

        // Set the generated image URL
        generatedImageUrl = result.imageUrl;
      } catch (fetchError: any) {
        // Handle fetch errors (network issues, timeouts, etc.)
        console.error('Fetch error:', fetchError);

        if (fetchError.name === 'AbortError') {
          error = 'Request timed out. The image generation is taking too long or there might be connectivity issues.';
        } else if (fetchError.message.includes('Failed to fetch')) {
          error = 'Network error. Please check your internet connection and try again.';
        } else {
          error = fetchError.message || 'Failed to generate image.';
        }
      } finally {
        // Clear the timeout if it hasn't fired yet
        clearTimeout(timeoutId);
      }
    } catch (err: any) {
      // Handle any other errors
      console.error('Image generation error:', err);
      error = err.message || 'Failed to generate image.';
    } finally {
      isGenerating = false;
    }
  }

  // Use the generated image
  function useImage() {
    if (generatedImageUrl && onImageSelected) {
      onImageSelected(generatedImageUrl);
      close();
    }
  }
</script>

{#if open}
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 overflow-y-auto p-4">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="flex justify-between items-center p-4 border-b">
        <h2 class="text-xl font-semibold">Generate Image</h2>
        <button
          class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          onclick={close}
          aria-label="Close"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Input Panel -->
          <div class="space-y-4">
            <div>
              <Label for="image-prompt">Image Description</Label>
              <Textarea
                id="image-prompt"
                placeholder="Describe the image you want to generate..."
                bind:value={imagePrompt}
                disabled={isGenerating}
                rows={5}
              />
            </div>

            <div>
              <Label>Aspect Ratio</Label>
              <RadioGroup value={aspectRatio} onValueChange={(value) => aspectRatio = value as '1:1' | '16:9'} class="mt-2">
                <div class="flex items-center space-x-2">
                  <RadioGroupItem value="1:1" id="ratio-1-1" />
                  <Label for="ratio-1-1">1:1 (Square)</Label>
                </div>
                <div class="flex items-center space-x-2">
                  <RadioGroupItem value="16:9" id="ratio-16-9" />
                  <Label for="ratio-16-9">16:9 (Widescreen)</Label>
                </div>
              </RadioGroup>
            </div>

            <Button
              onclick={handleGenerateImage}
              disabled={isGenerating}
              class="w-full"
            >
              {#if isGenerating}
                <Loader2 class="h-4 w-4 mr-2 animate-spin" /> Generating...
              {:else}
                <ImageIcon class="h-4 w-4 mr-2" /> Generate Image
              {/if}
            </Button>

            {#if error}
              <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mt-2" role="alert">
                <strong class="font-bold">Error: </strong>
                <span class="block sm:inline">{error}</span>
              </div>
            {/if}
          </div>

          <!-- Preview Panel -->
          <div class="border rounded-lg p-4">
            <h3 class="text-lg font-semibold mb-4">Preview</h3>

            {#if isGenerating}
              <div class="flex flex-col items-center justify-center h-64 border border-dashed rounded-md">
                <Loader2 class="h-8 w-8 animate-spin text-primary mb-2" />
                <p>Generating image...</p>
              </div>
            {:else if generatedImageUrl}
              <div class="space-y-4">
                <div class="relative border rounded-md overflow-hidden">
                  <img
                    src={generatedImageUrl}
                    alt=""
                    class="w-full h-auto"
                  />
                </div>

                <div class="flex justify-end mt-4">
                  <Button
                    onclick={useImage}
                    disabled={!generatedImageUrl}
                  >
                    Use Image
                  </Button>
                </div>
              </div>
            {:else}
              <div class="flex flex-col items-center justify-center h-64 border border-dashed rounded-md">
                <ImageIcon class="h-8 w-8 text-gray-400 mb-2" />
                <p class="text-gray-500">No image generated yet</p>
                <p class="text-sm text-gray-400">Enter a prompt and click Generate</p>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
