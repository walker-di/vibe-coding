<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Slider } from '$lib/components/ui/slider';
  import { Loader2, FileText, X, Copy } from 'lucide-svelte';

  // Props
  let {
    open = false,
    onClose,
    onSvgSelected
  } = $props<{
    open?: boolean;
    onClose?: () => void;
    onSvgSelected?: (url: string) => void;
  }>();

  // State
  let svgPrompt = $state('');
  let width = $state(800);
  let height = $state(600);
  let temperature = $state(0.5);
  let isGenerating = $state(false);
  let error = $state<string | null>(null);
  let generatedSvg = $state<{
    svgUrl: string;
    svg: string;
    metadata: {
      width: number;
      height: number;
      description: string;
      elements: string[];
    };
  } | null>(null);

  // Close the modal
  function close() {
    if (onClose) onClose();
  }

  // Generate SVG handler
  async function handleGenerateSvg() {
    if (!svgPrompt.trim()) {
      error = 'Please enter a prompt.';
      return;
    }

    isGenerating = true;
    error = null;
    generatedSvg = null;

    try {
      // Add a timeout to the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      try {
        const response = await fetch('/api/test/generate-svg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: svgPrompt,
            width,
            height,
            temperature
          }),
          signal: controller.signal
        });

        // Clear the timeout
        clearTimeout(timeoutId);

        const result = await response.json();

        if (!response.ok || !result.success) {
          // Handle API error response
          let errorMessage = result.message || `HTTP error! status: ${response.status}`;
          if (result.errorDetails) {
            console.error('Error details:', result.errorDetails);
          }
          throw new Error(errorMessage);
        }

        // Set the generated SVG
        generatedSvg = {
          svgUrl: result.svgUrl,
          svg: result.svgData.svg,
          metadata: result.svgData.metadata
        };
      } catch (fetchError: any) {
        // Handle fetch errors (network issues, timeouts, etc.)
        console.error('Fetch error:', fetchError);

        if (fetchError.name === 'AbortError') {
          error = 'Request timed out. The SVG generation is taking too long or there might be connectivity issues.';
        } else if (fetchError.message.includes('Failed to fetch')) {
          error = 'Network error. Please check your internet connection and try again.';
        } else {
          error = fetchError.message || 'Failed to generate SVG.';
        }
      } finally {
        // Clear the timeout if it hasn't fired yet
        clearTimeout(timeoutId);
      }
    } catch (err: any) {
      // Handle any other errors
      console.error('SVG generation error:', err);
      error = err.message || 'Failed to generate SVG.';
    } finally {
      isGenerating = false;
    }
  }

  // Use the generated SVG
  function useSvg() {
    if (generatedSvg && onSvgSelected) {
      onSvgSelected(generatedSvg.svgUrl);
      close();
    }
  }

  // Copy SVG code to clipboard
  function copySvgCode() {
    if (!generatedSvg) return;

    navigator.clipboard.writeText(generatedSvg.svg)
      .then(() => {
        console.log('SVG code copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy SVG code:', err);
      });
  }
</script>

{#if open}
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 overflow-y-auto p-4">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="flex justify-between items-center p-4 border-b">
        <h2 class="text-xl font-semibold">Generate SVG</h2>
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
              <Label for="svg-prompt">SVG Description</Label>
              <Textarea
                id="svg-prompt"
                placeholder="Describe the SVG you want to generate..."
                bind:value={svgPrompt}
                disabled={isGenerating}
                rows={5}
              />
            </div>

            <div class="space-y-4">
              <div>
                <div class="flex justify-between mb-2">
                  <Label for="svg-width">Width: {width}px</Label>
                </div>
                <Slider
                  id="svg-width"
                  min={200}
                  max={1600}
                  step={50}
                  value={[width]}
                  onValueChange={(value) => width = value[0]}
                  disabled={isGenerating}
                />
              </div>

              <div>
                <div class="flex justify-between mb-2">
                  <Label for="svg-height">Height: {height}px</Label>
                </div>
                <Slider
                  id="svg-height"
                  min={200}
                  max={1200}
                  step={50}
                  value={[height]}
                  onValueChange={(value) => height = value[0]}
                  disabled={isGenerating}
                />
              </div>

              <div>
                <div class="flex justify-between mb-2">
                  <Label for="temperature">Temperature: {temperature}</Label>
                </div>
                <Slider
                  id="temperature"
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  value={[temperature]}
                  onValueChange={(value) => temperature = value[0]}
                  disabled={isGenerating}
                />
                <p class="text-xs text-gray-500 mt-1">
                  Lower values produce more predictable results, higher values more creative ones
                </p>
              </div>
            </div>

            <Button
              onclick={handleGenerateSvg}
              disabled={isGenerating}
              class="w-full"
            >
              {#if isGenerating}
                <Loader2 class="h-4 w-4 mr-2 animate-spin" /> Generating...
              {:else}
                <FileText class="h-4 w-4 mr-2" /> Generate SVG
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
                <p>Generating SVG...</p>
              </div>
            {:else if generatedSvg}
              <div class="space-y-4">
                <div class="relative border rounded-md p-2 bg-white">
                  {@html generatedSvg.svg}
                </div>

                <div class="space-y-2">
                  <div class="flex justify-between text-sm">
                    <span>Size: {generatedSvg.metadata.width}x{generatedSvg.metadata.height}</span>
                  </div>

                  <div class="flex justify-between text-sm">
                    <span>Description: {generatedSvg.metadata.description}</span>
                  </div>

                  <div class="flex space-x-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onclick={copySvgCode}
                      class="flex-1"
                    >
                      <Copy class="h-4 w-4 mr-2" /> Copy SVG Code
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onclick={useSvg}
                      class="flex-1"
                      disabled={!generatedSvg}
                    >
                      Use SVG
                    </Button>
                  </div>
                </div>
              </div>
            {:else}
              <div class="flex flex-col items-center justify-center h-64 border border-dashed rounded-md">
                <FileText class="h-8 w-8 text-gray-400 mb-2" />
                <p class="text-gray-500">No SVG generated yet</p>
                <p class="text-sm text-gray-400">Enter a prompt and click Generate</p>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
