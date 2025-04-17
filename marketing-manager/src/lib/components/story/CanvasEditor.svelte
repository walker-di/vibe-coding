<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import {
    ImageUp,
  } from "lucide-svelte";
  import { FileUpload } from "$lib/components/ui/file-upload";
  import ClipNarrationModal from "./ClipNarrationModal.svelte";
  import { Canvas, FabricImage } from "fabric";
  import { CanvasService } from "./canvas-service.svelte";
  import { addImageFromUrl } from "./canvas-tools/canvas-image.svelte";
  import CanvasHeader from "./CanvasHeader.svelte";
  import CanvasFooter from "./CanvasFooter.svelte";
  import { CanvasZoomPan } from "./canvas-zoom-pan.svelte";
  import CanvasSidebar from "./CanvasSidebar.svelte";

  let {
    onCanvasChange,
    hideControls = false,
    narration = "",
    description = "",
    onNarrationChange,
    canvasDataJson = $bindable(),
  }: {
    onCanvasChange: (canvasJson: string) => void;
    hideControls?: boolean;
    value: string;
    narration?: string;
    description?: string;
    canvasDataJson?: string;
    onNarrationChange?: (data: {
      narration: string | null;
      description: string | null;
      duration: number | null;
    }) => Promise<void>;
  } = $props();

  // State
  let canvasService = $state<CanvasService>(undefined as any);
  let canvas = $state<Canvas>(undefined as any);
  let selectedObject = $state<any>(null);
  let isNarrationModalOpen = $state(false);
  let isLayerOrderModalOpen = $state(false);
  let canvasLayers = $state<
    Array<{ id: string; name: string; type: string; object: any }>
  >([]);
  let canvasContainer: HTMLDivElement | null = $state(null);
  let canvasElement: HTMLElement | null = $state(null);
  let isZooming = $state(false);
  let resizeObserver: ResizeObserver | null = $state(null);
  let canvasZoomPan = $state<CanvasZoomPan>(undefined as any);

  const handleResize = () => {
    setTimeout(fitToView, 100);
  };

  export function hasSelectedObject(): boolean {
    return !!selectedObject;
  }

  let isLoadingCanvas = $state(false);

  export async function loadCanvasData(canvasJson: string = "{}") {
    isLoadingCanvas = true;
    await canvas.loadFromJSON(canvasJson);
    canvasZoomPan.zoomToFit();
    canvas.renderAll();
    isLoadingCanvas = false;
  }

  onMount(async () => {
    initializeCanvas();
  });

  // Initialize canvas
  async function initializeCanvas() {
    console.log("=== INITIALIZING CANVAS ===");
    try {
      canvasService = new CanvasService(canvasElement);
      canvas = canvasService.canvas;
      canvasZoomPan = new CanvasZoomPan(canvas);
      await loadCanvasData(canvasDataJson);
      // Set up event listeners
      canvas.on("object:modified", (_: any) => {
        if (isLoadingCanvas) return;
        saveCanvas();
      });
      canvas.on("object:added", (_: any) => {
        if (isLoadingCanvas) return;

        saveCanvas();
      });
      canvas.on("object:removed", (_: any) => {
        if (isLoadingCanvas) return;

        saveCanvas();
      });

      canvas.on("selection:created", updateSelection);
      canvas.on("selection:updated", updateSelection);
      canvas.on("selection:cleared", clearSelection);
      canvas.on("object:moving", (e: any) => {
        if (!e.target) return;

        isZooming = false;

        const obj = e.target;
        const objBounds = obj.getBoundingRect();

        if (objBounds.left < 0) {
          obj.left = obj.left - objBounds.left + 1;
        }
        if (objBounds.top < 0) {
          obj.top = obj.top - objBounds.top + 1;
        }
        if (objBounds.left + objBounds.width > canvas.width) {
          obj.left =
            canvas.width - objBounds.width + (obj.left - objBounds.left) - 1;
        }
        if (objBounds.top + objBounds.height > canvas.height) {
          obj.top =
            canvas.height - objBounds.height + (obj.top - objBounds.top) - 1;
        }
      });

      canvas.on("object:moved", (e: any) => {
        if (!e.target) return;
        if (isLoadingCanvas) return;

        isZooming = false;
        saveCanvas();
      });

      window.addEventListener("resize", handleResize);

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          setTimeout(fitToView, 100);
        });

        if (canvasContainer) {
          resizeObserver.observe(canvasContainer);
        }
      }
    } catch (error) {
      console.error("Error initializing canvas:", error);
    }
  }

  function fitToView() {
    canvasZoomPan.zoomToFit();
  }

  // Cleanup mouse wheel listener
  onDestroy(() => {
    if (canvas) {
      canvas.dispose();
    }

    // Clean up ResizeObserver
    if (resizeObserver && canvasContainer) {
      resizeObserver.unobserve(canvasContainer);
      resizeObserver.disconnect();
    }
  });

  let isSaving = false;

  function saveCanvas() {
    if (!canvas) return;
    if (isLoadingCanvas) return;
    if (isZooming && !canvas.getActiveObject()) return;
    if (isSaving) return;

    try {
      isSaving = true;
      const objects = canvas.getObjects();
      objects.forEach((obj: any, index: number) => {
        if (!obj) return;

        if (!obj.name) {
          const defaultName = `Layer ${index + 1}`;
          obj.name = defaultName;
          obj.set("name", defaultName);
        }

        obj.setCoords();
      });

      const canvasJson = canvas.toJSON();
      if (!canvasJson.objects) {
        canvasJson.objects = [];
      }

      canvasJson.objects = canvasJson.objects.filter((obj: any) => {
        if (obj && obj.name === "Canvas Border") {
          return false;
        }

        return obj && obj.type;
      });

      // Stringify the sanitized JSON
      const json = JSON.stringify(canvasJson);

      // Call onCanvasChange directly without setTimeout to ensure immediate update
      onCanvasChange(json);
      canvas.renderAll();
    } catch (error) {
      console.error("Error saving canvas state:", error);
    } finally {
      // Always reset the saving flag
      isSaving = false;
    }
  }

  export function resizeCanvas(width: number, height: number) {
    canvasService.resize(width, height);
  }

  // Update selection / Clear selection / Add/Delete/Clear functions remain the same...
  function updateSelection(e: any) {
    selectedObject = e.selected[0];
  }
  function clearSelection() {
    selectedObject = null;
  }

  // Layer management functions
  function openLayerOrderModal() {
    if (!canvas) return;

    console.log("Opening layer order modal...");

    // Get all objects from the canvas
    const objects = canvas.getObjects();
    console.log("Canvas objects:", objects);

    if (objects.length === 0) {
      console.log("No objects found in canvas");
      alert("No layers to reorder. Add some objects to the canvas first.");
      return;
    }

    // Create a layer object for each canvas object
    // Reverse the objects array to show top layers first in the modal
    // In fabric.js, the last object in the array is on top (highest z-index)
    const reversedObjects = [...objects].reverse();

    canvasLayers = reversedObjects.map((obj: any, index: number) => {
      // Ensure each object has an ID for tracking
      if (!obj.id) {
        obj.id = `layer-${index}-${Date.now()}`;
      }

      // Use the existing name if available, otherwise generate a default name
      const layerName =
        obj.name || `Layer ${objects.length - index} of ${objects.length}`;
      const layerType = obj.type || "unknown";

      // Store the name on the object for persistence
      if (!obj.name) {
        obj.set("name", layerName);
      }

      console.log(
        `Layer ${index} (top to bottom): ${layerName} (${layerType})`,
      );

      return {
        id: obj.id,
        name: layerName,
        type: layerType,
        object: obj,
      };
    });

    console.log("Prepared layers for modal:", canvasLayers);

    // Open the modal
    isLayerOrderModalOpen = true;
  }

  export function showLayerOrderModal() {
    if (!canvas) return;
    console.log("Opening layer order modal from external call");
    openLayerOrderModal();
  }
  // Show file upload dialog for image
  let showFileUploadDialog = $state(false);

  // Handle file upload completion
  function handleImageUpload(event: CustomEvent<{ url: string; file: File }>) {
    const { url } = event.detail;
    addImageFromUrl(canvas, url)();
    showFileUploadDialog = false;
  }

  // Legacy method for backward compatibility
  export function addImage() {
    // Show a dialog with options: URL or Upload
    showFileUploadDialog = true;
  }

  // Method to add image from URL (for backward compatibility)
  export function addImageFromUrlPrompt() {
    if (!canvas) return;
    const url = prompt("Enter image URL:");
    if (!url) return;
    addImageFromUrl(canvas, url);
  }

  export function deleteSelected() {
    if (!canvas || !selectedObject) return;
    canvas.remove(selectedObject);
    selectedObject = null;
    // Save canvas after removing object
    saveCanvas();
  }

  export function clearCanvas() {
    if (!canvas) return;
    if (confirm("Are you sure?")) {
      canvas.clear();
      canvas.backgroundColor = "#f0f0f0";
      canvas.renderAll();
      saveCanvas();
    }
  }

  // --- Background Functions ---
  export function setBackgroundColor() {
    if (!canvas) return;
    const color = prompt(
      "Enter background color (e.g., #ff0000, red, rgb(0,0,255)):",
      canvas.backgroundColor || "#f0f0f0",
    );
    if (color) {
      canvas.backgroundColor = color;
      canvas.renderAll();
      saveCanvas();
    }
  }

  export async function setBackgroundImageFromUrl() {
    if (!canvas) return;
    const url = prompt("Enter background image URL:");
    if (!url) return;
    const img = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const scaleX = canvasWidth / img.width;
    const scaleY = canvasHeight / img.height;
    const scale = Math.min(scaleX, scaleY); // Use min to fit while maintaining aspect ratio

    img.set({
      scaleX: scale,
      scaleY: scale,
      originX: "left",
      originY: "top",
    });

    // canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
    //   // Optional: Set background image options like repeat, etc.
    //   // For scaling to fit, we set scaleX/scaleY on the image itself before setting it as background
    // });
    saveCanvas();
  }

  export function unsetBackgroundImage() {
    if (!canvas) return;
    canvas.backgroundImage = undefined;
    saveCanvas();
  }

  export function getCanvasInstance() {
    return canvas;
  }

  // --- Function to get canvas image data ---
  export async function getCanvasImageDataUrl() {
    const dataUrl = await canvasService.export();
    return dataUrl;
  }

  // --- Function to get current canvas JSON ---
  export function getCurrentCanvasJson(): string {
    // Ensure all objects have their names set before saving
    const objects = canvas.getObjects();
    objects.forEach((obj: any, index: number) => {
      // If the object doesn't have a name, set a default one
      if (!obj.name) {
        const defaultName = `Layer ${index + 1}`;
        obj.name = defaultName;
        // Force the canvas to recognize the change
        obj.set("name", defaultName);
      }
    });

    const canvasJson = canvas.toJSON();
    const jsonString = JSON.stringify(canvasJson);

    return jsonString;
  }
