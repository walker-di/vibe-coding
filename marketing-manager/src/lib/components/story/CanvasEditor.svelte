<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Square, Circle, Type, Image as ImageIcon, Trash2 } from 'lucide-svelte';

  // Props
  let { 
    initialCanvas,
    onCanvasChange
  } = $props<{
    initialCanvas: string;
    onCanvasChange: (canvasJson: string) => void;
  }>();

  // State
  let canvas: any = null;
  let canvasContainer: HTMLDivElement;
  let fabricLoaded = $state(false);
  let selectedObject = $state<any>(null);

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
      };
      
      document.body.appendChild(script);
      
      return () => {
        // Clean up
        if (canvas) {
          canvas.dispose();
        }
        document.body.removeChild(script);
      };
    } catch (error) {
      console.error('Error loading fabric.js:', error);
    }
  });

  // Initialize canvas
  function initializeCanvas() {
    // Use type assertion to avoid TypeScript errors
    const windowWithFabric = window as any;
    if (!windowWithFabric.fabric) {
      console.error('Fabric.js not loaded');
      return;
    }
    
    // Create canvas
    canvas = new windowWithFabric.fabric.Canvas('canvas', {
      width: 600,
      height: 400,
      backgroundColor: '#f0f0f0'
    });
    
    // Load initial canvas data if available
    if (initialCanvas && initialCanvas !== '{}') {
      try {
        canvas.loadFromJSON(initialCanvas, () => {
          canvas.renderAll();
        });
      } catch (error) {
        console.error('Error loading canvas data:', error);
      }
    }
    
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

  // Update selection
  function updateSelection(e: any) {
    selectedObject = e.selected[0];
  }

  // Clear selection
  function clearSelection() {
    selectedObject = null;
  }

  // Add rectangle
  function addRectangle() {
    if (!canvas) return;
    
    // Use type assertion to avoid TypeScript errors
    const windowWithFabric = window as any;
    const rect = new windowWithFabric.fabric.Rect({
      left: 100,
      top: 100,
      fill: '#3498db',
      width: 100,
      height: 100,
      strokeWidth: 2,
      stroke: '#2980b9'
    });
    
    canvas.add(rect);
    canvas.setActiveObject(rect);
  }

  // Add circle
  function addCircle() {
    if (!canvas) return;
    
    // Use type assertion to avoid TypeScript errors
    const windowWithFabric = window as any;
    const circle = new windowWithFabric.fabric.Circle({
      left: 100,
      top: 100,
      fill: '#e74c3c',
      radius: 50,
      strokeWidth: 2,
      stroke: '#c0392b'
    });
    
    canvas.add(circle);
    canvas.setActiveObject(circle);
  }

  // Add text
  function addText() {
    if (!canvas) return;
    
    // Use type assertion to avoid TypeScript errors
    const windowWithFabric = window as any;
    const text = new windowWithFabric.fabric.Textbox('Text', {
      left: 100,
      top: 100,
      fill: '#2c3e50',
      fontSize: 24,
      width: 200
    });
    
    canvas.add(text);
    canvas.setActiveObject(text);
  }

  // Add image
  function addImage() {
    if (!canvas) return;
    
    const imageUrl = prompt('Enter image URL:');
    if (!imageUrl) return;
    
    // Use type assertion to avoid TypeScript errors
    const windowWithFabric = window as any;
    windowWithFabric.fabric.Image.fromURL(imageUrl, (img: any) => {
      // Scale image to fit canvas
      const maxWidth = canvas.width * 0.8;
      const maxHeight = canvas.height * 0.8;
      
      if (img.width > maxWidth || img.height > maxHeight) {
        const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
        img.scale(scale);
      }
      
      canvas.add(img);
      canvas.setActiveObject(img);
      saveCanvas();
    }, { crossOrigin: 'anonymous' });
  }

  // Delete selected object
  function deleteSelected() {
    if (!canvas || !selectedObject) return;
    
    canvas.remove(selectedObject);
    selectedObject = null;
  }

  // Clear canvas
  function clearCanvas() {
    if (!canvas) return;
    
    if (confirm('Are you sure you want to clear the canvas?')) {
      canvas.clear();
      canvas.backgroundColor = '#f0f0f0';
      canvas.renderAll();
      saveCanvas();
    }
  }

  // Expose the canvas instance for parent components
  export function getCanvasInstance() {
    return canvas;
  }
</script>

<div class="space-y-4">
  <div class="flex flex-wrap gap-2 mb-4">
    <Button variant="outline" onclick={addRectangle} title="Add Rectangle" disabled={!fabricLoaded}>
      <Square class="h-4 w-4 mr-2" />
      Rectangle
    </Button>
    <Button variant="outline" onclick={addCircle} title="Add Circle" disabled={!fabricLoaded}>
      <Circle class="h-4 w-4 mr-2" />
      Circle
    </Button>
    <Button variant="outline" onclick={addText} title="Add Text" disabled={!fabricLoaded}>
      <Type class="h-4 w-4 mr-2" />
      Text
    </Button>
    <Button variant="outline" onclick={addImage} title="Add Image" disabled={!fabricLoaded}>
      <ImageIcon class="h-4 w-4 mr-2" />
      Image
    </Button>
    <Button variant="outline" onclick={deleteSelected} title="Delete Selected" disabled={!fabricLoaded || !selectedObject} class="ml-auto">
      <Trash2 class="h-4 w-4 mr-2" />
      Delete
    </Button>
    <Button variant="outline" onclick={clearCanvas} title="Clear Canvas" disabled={!fabricLoaded}>
      Clear All
    </Button>
  </div>
  
  <div class="border rounded-md overflow-hidden" bind:this={canvasContainer}>
    <canvas id="canvas"></canvas>
  </div>
  
  {#if !fabricLoaded}
    <div class="text-center py-4">
      <p>Loading canvas editor...</p>
    </div>
  {/if}
</div>
