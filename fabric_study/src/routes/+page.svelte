<script lang="ts">
  import { CanvasService } from "$lib/canvas-service.svelte";
  import { CanvasZoomPan } from "$lib/canvas-zoom-pan.svelte";
  import ZoomMenu from "$lib/components/ZoomMenu.svelte";
  import Sidebar from "$lib/components/Sidebar.svelte";
  import SidebarContent from "$lib/components/SidebarContent.svelte";
  import HeaderMenu from "$lib/components/HeaderMenu.svelte";
  import TextSelectionMenu from "$lib/components/TextSelectionMenu.svelte";
  import ShapeStyleMenu from "$lib/components/ShapeStyleMenu.svelte";
  import ClipMaskMenu from "$lib/components/ClipMaskMenu.svelte";
  import ImageReplaceMenu from "$lib/components/ImageReplaceMenu.svelte";
  import { Canvas } from "fabric";
  import addImage from "$lib/tools/canvas-image.svelte";
  import addSVG from "$lib/tools/canvas-svg.svelte";
  import { onMount } from "svelte";

  let canvasEl = $state<HTMLCanvasElement>();
  let canvasService = $state<CanvasService>(undefined as any);
  let canvas = $state<Canvas>(undefined as any);
  let canvasZoomPan = $state<CanvasZoomPan>(undefined as any);
  let activeTab = $state('elements');
  let showSidebarContent = $state(true);

  const handleResize = () => {
    if (canvasService) {
      // Use requestAnimationFrame to ensure DOM is fully rendered
      requestAnimationFrame(() => {
        canvasService.centerCanvas();
      });
    }
  };

  onMount(() => {
    canvasService = new CanvasService(canvasEl);
    canvas = canvasService.canvas;
    canvasZoomPan = new CanvasZoomPan(canvas);

    // Listen for tab change events
    document.addEventListener('tabChange', (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      activeTab = customEvent.detail;
      showSidebarContent = true;
    });

  });

  // Function to add an image from file upload
  function handleImageUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (f) => {
          const data = f.target?.result;
          // Use our new addImage function that respects original size
          const addImageFn = addImage(canvas, data as string);
          await addImageFn();
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  // Function to add an SVG from file upload
  function handleSVGUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".svg";
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (f) => {
          const svgString = f.target?.result as string;
          // Use our SVG import function
          const addSVGFn = addSVG(canvas, svgString);
          await addSVGFn();
        };
        reader.readAsText(file); // Read as text instead of DataURL for SVG files
      }
    };
    input.click();
  }

  async function exportCanvas() {
    await canvasService.download();
  }

  function togglePanMode() {
    canvasZoomPan.togglePanMode();
  }
</script>

<svelte:window onresize={handleResize} />

<div class="app-container">
  <!-- Sidebar Navigation -->
  <Sidebar activeTab={activeTab} />

  <!-- Sidebar Content -->
  {#if showSidebarContent}
    <SidebarContent activeTab={activeTab} canvas={canvas} {canvasService} />
  {/if}

  <!-- Main Content -->
  <div class="main-content">
    <!-- Header Menu -->
    <HeaderMenu canvas={canvas} />
    <div class="toolbar mb-4 flex gap-2 flex-wrap">
      <button class="btn" onclick={() => canvasService.toggleDrawing()}>
        {canvasService?.isDrawing ? "Stop Drawing" : "Start Drawing"}
      </button>
      <button class="btn" onclick={togglePanMode}>
        {canvasZoomPan?.isPanMode ? "Select/Move" : "Pan"}
      </button>
      <button class="btn" onclick={handleImageUpload}>Add Image</button>
      <button class="btn" onclick={handleSVGUpload}>Add SVG</button>
      <button class="btn" onclick={exportCanvas}>Export</button>
      <button class="btn" onclick={() => canvasZoomPan.resetZoom()}>Reset Zoom</button>
      <button class="btn bg-green-500 hover:bg-green-600" onclick={() => canvasService.centerCanvas()}>Center Canvas</button>
    </div>

    <div class="canvas-container border border-gray-300 relative">
      <canvas bind:this={canvasEl}></canvas>

      <!-- Zoom Menu -->
      {#if canvasZoomPan}
        <div class="zoom-menu-wrapper">
          <ZoomMenu canvasZoomPan={canvasZoomPan} />
        </div>
      {/if}

      <!-- Text Selection Menu -->
      {#if canvas}
        <TextSelectionMenu canvas={canvas} />
      {/if}

      <!-- Shape Style Menu -->
      {#if canvas}
        <ShapeStyleMenu canvas={canvas} />
      {/if}

      <!-- Clip Mask Menu -->
      {#if canvas}
        <ClipMaskMenu canvas={canvas} />
      {/if}

      <!-- Image Replace Menu -->
      {#if canvas}
        <ImageReplaceMenu canvas={canvas} />
      {/if}
    </div>
  </div>
</div>

<style>
  .app-container {
    display: flex;
    height: 98vh;
    width: 99vw;
    overflow: hidden;
  }

  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 1rem;
    overflow: hidden;
  }

  .toolbar {
    padding-bottom: 0.5rem;
  }

  .canvas-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
    padding: 0;
    margin: 0;
    flex: 1;
  }

  .zoom-menu-wrapper {
    position: absolute;
    bottom: 20px;
    right: 20px;
    z-index: 100;
    background-color: white;
    padding: 0;
  }

  .canvas-container :global(.canvas-container) {
    width: 100% !important;
    height: 100% !important;
  }

  .btn {
    background-color: rgb(59, 130, 246);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    transition: background-color 0.2s;
  }

  .btn:hover {
    background-color: rgb(37, 99, 235);
  }
</style>