</script>

<div class="space-y-4">
  <div class="flex">
    <div class="sidebar grow-0 shrink-0">
      <CanvasSidebar {canvas} {canvasService} />
    </div>
    <div class="editor grow min-w-0 flex flex-col">
      <CanvasHeader {canvas} {canvasService} />
      <div class="grow relative overflow-hidden max-h-[calc(50vh)]">
        <canvas id="canvas" class=" " bind:this={canvasElement}></canvas>

        {#if !canvas}
          <div
            class="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50"
          >
            <p>Loading canvas...</p>
          </div>
        {/if}
      </div>

      <CanvasFooter {canvas} {canvasService} {canvasZoomPan} />
    </div>
  </div>

  <!-- End Canvas Container -->
  {#if showFileUploadDialog}
    <div
      class="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
    >
      <div class="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h3 class="text-lg font-medium mb-4">Add Image</h3>
        <div class="space-y-4">
          <div>
            <p class="mb-2">Upload a new image:</p>
            <FileUpload
              buttonText="Choose Image"
              accept="image/*"
              on:upload={handleImageUpload}
            />
          </div>
          <div class="border-t pt-4">
            <p class="mb-2">Or add from URL:</p>
            <Button
              variant="outline"
              onclick={() => {
                showFileUploadDialog = false;
                addImageFromUrlPrompt();
              }}
            >
              <ImageUp class="h-4 w-4 mr-2" /> Enter Image URL
            </Button>
          </div>
          <div class="flex justify-end mt-4">
            <Button
              variant="ghost"
              onclick={() => (showFileUploadDialog = false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Modals remain the same -->
  {#if onNarrationChange}
    <ClipNarrationModal
      bind:open={isNarrationModalOpen}
      clip={{
        narration,
        description,
        duration: 3000,
      }}
      onSave={onNarrationChange}
    />
  {/if}
</div>

<style>
</style>
