<script lang="ts">
  import { onMount } from 'svelte';
  import * as fabric from 'fabric';

  let { canvasData, width = 800, height = 600 } = $props<{ 
    canvasData: string;
    width?: number;
    height?: number;
  }>();
  
  let canvasElement: HTMLCanvasElement;
  let fabricCanvas: fabric.StaticCanvas; // Use StaticCanvas for non-interactive preview

  onMount(() => {
    // Use StaticCanvas for a non-editable preview
    fabricCanvas = new fabric.StaticCanvas(canvasElement, { 
      width,
      height,
      // selection: false, // Not needed for StaticCanvas, it's non-interactive by default
      renderOnAddRemove: true,
      preserveObjectStacking: true
    });
    
    try {
      // Load the canvas data from JSON
      if (canvasData) {
        fabricCanvas.loadFromJSON(canvasData, () => {
          // Explicitly set dimensions after loading, might help with smaller canvases
          fabricCanvas.setDimensions({ width: width, height: height });
          // Ensure rendering happens after data is fully loaded and canvas is ready
          requestAnimationFrame(() => fabricCanvas.renderAll());
        });
      }
    } catch (error) {
      console.error('Error loading canvas data:', error);
    }
    
    return () => {
      // Clean up
      if (fabricCanvas) {
        fabricCanvas.dispose();
      }
     };
   });
 
   // $effect hook removed for simplification - rely on onMount for initial load.
   // If canvasData needs to be reactive later, this effect would need careful implementation
   // (e.g., clearing canvas before loading new data).
 
 </script>
 
 <div class="canvas-preview">
  <canvas bind:this={canvasElement}></canvas>
</div>

<style>
  .canvas-preview {
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: hidden;
    margin: 0 auto;
  }
</style>
