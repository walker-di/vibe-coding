<script lang="ts">
  import { onMount } from 'svelte';
  import * as fabric from 'fabric';

  let { canvasData, width = 800, height = 600 } = $props<{ 
    canvasData: string;
    width?: number;
    height?: number;
  }>();
  
  let canvasElement: HTMLCanvasElement;
  let fabricCanvas: fabric.Canvas;

  onMount(() => {
    fabricCanvas = new fabric.Canvas(canvasElement, {
      width,
      height,
      selection: false, // Disable selection in preview mode
      renderOnAddRemove: true,
      preserveObjectStacking: true
    });
    
    try {
      // Load the canvas data from JSON
      if (canvasData) {
        fabricCanvas.loadFromJSON(canvasData, () => {
          fabricCanvas.renderAll();
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

  // Update canvas when canvasData changes
  $effect(() => {
    if (fabricCanvas && canvasData) {
      try {
        fabricCanvas.loadFromJSON(canvasData, () => {
          fabricCanvas.renderAll();
        });
      } catch (error) {
        console.error('Error updating canvas data:', error);
      }
    }
  });
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
