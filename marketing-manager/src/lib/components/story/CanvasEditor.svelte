<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import {
    Square,
    Circle,
    Type,
    Image as ImageIcon,
    Trash2,
    Palette,
    ImageUp,
    MessageSquare,
    Layers,
    ZoomIn,
    ZoomOut,
    RefreshCw,
    Maximize,
    Target,
    RotateCcw,
  } from "lucide-svelte";
  import { FileUpload } from "$lib/components/ui/file-upload";
  import ClipNarrationModal from "./ClipNarrationModal.svelte";
  import LayerOrderModal from "./LayerOrderModal.svelte";
  import {
    Canvas,
    Rect,
    Point,
    FabricImage,
    Circle as FabricCircle,
    Textbox,
  } from "fabric";
  import { CanvasService } from "./canvas-service.svelte";
  import { addRectangle } from "./canvas-tools/canvas-rectangle.svelte";
  import { addCircle } from "./canvas-tools/canvas-circle.svelte";
  import { addText } from "./canvas-tools/canvas-text.svelte";
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
  }:{
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

  // Zoom State
  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 5;
  const ZOOM_STEP = 0.1;
  let zoomLevel = $state(1);
  let canvasWidth = $state(800);
  let canvasHeight = $state(600);
  const handleResize = () => {
    setTimeout(fitToView, 100);
  };

  export function hasSelectedObject(): boolean {
    return !!selectedObject;
  }

  let isLoadingCanvas = $state(false);

  // --- Method to load canvas data (no transition) ---
  export async function loadCanvasData(canvasJson: string | null) {
    console.log("Loading canvas data");

    // Set loading flag to prevent event handling during load
    isLoadingCanvas = true;
    console.log("[DEBUG] isLoadingCanvas set to true");

    try {
      if (canvasJson) {
        // Ensure we're working with a string
        let jsonString = canvasJson;

        // If it's already an object (not a string), stringify it first
        if (typeof canvasJson !== "string") {
          try {
            jsonString = JSON.stringify(canvasJson);
            console.log("Converted object to JSON string");
          } catch (stringifyError) {
            console.error("Failed to stringify canvas data:", stringifyError);
            throw stringifyError;
          }
        }

        // Now parse it to validate and ensure it's a proper JSON string
        try {
          // Parse and re-stringify to ensure clean JSON
          const parsedData = JSON.parse(jsonString);
          jsonString = JSON.stringify(parsedData);
        } catch (parseError) {
          console.error("Invalid JSON format:", parseError);
          throw parseError;
        }

        // Load the validated JSON string into the canvas
        try {
          // Clear the canvas first to prevent any issues with existing objects
          canvas.clear();

          // Reset viewport transform to ensure consistent loading
          canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

          // Set a default background color
          canvas.backgroundColor = "#f0f0f0";

          // Only try to load JSON if it's not empty
          if (jsonString && jsonString !== "{}" && jsonString !== "[]") {
            await new Promise<void>((resolve) => {
              try {
                // Parse the JSON string to an object first
                const jsonObj = JSON.parse(jsonString);

                // Check if the JSON has the expected structure
                if (!jsonObj.objects || !Array.isArray(jsonObj.objects)) {
                  console.warn("Invalid canvas JSON structure:", jsonObj);
                  // Create a default empty canvas structure
                  jsonObj.objects = [];
                }

                // Normalize object positions and scales in the JSON before loading
                const canvasWidth = jsonObj.width || canvas.width;
                const canvasHeight = jsonObj.height || canvas.height;

                // Check for and fix extreme values in the JSON data
                let hasExtremeValues = false;
                jsonObj.objects.forEach((obj: any) => {
                  // Store original values for logging
                  const originalLeft = obj.left;
                  const originalTop = obj.top;

                  // More aggressive check for extreme positions (very negative or very large values)
                  if (
                    obj.left !== undefined &&
                    (obj.left < -canvasWidth / 2 ||
                      obj.left > canvasWidth * 1.5)
                  ) {
                    console.warn(
                      `Object has extreme X position: ${originalLeft}`,
                      obj,
                    );
                    hasExtremeValues = true;
                    // Center horizontally with better calculation
                    obj.left =
                      canvasWidth / 2 -
                      ((obj.width || 100) * (obj.scaleX || 1)) / 2;
                    console.log(
                      `Fixed extreme X position: ${originalLeft} -> ${obj.left}`,
                    );
                  }

                  if (
                    obj.top !== undefined &&
                    (obj.top < -canvasHeight / 2 ||
                      obj.top > canvasHeight * 1.5)
                  ) {
                    console.warn(
                      `Object has extreme Y position: ${originalTop}`,
                      obj,
                    );
                    hasExtremeValues = true;
                    // Center vertically with better calculation
                    obj.top =
                      canvasHeight / 2 -
                      ((obj.height || 100) * (obj.scaleY || 1)) / 2;
                    console.log(
                      `Fixed extreme Y position: ${originalTop} -> ${obj.top}`,
                    );
                  }

                  // Check for extreme scale values
                  if (
                    obj.scaleX !== undefined &&
                    (obj.scaleX > 5 || obj.scaleX < 0.1)
                  ) {
                    console.warn(
                      `Object has extreme scaleX: ${obj.scaleX}`,
                      obj,
                    );
                    hasExtremeValues = true;

                    // Calculate actual dimensions and reset scale
                    if (obj.width) {
                      obj.width = obj.width * obj.scaleX;
                      obj.scaleX = 1;
                    }
                  }

                  if (
                    obj.scaleY !== undefined &&
                    (obj.scaleY > 5 || obj.scaleY < 0.1)
                  ) {
                    console.warn(
                      `Object has extreme scaleY: ${obj.scaleY}`,
                      obj,
                    );
                    hasExtremeValues = true;

                    // Calculate actual dimensions and reset scale
                    if (obj.height) {
                      obj.height = obj.height * obj.scaleY;
                      obj.scaleY = 1;
                    }
                  }
                });

                if (hasExtremeValues) {
                  console.log(
                    "Extreme values detected and fixed in JSON data before loading",
                  );
                }

                // Ensure preserveObjectStacking is set before loading
                canvas.preserveObjectStacking = true;

                // Preload images to ensure they are available when loading the canvas
                const imagesToPreload = [];
                for (const obj of jsonObj.objects) {
                  if (obj.type === "image" && obj.src) {
                    // Add to preload list
                    imagesToPreload.push(obj.src);

                    // Ensure the image URL is properly formatted
                    if (
                      !obj.src.startsWith("http") &&
                      !obj.src.startsWith("/")
                    ) {
                      obj.src = `/${obj.src}`;
                    }

                    // Log the image URL for debugging
                    console.log(`Preloading image: ${obj.src}`);
                  }
                }

                // Load the sanitized JSON
                canvas.loadFromJSON(
                  jsonObj,
                  () => {
                    // After loading, ensure all objects have their names properly set
                    // Also check for any Canvas Border objects that might have been loaded
                    const objects = canvas.getObjects();
                    const borderObjects = objects.filter(
                      (obj: any) => obj.name === "Canvas Border",
                    );

                    // Remove any Canvas Border objects that were loaded from JSON
                    if (borderObjects.length > 0) {
                      console.log(
                        `Found ${borderObjects.length} Canvas Border objects in loaded JSON, removing them...`,
                      );
                      borderObjects.forEach((border: any) => {
                        canvas.remove(border);
                      });
                    }

                    // Process remaining objects
                    const remainingObjects = canvas.getObjects();
                    remainingObjects.forEach((obj: any, index: number) => {
                      // If the object doesn't have a name from the JSON, set a default one
                      if (!obj.name) {
                        const defaultName = `Layer ${index + 1}`;
                        obj.name = defaultName;
                        // Force the canvas to recognize the change
                        obj.set("name", defaultName);
                        console.log(
                          `Set default name for object ${index}: ${defaultName}`,
                        );
                      } else {
                        // Ensure the name is properly set using the set method
                        obj.set("name", obj.name);
                        console.log(
                          `Loaded object ${index} with name: ${obj.name}`,
                        );
                      }
                    });

                    // Force all objects to be marked as dirty to ensure they render
                    objects.forEach((obj: any) => {
                      if (obj) {
                        obj.dirty = true;
                      }
                    });

                    // Check if any objects have extreme positions
                    let hasExtremePositions = false;
                    let extremeObjectCount = 0;
                    const maxExtremeObjects = 3; // Only fix if a reasonable number of objects have issues

                    objects.forEach((obj: any) => {
                      if (!obj) return;

                      // Skip Canvas Border objects
                      if (obj.name === "Canvas Border") return;

                      // Check for extreme positions that would cause display issues
                      // Use more conservative thresholds to avoid false positives
                      if (
                        obj.left < -canvas.width ||
                        obj.left > canvas.width * 2 ||
                        obj.top < -canvas.height ||
                        obj.top > canvas.height * 2
                      ) {
                        hasExtremePositions = true;
                        extremeObjectCount++;
                        console.log(
                          `Object ${obj.name || "unnamed"} has extreme position: left=${obj.left}, top=${obj.top}`,
                        );

                        // Fix this object's position directly instead of resetting everything
                        obj.set({
                          left: Math.max(0, Math.min(canvas.width, obj.left)),
                          top: Math.max(0, Math.min(canvas.height, obj.top)),
                        });
                        obj.setCoords();
                      }
                    });

                    // If extreme positions are detected and there are too many to fix individually,
                    // use resetCanvasView as a last resort
                    if (
                      hasExtremePositions &&
                      extremeObjectCount > maxExtremeObjects
                    ) {
                      setTimeout(() => {
                        // Set loading flag to prevent saving during reset
                        isLoadingCanvas = true;
                      }, 100);
                    } else {
                      // Otherwise, use the normal approach
                      const normalized = normalizeObjects();
                      if (normalized) {
                        console.log("Objects were normalized in the canvas");
                      }
                    }

                    canvas.renderAll();
                    // Ensure canvas is properly sized in the view after loading
                    setTimeout(() => {
                      // Temporarily disable event firing to prevent infinite loops
                      const originalFire = canvas.fire;
                      canvas.fire = function () {};

                      // Restore event firing
                      canvas.fire = originalFire;
                      canvas.renderAll();
                      console.log("Canvas data loaded and fitted to view");
                    }, 50);
                    resolve();
                  },
                  (err: any) => {
                    console.warn("Error in fabric.loadFromJSON:", err);

                    // If the error is related to an image, try to fix it
                    if (err && err.type === "image") {
                      console.log(
                        "Attempting to fix image loading error for:",
                        err,
                      );

                      // Try to create a new image object with the same properties but fixed URL
                      try {
                        const wf = window as any;
                        if (wf.fabric && err.src) {
                          // Fix the image URL if needed
                          let fixedSrc = err.src;
                          if (
                            !fixedSrc.startsWith("http") &&
                            !fixedSrc.startsWith("/")
                          ) {
                            fixedSrc = `/${fixedSrc}`;
                          }

                          // Create a new image object with the fixed URL
                          wf.fabric.Image.fromURL(
                            fixedSrc,
                            (img: any) => {
                              if (img) {
                                // Copy properties from the original object
                                img.set({
                                  left: err.left || 0,
                                  top: err.top || 0,
                                  width: err.width || 300,
                                  height: err.height || 300,
                                  scaleX: err.scaleX || 1,
                                  scaleY: err.scaleY || 1,
                                  name: err.name || `image_${Date.now()}`,
                                  angle: err.angle || 0,
                                  opacity: err.opacity || 1,
                                  flipX: err.flipX || false,
                                  flipY: err.flipY || false,
                                });

                                // Add the fixed image to the canvas
                                canvas.add(img);
                                canvas.renderAll();
                                console.log(
                                  "Fixed image added to canvas:",
                                  img,
                                );
                              }
                            },
                            { crossOrigin: "anonymous" },
                          );
                        }
                      } catch (fixError) {
                        console.error(
                          "Failed to fix image loading error:",
                          fixError,
                        );
                      }
                    }

                    // If we get an error, try to recover by checking if the object was added despite the error
                    // This can happen with objects that have extreme positions but are otherwise valid
                    const objects = canvas.getObjects();
                    if (objects && objects.length > 0) {
                      console.log(
                        `Recovered ${objects.length} objects despite loading errors`,
                      );

                      // Remove any problematic objects that might be causing issues
                      // Specifically look for objects with extreme positions or invalid properties
                      const objectsToRemove: any[] = [];
                      objects.forEach((obj: any) => {
                        if (!obj) return;

                        // Check for extreme positions
                        const objBounds = obj.getBoundingRect();
                        if (
                          objBounds.left < -1000 ||
                          objBounds.top < -1000 ||
                          objBounds.left + objBounds.width >
                            canvas.width + 1000 ||
                          objBounds.top + objBounds.height >
                            canvas.height + 1000
                        ) {
                          console.log(
                            `Removing object with extreme position: ${obj.name || "unnamed"}`,
                          );
                          objectsToRemove.push(obj);
                          return;
                        }

                        // Check for extreme scale values
                        if (
                          (obj.scaleX &&
                            (obj.scaleX > 10 || obj.scaleX < 0.01)) ||
                          (obj.scaleY && (obj.scaleY > 10 || obj.scaleY < 0.01))
                        ) {
                          console.log(
                            `Removing object with extreme scale: ${obj.name || "unnamed"}`,
                          );
                          objectsToRemove.push(obj);
                          return;
                        }
                      });

                      // Remove problematic objects
                      if (objectsToRemove.length > 0) {
                        console.log(
                          `Removing ${objectsToRemove.length} problematic objects`,
                        );
                        objectsToRemove.forEach((obj) => canvas.remove(obj));
                      }

                      // Try to normalize any remaining objects
                      const normalized = normalizeObjects();
                      if (normalized) {
                        console.log(
                          "Objects were normalized after loading error",
                        );
                      }

                      // Force a render
                      canvas.renderAll();
                    }

                    // Don't reject, just log the error and continue
                    resolve();
                  },
                );
              } catch (err) {
                console.warn("Exception in loadFromJSON:", err);
                // Don't reject, just log the error and continue
                resolve();
              }
            });
          } else {
            // Just render the empty canvas
            canvas.renderAll();
          }
        } catch (loadError) {
          console.error("Failed to load canvas data:", loadError);
          // Don't throw, just log the error
          // Create a blank canvas instead
          canvas.clear();
          canvas.backgroundColor = "#f0f0f0";
          canvas.renderAll();
        }
      } else {
        // Clear canvas if null is passed
        canvas.clear();
        canvas.backgroundColor = "#f0f0f0";
        canvas.renderAll();
      }
    } catch (error) {
      console.error("Error in loadCanvasData:", error);
      // Create a blank canvas if loading fails
      try {
        canvas.clear();
        canvas.backgroundColor = "#f0f0f0";
        canvas.renderAll();
      } catch (clearError) {
        console.error("Failed to clear canvas:", clearError);
      }
    } finally {
      console.log("Canvas data loaded");

      // Force multiple renders to ensure everything is properly displayed
      if (canvas) {
        // Immediate render
        canvas.renderAll();

        // Delayed render after a short delay
        setTimeout(() => {
          if (canvas) {
            canvas.renderAll();
            console.log("Delayed canvas render completed");

            // Reset loading flag after rendering is complete
            isLoadingCanvas = false;
            console.log("isLoadingCanvas set to false");
          }
        }, 50);
      } else {
        // Reset loading flag if canvas is not available
        isLoadingCanvas = false;
      }
    }
  }

  onMount(async (): Promise<any> => {
    try {
      console.log("CanvasEditor component mounted");
      initializeCanvas();
    } catch (error) {
      console.error("Error loading fabric.js:", error);
    }
  });

  // Initialize canvas
  async function initializeCanvas() {
    console.log("=== INITIALIZING CANVAS ===");
    try {
      canvasService = new CanvasService(canvasElement);
      canvas = canvasService.canvas;
      await canvas.loadFromJSON(canvasDataJson || "{}");
      canvasZoomPan = new CanvasZoomPan(canvas);
      canvasZoomPan.zoomToFit();
      // Set up event listeners
      canvas.on("object:modified", (_: any) => {
        if (isLoadingCanvas) {
          console.log("Skipping object:modified event during canvas loading");
          return;
        }

        // constrainObjectsToCanvas();
        saveCanvas();
      });
      canvas.on("object:added", (_: any) => {
        if (isLoadingCanvas) {
          console.log("Skipping object:added event during canvas loading");
          return;
        }

        saveCanvas();
      });
      canvas.on("object:removed", (_: any) => {
        if (isLoadingCanvas) {
          console.log("Skipping object:removed event during canvas loading");
          return;
        }

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
        if (isLoadingCanvas) {
          return;
        }

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

  // --- Zoom Functions ---
  function setZoom(newZoom: number, point?: { x: number; y: number }) {
    if (!canvas) return;

    // Set the zooming flag to prevent saving during zoom operations
    isZooming = true;

    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    zoomLevel = clampedZoom;

    if (point) {
      canvas.zoomToPoint(point, clampedZoom);
    } else {
      // Zoom to center if no point is provided
      const center = canvas.getCenter();
      canvas.zoomToPoint({ x: center.left, y: center.top }, clampedZoom);
    }

    // Toggle the zoomed-in class on the canvas wrapper based on zoom level
    if (canvasContainer) {
      if (clampedZoom > 0.5) {
        canvasContainer.classList.add("zoomed-in");
      } else {
        canvasContainer.classList.remove("zoomed-in");
      }
    }

    // Reset the zooming flag after a short delay to ensure all events have been processed
    setTimeout(() => {
      isZooming = false;
    }, 100);
    // Note: We don't save canvas on zoom/pan
  }

  function zoomIn() {
    setZoom(zoomLevel + ZOOM_STEP);
  }

  function zoomOut() {
    setZoom(zoomLevel - ZOOM_STEP);
  }

  function resetZoom() {
    setZoom(1);
    // Reset pan as well (optional, might need pan state later)
    canvas.absolutePan({ x: 0, y: 0 });
    canvas.renderAll();
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
  // Function to normalize object scales and positions
  function normalizeObjects() {
    if (!canvas) return false;

    const objects = canvas.getObjects();
    if (!objects || objects.length === 0) return false;

    let modified = false;

    // Process each object
    objects.forEach((obj: any) => {
      if (!obj) return;

      // Check for extreme scale values
      let needsRescale = false;
      if (obj.scaleX && (obj.scaleX > 5 || obj.scaleX < 0.1)) {
        console.log(
          `Object ${obj.name || "unnamed"} has extreme scaleX: ${obj.scaleX}`,
        );
        needsRescale = true;
      }
      if (obj.scaleY && (obj.scaleY > 5 || obj.scaleY < 0.1)) {
        console.log(
          `Object ${obj.name || "unnamed"} has extreme scaleY: ${obj.scaleY}`,
        );
        needsRescale = true;
      }

      // Normalize scale and dimensions
      if (needsRescale) {
        // Calculate actual dimensions
        const actualWidth = obj.width * obj.scaleX;
        const actualHeight = obj.height * obj.scaleY;

        // Reset scale to 1 and set width/height to actual dimensions
        obj.set({
          width: actualWidth,
          height: actualHeight,
          scaleX: 1,
          scaleY: 1,
        });

        console.log(
          `Normalized scale for ${obj.name || "unnamed"}: width=${actualWidth}, height=${actualHeight}`,
        );
        modified = true;
      }

      // Check for extreme positions
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      // If position is way outside canvas bounds, move it to a reasonable position
      // Store original values for logging
      const originalLeft = obj.left;
      const originalTop = obj.top;

      // More aggressive check for extreme positions
      if (
        obj.left !== undefined &&
        (obj.left < -canvasWidth / 2 || obj.left > canvasWidth * 1.5)
      ) {
        // Center the object horizontally
        const newLeft = canvasWidth / 2 - (obj.width * (obj.scaleX || 1)) / 2;
        obj.set("left", newLeft);
        console.log(
          `Fixed extreme X position for ${obj.name || "unnamed"}: ${originalLeft} -> ${newLeft}`,
        );
        modified = true;
      }

      if (
        obj.top !== undefined &&
        (obj.top < -canvasHeight / 2 || obj.top > canvasHeight * 1.5)
      ) {
        // Center the object vertically
        const newTop = canvasHeight / 2 - (obj.height * (obj.scaleY || 1)) / 2;
        obj.set("top", newTop);
        console.log(
          `Fixed extreme Y position for ${obj.name || "unnamed"}: ${originalTop} -> ${newTop}`,
        );
        modified = true;
      }

      // Update coordinates if modified
      if (modified) {
        obj.setCoords();
      }
    });

    if (modified) {
      canvas.renderAll();
    }

    return modified;
  }

  let isSaving = false;

  export function updateCanvasDimensions(width: number, height: number) {
    if (!canvas) return;
  }

  function saveCanvas() {
    if (!canvas) return;
    if (isLoadingCanvas) {
      return;
    }

    if (isZooming && !canvas.getActiveObject()) {
      return;
    }

    if (isSaving) {
      return;
    }

    console.log("Starting saveCanvas operation");

    try {
      isSaving = true;

      // constrainObjectsToCanvas();

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

    try {
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
          obj.name = layerName;
          // Force the canvas to recognize the change
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
    } catch (error) {
      console.error("Error opening layer order modal:", error);
    }
  }

  // Apply the new layer order to the canvas
  function applyLayerOrder(newLayers: any[]) {
    if (!canvas) return;

    try {
      console.log("Applying new layer order using direct stacking methods...");

      // Clear the canvas selection
      canvas.discardActiveObject();

      // Log the layers we're about to reorder
      console.log("Reordering layers:", newLayers);

      // Reverse the layers back to canvas order (bottom to top)
      // Since the modal shows them in reverse (top to bottom)
      const canvasOrderLayers = [...newLayers].reverse();

      // First, bring all objects to the front in the order we want
      // This effectively sets the z-index in the order we want
      for (let i = 0; i < canvasOrderLayers.length; i++) {
        const layer = canvasOrderLayers[i];
        if (layer.object) {
          try {
            // Update the object name if it has changed
            if (layer.name && layer.object.name !== layer.name) {
              console.log(
                `Updating layer name from '${layer.object.name}' to '${layer.name}'`,
              );
              layer.object.name = layer.name;
              // Force the canvas to recognize the change
              layer.object.set("name", layer.name);
            }

            // First, bring the object to the front
            // This ensures it's at the top of the stack
            layer.object.bringToFront();
            console.log(
              `Brought layer to front: ${layer.name} (${layer.type})`,
            );
          } catch (err) {
            // If bringToFront is not available on the object, try using the canvas method
            try {
              // Still update the name
              if (layer.name) {
                layer.object.name = layer.name;
                // Force the canvas to recognize the change
                layer.object.set("name", layer.name);
              }

              canvas.bringToFront(layer.object);
              console.log(
                `Used canvas.bringToFront for: ${layer.name} (${layer.type})`,
              );
            } catch (err2) {
              console.error(
                `Could not bring object to front: ${layer.name}`,
                err2,
              );
            }
          }
        }
      }

      // Force a re-render of the canvas
      canvas.requestRenderAll();

      // Log the final object order
      console.log("Final canvas objects order:", canvas.getObjects());

      // Save the canvas state
      saveCanvas();

      // Only use the fallback approach if the first approach didn't work correctly
      // Check if the current order matches what we want
      const currentObjects = canvas.getObjects();
      let needsFallback = false;

      // Compare the current order with the desired order
      if (currentObjects.length === canvasOrderLayers.length) {
        for (let i = 0; i < currentObjects.length; i++) {
          if (currentObjects[i] !== canvasOrderLayers[i].object) {
            console.log(
              `Order mismatch at position ${i}: expected ${canvasOrderLayers[i].name}, got ${currentObjects[i].name || "unnamed"}`,
            );
            needsFallback = true;
            break;
          }
        }
      } else {
        console.log(
          `Length mismatch: current ${currentObjects.length}, expected ${canvasOrderLayers.length}`,
        );
        needsFallback = true;
      }

      // Only use fallback if needed
      if (needsFallback) {
        setTimeout(() => {
          try {
            console.log("Using fallback approach to reorder layers...");

            // Clear all objects from the canvas
            console.log(
              "Clearing canvas, current objects:",
              canvas.getObjects().length,
            );
            canvas.clear();

            // Create a new reversed copy for the fallback approach
            const fallbackOrderLayers = [...newLayers].reverse();

            // Add them back in the desired order
            for (let i = 0; i < fallbackOrderLayers.length; i++) {
              const layer = fallbackOrderLayers[i];
              if (layer.object) {
                // Update the object name if it has changed
                if (layer.name && layer.object.name !== layer.name) {
                  console.log(
                    `Updating layer name in fallback from '${layer.object.name}' to '${layer.name}'`,
                  );
                  layer.object.name = layer.name;
                  // Force the canvas to recognize the change
                  layer.object.set("name", layer.name);
                }

                canvas.add(layer.object);
                console.log(`Re-added layer: ${layer.name} (${layer.type})`);
              }
            }

            // Force a re-render and save
            canvas.requestRenderAll();
            saveCanvas();
            console.log("Alternative reordering completed");
          } catch (fallbackErr) {
            console.error("Error in fallback reordering:", fallbackErr);
          }
        }, 100);
      }

      console.log("Layer order applied successfully");
    } catch (error) {
      console.error("Error applying layer order:", error);
    }
  }

  export function showLayerOrderModal() {
    if (!canvas) return;
    try {
      console.log("Opening layer order modal from external call");
      openLayerOrderModal();
    } catch (error) {
      console.error("Error opening layer order modal:", error);
    }
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
    if (canvas) {
      try {
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

        // Get the canvas JSON with additional properties
        const canvasJson = canvas.toJSON(); // Include custom properties in serialization

        // Ensure the objects array exists
        if (!canvasJson.objects) {
          canvasJson.objects = [];
        }

        // Stringify the JSON
        const jsonString = JSON.stringify(canvasJson);

        return jsonString;
      } catch (error) {
        console.error("[DEBUG] Error getting current canvas JSON:", error);
        return "{}"; // Return empty JSON on error
      }
    }
    console.warn(
      "[DEBUG] getCurrentCanvasJson called but canvas is not ready.",
    );
    return "{}"; // Return empty JSON if not ready
  }
</script>

<div class="space-y-4">
  {#if !hideControls}
    <div class="flex flex-wrap gap-2 mb-4">
      <Button
        variant="outline"
        onclick={() => addRectangle(canvas)}
        title="Add Rectangle"
      >
        <Square class="h-4 w-4 mr-2" /> Rectangle
      </Button>
      <Button
        variant="outline"
        onclick={() => addCircle(canvas)}
        title="Add Circle"
      >
        <Circle class="h-4 w-4 mr-2" /> Circle
      </Button>
      <Button
        variant="outline"
        onclick={() => addText(canvas)}
        title="Add Text"
      >
        <Type class="h-4 w-4 mr-2" /> Text
      </Button>
      <Button variant="outline" onclick={addImage} title="Add Image">
        <ImageIcon class="h-4 w-4 mr-2" /> Image
      </Button>
      <Button
        variant="outline"
        onclick={setBackgroundColor}
        title="Set Background Color"
      >
        <Palette class="h-4 w-4 mr-2" /> BG Color
      </Button>
      <Button
        variant="outline"
        onclick={setBackgroundImageFromUrl}
        title="Set Background Image"
      >
        <ImageUp class="h-4 w-4 mr-2" /> BG Image
      </Button>
      <Button
        variant="outline"
        onclick={deleteSelected}
        title="Delete Selected"
        disabled={!selectedObject}
        class="ml-auto"
      >
        <Trash2 class="h-4 w-4 mr-2" /> Delete
      </Button>
      <Button variant="outline" onclick={clearCanvas} title="Clear Canvas">
        Clear All
      </Button>
      <Button
        variant="outline"
        onclick={openLayerOrderModal}
        title="Manage Layers"
      >
        <Layers class="h-4 w-4 mr-2" /> Layers
      </Button>
      {#if onNarrationChange}
        <Button
          variant="outline"
          onclick={() => (isNarrationModalOpen = true)}
          title="Edit Narration & Description"
        >
          <MessageSquare class="h-4 w-4 mr-2" /> Edit Content
        </Button>
      {/if}
    </div>
  {/if}
  <div class='flex'>
    <div class="sidebar grow-0 shrink-0">
      <CanvasSidebar {canvas} {canvasService} />
    </div>
    <div class="editor grow min-w-0 flex flex-col">
      <CanvasHeader {canvas} {canvasService} />
      <div class="grow relative overflow-hidden max-h-[calc(50vh)]">
        <canvas id="canvas" class=' ' bind:this={canvasElement}></canvas>

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
        duration: 3000, // Default duration
      }}
      onSave={onNarrationChange}
    />
  {/if}

  <!-- Layer Order Modal -->
  {#if isLayerOrderModalOpen}
    <LayerOrderModal
      open={isLayerOrderModalOpen}
      layers={canvasLayers}
      onSave={applyLayerOrder}
      onClose={() => (isLayerOrderModalOpen = false)}
    />
  {/if}
</div>

<style>
</style>
