<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { fade } from 'svelte/transition';
  import { Button } from '$lib/components/ui/button';
  import { Square, Circle, Type, Image as ImageIcon, Trash2, Palette, ImageUp } from 'lucide-svelte'; // Added Palette, ImageUp

  // Props
  let {
    onCanvasChange, // Only need the change handler
    onReady, // Optional callback for when fabric is loaded and canvas initialized
    hideControls = false // Whether to hide the control buttons (when they're shown elsewhere)
  } = $props<{
    onCanvasChange: (canvasJson: string) => void;
    onReady?: () => void;
    hideControls?: boolean;
  }>();

  // State
  let canvas: any = null;
  let canvasContainer: HTMLDivElement;
  let fabricLoaded = $state(false);
  let selectedObject = $state<any>(null);
  let isTransitioning = $state(false); // State for managing fade transition

  // Getter for selectedObject to be used from outside
  export function hasSelectedObject(): boolean {
    return !!selectedObject;
  }

  // Getter for selectedObject to be used from outside

  // --- Method to explicitly load canvas data with transition ---
  export async function loadCanvasData(canvasJson: string | null) {
    if (canvas && fabricLoaded) {
      isTransitioning = true;
      console.log('Transition started (fade out)');
      await tick(); // Allow fade-out to start
      // Optional: Add a small delay if tick isn't enough for visual effect
      // await new Promise(resolve => setTimeout(resolve, 50));

      try {
        if (canvasJson) {
          await new Promise<void>((resolve, reject) => {
            canvas.loadFromJSON(canvasJson, () => {
              canvas.renderAll();
              resolve();
            }, (err: any) => reject(err)); // Added error handling for loadFromJSON
          });
        } else {
          // Clear canvas if null is passed
          canvas.clear();
          canvas.backgroundColor = '#f0f0f0';
          canvas.renderAll();
        }
      } catch (error) {
        console.error('Error in loadCanvasData during transition:', error);
        // Still finish transition even if loading fails
      } finally {
        isTransitioning = false;
        console.log('Transition ended (fade in)');
      }
    } else {
       console.log(`loadCanvasData skipped. Canvas ready: ${!!canvas}, Fabric loaded: ${fabricLoaded}`);
    }
  }
  // --- End of explicit method ---


  // Load fabric.js and initialize canvas
  onMount(async (): Promise<any> => {
    try {
      // Load fabric.js from CDN
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js';
      script.async = true;

       script.onload = () => {
         initializeCanvas();
         fabricLoaded = true;
         onReady?.(); // Signal readiness to the parent
         // Initial load is now fully handled by the parent calling loadCanvasData
       };

       document.body.appendChild(script);

      return () => {
        // Clean up
        if (canvas) {
          canvas.dispose();
        }
        const existingScript = document.querySelector(`script[src="${script.src}"]`);
        if (existingScript && document.body.contains(existingScript)) {
           document.body.removeChild(existingScript);
        }
      };
    } catch (error) {
      console.error('Error loading fabric.js:', error);
    }
  });

  // $effect removed - loading is now imperative via loadCanvasData


  // Initialize canvas
  function initializeCanvas() {
    const windowWithFabric = window as any;
    if (!windowWithFabric.fabric) {
      console.error('Fabric.js not loaded');
      return;
    }

    // Initialize with default dimensions, will be updated by parent if needed
    canvas = new windowWithFabric.fabric.Canvas('canvas', {
      width: 800,
      height: 600,
      backgroundColor: '#f0f0f0'
    });
     console.log('Canvas initialized.');

     // Initial load is now fully handled by the parent calling loadCanvasData

     // Set up event listeners
    canvas.on('object:modified', saveCanvas);
    canvas.on('object:added', saveCanvas);
    canvas.on('object:removed', saveCanvas);
    canvas.on('selection:created', updateSelection);
    canvas.on('selection:updated', updateSelection);
    canvas.on('selection:cleared', clearSelection);
  }

  // Save canvas state
  function saveCanvas() {
    if (canvas) {
      const json = JSON.stringify(canvas.toJSON());
      onCanvasChange(json);
    }
  }

  // Update selection / Clear selection / Add/Delete/Clear functions remain the same...
  function updateSelection(e: any) { selectedObject = e.selected[0]; }
  function clearSelection() { selectedObject = null; }

  // Export these methods so they can be called from SceneEditor
  export function addRectangle() { if (!canvas) return; const wf = window as any; const r = new wf.fabric.Rect({left: 100, top: 100, fill: '#3498db', width: 100, height: 100, strokeWidth: 2, stroke: '#2980b9'}); canvas.add(r); canvas.setActiveObject(r); }
  export function addCircle() { if (!canvas) return; const wf = window as any; const c = new wf.fabric.Circle({left: 100, top: 100, fill: '#e74c3c', radius: 50, strokeWidth: 2, stroke: '#c0392b'}); canvas.add(c); canvas.setActiveObject(c); }
  export function addText() { if (!canvas) return; const wf = window as any; const t = new wf.fabric.Textbox('Text', {left: 100, top: 100, fill: '#2c3e50', fontSize: 24, width: 200}); canvas.add(t); canvas.setActiveObject(t); }
  export function addImage() { if (!canvas) return; const url = prompt('Enter image URL:'); if (!url) return; const wf = window as any; wf.fabric.Image.fromURL(url, (img: any) => { const maxW = canvas.width * 0.8; const maxH = canvas.height * 0.8; if (img.width > maxW || img.height > maxH) { const scale = Math.min(maxW / img.width, maxH / img.height); img.scale(scale); } canvas.add(img); canvas.setActiveObject(img); saveCanvas(); }, { crossOrigin: 'anonymous' }); }
  export function deleteSelected() { if (!canvas || !selectedObject) return; canvas.remove(selectedObject); selectedObject = null; }
  export function clearCanvas() { if (!canvas) return; if (confirm('Are you sure?')) { canvas.clear(); canvas.backgroundColor = '#f0f0f0'; canvas.renderAll(); saveCanvas(); } }

  // --- Background Functions ---
  export function setBackgroundColor() {
    if (!canvas) return;
    const color = prompt('Enter background color (e.g., #ff0000, red, rgb(0,0,255)):', canvas.backgroundColor || '#f0f0f0');
    if (color) {
      canvas.backgroundColor = color;
      canvas.renderAll();
      saveCanvas();
    }
  }

  export function setBackgroundImageFromUrl() {
    if (!canvas) return;
    const url = prompt('Enter background image URL:');
    if (!url) return;
    const wf = window as any;
    wf.fabric.Image.fromURL(url, (img: any) => {
      // Scale the image to fit the canvas dimensions
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const scaleX = canvasWidth / img.width;
      const scaleY = canvasHeight / img.height;
      const scale = Math.min(scaleX, scaleY); // Use min to fit while maintaining aspect ratio

      img.set({
        scaleX: scale,
        scaleY: scale,
        originX: 'left',
        originY: 'top'
      });

      canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
        // Optional: Set background image options like repeat, etc.
        // For scaling to fit, we set scaleX/scaleY on the image itself before setting it as background
      });
      saveCanvas();
    }, { crossOrigin: 'anonymous' });
  }
  // --- End Background Functions ---


  // Expose the canvas instance for parent components
  export function getCanvasInstance() {
    return canvas;
  }

  // --- Method to update canvas dimensions ---
  export function updateDimensions(newWidth: number, newHeight: number) {
    if (canvas && fabricLoaded) {
      console.log(`CanvasEditor: Updating dimensions to ${newWidth}x${newHeight}`);
      // Use setDimensions which is more efficient than separate setWidth/setHeight calls
      canvas.setDimensions({ width: newWidth, height: newHeight });
      // Adjust background image scaling if necessary? Might need more complex logic if background image exists.
      canvas.renderAll();
      saveCanvas(); // Save state after resize
    } else {
      console.warn(`updateDimensions called but canvas not ready. W: ${newWidth}, H: ${newHeight}`);
    }
  }
  // --- End Method ---


  // --- Function to get canvas image data ---
  export function getCanvasImageDataUrl(): string | null {
    if (canvas && fabricLoaded) {
      try {
        // Export as PNG data URL
        return canvas.toDataURL({ format: 'png', quality: 0.8 }); // Adjust quality as needed
      } catch (error) {
        console.error('Error generating canvas data URL:', error);
        return null;
      }
    }
    console.warn('getCanvasImageDataUrl called but canvas is not ready.');
    return null;
  }
  // --- End function ---

</script>

<div class="space-y-4">
  {#if !hideControls}
  <div class="flex flex-wrap gap-2 mb-4">
    <Button variant="outline" onclick={addRectangle} title="Add Rectangle" disabled={!fabricLoaded}>
      <Square class="h-4 w-4 mr-2" /> Rectangle
    </Button>
    <Button variant="outline" onclick={addCircle} title="Add Circle" disabled={!fabricLoaded}>
      <Circle class="h-4 w-4 mr-2" /> Circle
    </Button>
    <Button variant="outline" onclick={addText} title="Add Text" disabled={!fabricLoaded}>
      <Type class="h-4 w-4 mr-2" /> Text
    </Button>
    <Button variant="outline" onclick={addImage} title="Add Image" disabled={!fabricLoaded}>
      <ImageIcon class="h-4 w-4 mr-2" /> Image
    </Button>
    <Button variant="outline" onclick={setBackgroundColor} title="Set Background Color" disabled={!fabricLoaded}>
      <Palette class="h-4 w-4 mr-2" /> BG Color
    </Button>
    <Button variant="outline" onclick={setBackgroundImageFromUrl} title="Set Background Image" disabled={!fabricLoaded}>
      <ImageUp class="h-4 w-4 mr-2" /> BG Image
    </Button>
    <Button variant="outline" onclick={deleteSelected} title="Delete Selected" disabled={!fabricLoaded || !selectedObject} class="ml-auto">
      <Trash2 class="h-4 w-4 mr-2" /> Delete
    </Button>
    <Button variant="outline" onclick={clearCanvas} title="Clear Canvas" disabled={!fabricLoaded}>
      Clear All
    </Button>
  </div>
  {/if}

  <div class="border rounded-md overflow-hidden relative min-h-[500px]" bind:this={canvasContainer}>
    {#if !isTransitioning}
      <div transition:fade={{ duration: 150 }}>
        <canvas id="canvas"></canvas>
      </div>
    {:else}
      <!-- Optional: Placeholder or spinner during transition -->
       <div class="absolute inset-0 flex items-center justify-center bg-gray-100/50">
         <!-- Loading... -->
       </div>
    {/if}
  </div>


  {#if !fabricLoaded && !isTransitioning}
    <div class="text-center py-4">
      <p>Loading canvas editor...</p>
    </div>
  {/if}
</div>
