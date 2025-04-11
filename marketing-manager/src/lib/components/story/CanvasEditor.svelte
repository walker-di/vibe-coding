<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Slider } from '$lib/components/ui/slider'; // Import Slider
  import { Square, Circle, Type, Image as ImageIcon, Trash2, Palette, ImageUp, MessageSquare, Layers, Upload, ZoomIn, ZoomOut, RefreshCw, Maximize } from 'lucide-svelte';
  import { FileUpload } from '$lib/components/ui/file-upload';
  import ClipNarrationModal from './ClipNarrationModal.svelte';
  import LayerOrderModal from './LayerOrderModal.svelte';

  // Props
  let {
    onCanvasChange, // Only need the change handler
    onReady, // Optional callback for when fabric is loaded and canvas initialized
    hideControls = false, // Whether to hide the control buttons (when they're shown elsewhere)
    narration = '', // Narration text for the clip
    description = '', // Description for the clip
    onNarrationChange // Callback for when narration/description is changed
  } = $props<{
    onCanvasChange: (canvasJson: string) => void;
    onReady?: () => void;
    hideControls?: boolean;
    narration?: string;
    description?: string;
    onNarrationChange?: (data: { narration: string | null; description: string | null; duration: number | null }) => Promise<void>;
  }>();

  // State
  let canvas: any = null;
  let fabricLoaded = $state(false);
  let selectedObject = $state<any>(null);
  // Removed transition state
  let isNarrationModalOpen = $state(false); // State for narration modal
  let isLayerOrderModalOpen = $state(false); // State for layer order modal
  let canvasLayers = $state<Array<{id: string, name: string, type: string, object: any}>>([]);
  let canvasContainer: HTMLDivElement | null = $state(null); // Reference to the container div

  // Zoom State
  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 5;
  const ZOOM_STEP = 0.1;
  let zoomLevel = $state(1);
  let canvasWidth = $state(800); // Default, will be updated
  let canvasHeight = $state(600); // Default, will be updated

  // Getter for selectedObject to be used from outside
  export function hasSelectedObject(): boolean {
    return !!selectedObject;
  }

  // Getter for selectedObject to be used from outside

  // Track the last loaded canvas data to prevent redundant loads
  let lastLoadedCanvasData = $state<string | null>(null);

  // --- Method to load canvas data (no transition) ---
  export async function loadCanvasData(canvasJson: string | null) {
    // Skip if the canvas data is the same as what's already loaded
    if (canvasJson === lastLoadedCanvasData) {
      console.log('Skipping loadCanvasData - same data already loaded');
      return;
    }

    // Handle undefined or null canvas data
    if (!canvasJson) {
      console.log('Canvas data is null or undefined, loading empty canvas');
      // Still update lastLoadedCanvasData to prevent reloading
      lastLoadedCanvasData = canvasJson;

      // If canvas is ready, clear it and set default background
      if (canvas && fabricLoaded) {
        canvas.clear();
        canvas.backgroundColor = '#f0f0f0';
        canvas.renderAll();
      }
      return;
    }

    // Update the last loaded canvas data
    lastLoadedCanvasData = canvasJson;

    if (canvas && fabricLoaded) {
      console.log('Loading canvas data');

      try {
        if (canvasJson) {
          // Ensure we're working with a string
          let jsonString = canvasJson;

          // If it's already an object (not a string), stringify it first
          if (typeof canvasJson !== 'string') {
            try {
              jsonString = JSON.stringify(canvasJson);
              console.log('Converted object to JSON string');
            } catch (stringifyError) {
              console.error('Failed to stringify canvas data:', stringifyError);
              throw stringifyError;
            }
          }

          // Now parse it to validate and ensure it's a proper JSON string
          try {
            // Parse and re-stringify to ensure clean JSON
            const parsedData = JSON.parse(jsonString);
            jsonString = JSON.stringify(parsedData);
          } catch (parseError) {
            console.error('Invalid JSON format:', parseError);
            throw parseError;
          }

          // Load the validated JSON string into the canvas
          try {
            // Clear the canvas first to prevent any issues with existing objects
            canvas.clear();

            // Set a default background color
            canvas.backgroundColor = '#f0f0f0';

            // Only try to load JSON if it's not empty
            if (jsonString && jsonString !== '{}' && jsonString !== '[]') {
              await new Promise<void>((resolve) => {
                try {
                  // Parse the JSON string to an object first
                  const jsonObj = JSON.parse(jsonString);

                  // Check if the JSON has the expected structure
                  if (!jsonObj.objects || !Array.isArray(jsonObj.objects)) {
                    console.warn('Invalid canvas JSON structure:', jsonObj);
                    // Create a default empty canvas structure
                    jsonObj.objects = [];
                  }

                  // Filter out any problematic objects
                  jsonObj.objects = jsonObj.objects.filter((obj: any) => {
                    // Keep only objects with valid types
                    const validTypes = ['rect', 'circle', 'text', 'textbox', 'image', 'path', 'polygon', 'polyline', 'line', 'triangle'];
                    const isValid = obj && obj.type && validTypes.includes(obj.type.toLowerCase());
                    if (!isValid) {
                      console.warn('Filtering out invalid object:', obj);
                    }
                    return isValid;
                  });

                  // Load the sanitized JSON
                  canvas.loadFromJSON(jsonObj, () => {
                    // After loading, ensure all objects have their names properly set
                    const objects = canvas.getObjects();
                    objects.forEach((obj: any, index: number) => {
                      // If the object doesn't have a name from the JSON, set a default one
                      if (!obj.name) {
                        const defaultName = `Layer ${index + 1}`;
                        obj.name = defaultName;
                        // Force the canvas to recognize the change
                        obj.set('name', defaultName);
                        console.log(`Set default name for object ${index}: ${defaultName}`);
                      } else {
                        // Ensure the name is properly set using the set method
                        obj.set('name', obj.name);
                        console.log(`Loaded object ${index} with name: ${obj.name}`);
                      }
                    });

                    canvas.renderAll();
                    resolve();
                  }, (err: any) => {
                    console.warn('Error in fabric.loadFromJSON:', err);
                    // Don't reject, just log the error and continue
                    resolve();
                  });
                } catch (err) {
                  console.warn('Exception in loadFromJSON:', err);
                  // Don't reject, just log the error and continue
                  resolve();
                }
              });
            } else {
              // Just render the empty canvas
              canvas.renderAll();
            }
          } catch (loadError) {
            console.error('Failed to load canvas data:', loadError);
            // Don't throw, just log the error
            // Create a blank canvas instead
            canvas.clear();
            canvas.backgroundColor = '#f0f0f0';
            canvas.renderAll();
          }
        } else {
          // Clear canvas if null is passed
          canvas.clear();
          canvas.backgroundColor = '#f0f0f0';
          canvas.renderAll();
        }
      } catch (error) {
        console.error('Error in loadCanvasData during transition:', error);
        // Create a blank canvas if loading fails
        try {
          canvas.clear();
          canvas.backgroundColor = '#f0f0f0';
          canvas.renderAll();
        } catch (clearError) {
          console.error('Failed to clear canvas:', clearError);
        }
      } finally {
        console.log('Canvas data loaded');
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
    try {
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

      // Add mouse wheel zoom listener
      canvas.on('mouse:wheel', handleMouseWheel);

    } catch (error) {
      console.error('Error initializing canvas:', error);
    }
  }

  // --- Zoom Functions ---
  function setZoom(newZoom: number, point?: { x: number; y: number }) {
    if (!canvas || !fabricLoaded) return;
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    zoomLevel = clampedZoom;

    if (point) {
      canvas.zoomToPoint(point, clampedZoom);
    } else {
      // Zoom to center if no point is provided
      const center = canvas.getCenter();
      canvas.zoomToPoint({ x: center.left, y: center.top }, clampedZoom);
    }
    canvas.renderAll();
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
    if (!canvas || !canvasContainer || !fabricLoaded) return;
    const containerWidth = canvasContainer.clientWidth;
    const containerHeight = canvasContainer.clientHeight;
    const scaleX = containerWidth / canvasWidth;
    const scaleY = containerHeight / canvasHeight;
    const newZoom = Math.min(scaleX, scaleY) * 0.95; // Add a little padding
    setZoom(newZoom);
    // Center the canvas after fitting
    canvas.absolutePan({ x: 0, y: 0 });
    canvas.renderAll();
  }

  function handleMouseWheel(opt: any) {
    if (!canvas || !fabricLoaded) return;
    const delta = opt.e.deltaY;
    let newZoom = canvas.getZoom();
    newZoom *= 0.999 ** delta; // Adjust multiplier for sensitivity
    if (newZoom > MAX_ZOOM) newZoom = MAX_ZOOM;
    if (newZoom < MIN_ZOOM) newZoom = MIN_ZOOM;

    // Zoom towards the mouse pointer
    setZoom(newZoom, { x: opt.e.offsetX, y: opt.e.offsetY });

    opt.e.preventDefault();
    opt.e.stopPropagation();
  }

  // Cleanup mouse wheel listener
  onDestroy(() => {
    if (canvas) {
      canvas.off('mouse:wheel', handleMouseWheel);
    }
  });
  // --- End Zoom Functions ---

  // Save canvas state
  function saveCanvas() {
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
            obj.set('name', defaultName);
          }
        });

        // Get the canvas JSON with additional properties
        const canvasJson = canvas.toJSON(['name', 'id']); // Include custom properties in serialization

        // Ensure the objects array exists
        if (!canvasJson.objects) {
          canvasJson.objects = [];
        }

        // Filter out any problematic objects
        canvasJson.objects = canvasJson.objects.filter((obj: any) => {
          // Keep only objects with valid types
          const validTypes = ['rect', 'circle', 'text', 'textbox', 'image', 'path', 'polygon', 'polyline', 'line', 'triangle'];
          return obj && obj.type && validTypes.includes(obj.type.toLowerCase());
        });

        // Log the objects being saved to verify names are included
        console.log('Saving canvas with objects:', canvasJson.objects);

        // Stringify the sanitized JSON
        const json = JSON.stringify(canvasJson);
        console.log('Canvas changed, saving state');
        onCanvasChange(json);
      } catch (error) {
        console.error('Error saving canvas state:', error);
      }
    }
  }

  // Update selection / Clear selection / Add/Delete/Clear functions remain the same...
  function updateSelection(e: any) { selectedObject = e.selected[0]; }
  function clearSelection() { selectedObject = null; }

  // Layer management functions
  function openLayerOrderModal() {
    if (!canvas || !fabricLoaded) return;

    try {
      console.log('Opening layer order modal...');

      // Get all objects from the canvas
      const objects = canvas.getObjects();
      console.log('Canvas objects:', objects);

      if (objects.length === 0) {
        console.log('No objects found in canvas');
        alert('No layers to reorder. Add some objects to the canvas first.');
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
        const layerName = obj.name || `Layer ${(objects.length - index)} of ${objects.length}`;
        const layerType = obj.type || 'unknown';

        // Store the name on the object for persistence
        if (!obj.name) {
          obj.name = layerName;
          // Force the canvas to recognize the change
          obj.set('name', layerName);
        }

        console.log(`Layer ${index} (top to bottom): ${layerName} (${layerType})`);

        return {
          id: obj.id,
          name: layerName,
          type: layerType,
          object: obj
        };
      });

      console.log('Prepared layers for modal:', canvasLayers);

      // Open the modal
      isLayerOrderModalOpen = true;
    } catch (error) {
      console.error('Error opening layer order modal:', error);
    }
  }

  // Apply the new layer order to the canvas
  function applyLayerOrder(newLayers: any[]) {
    if (!canvas || !fabricLoaded) return;

    try {
      console.log('Applying new layer order using direct stacking methods...');

      // Clear the canvas selection
      canvas.discardActiveObject();

      // Log the layers we're about to reorder
      console.log('Reordering layers:', newLayers);

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
              console.log(`Updating layer name from '${layer.object.name}' to '${layer.name}'`);
              layer.object.name = layer.name;
              // Force the canvas to recognize the change
              layer.object.set('name', layer.name);
            }

            // First, bring the object to the front
            // This ensures it's at the top of the stack
            layer.object.bringToFront();
            console.log(`Brought layer to front: ${layer.name} (${layer.type})`);
          } catch (err) {
            // If bringToFront is not available on the object, try using the canvas method
            try {
              // Still update the name
              if (layer.name) {
                layer.object.name = layer.name;
                // Force the canvas to recognize the change
                layer.object.set('name', layer.name);
              }

              canvas.bringToFront(layer.object);
              console.log(`Used canvas.bringToFront for: ${layer.name} (${layer.type})`);
            } catch (err2) {
              console.error(`Could not bring object to front: ${layer.name}`, err2);
            }
          }
        }
      }

      // Force a re-render of the canvas
      canvas.requestRenderAll();

      // Log the final object order
      console.log('Final canvas objects order:', canvas.getObjects());

      // Save the canvas state
      saveCanvas();

      // Try a different approach if the first one didn't work
      // This is a fallback that uses a more direct approach
      setTimeout(() => {
        try {
          console.log('Trying alternative approach to reorder layers...');

          // Clear all objects from the canvas
          console.log('Clearing canvas, current objects:', canvas.getObjects().length);
          canvas.clear();

          // Create a new reversed copy for the fallback approach
          const fallbackOrderLayers = [...newLayers].reverse();

          // Add them back in the desired order
          for (let i = 0; i < fallbackOrderLayers.length; i++) {
            const layer = fallbackOrderLayers[i];
            if (layer.object) {
              // Update the object name if it has changed
              if (layer.name && layer.object.name !== layer.name) {
                console.log(`Updating layer name in fallback from '${layer.object.name}' to '${layer.name}'`);
                layer.object.name = layer.name;
                // Force the canvas to recognize the change
                layer.object.set('name', layer.name);
              }

              canvas.add(layer.object);
              console.log(`Re-added layer: ${layer.name} (${layer.type})`);
            }
          }

          // Force a re-render and save
          canvas.requestRenderAll();
          saveCanvas();
          console.log('Alternative reordering completed');
        } catch (fallbackErr) {
          console.error('Error in fallback reordering:', fallbackErr);
        }
      }, 100);

      console.log('Layer order applied successfully');
    } catch (error) {
      console.error('Error applying layer order:', error);
    }
  }

  // Export these methods so they can be called from SceneEditor
  export function addRectangle() {
    if (!canvas) return;
    const wf = window as any;
    // Get the current number of objects to create a unique name
    const objectCount = canvas.getObjects().length;
    const objectName = `Rectangle ${objectCount + 1}`;
    const r = new wf.fabric.Rect({
      left: 100,
      top: 100,
      fill: '#3498db',
      width: 100,
      height: 100,
      strokeWidth: 2,
      stroke: '#2980b9',
      name: objectName // Add a name
    });
    // Ensure the name is set using the set method
    r.set('name', objectName);
    canvas.add(r);
    canvas.setActiveObject(r);
    // Save canvas after adding object
    saveCanvas();
  }

  export function addCircle() {
    if (!canvas) return;
    const wf = window as any;
    // Get the current number of objects to create a unique name
    const objectCount = canvas.getObjects().length;
    const objectName = `Circle ${objectCount + 1}`;
    const c = new wf.fabric.Circle({
      left: 100,
      top: 100,
      fill: '#e74c3c',
      radius: 50,
      strokeWidth: 2,
      stroke: '#c0392b',
      name: objectName // Add a name
    });
    // Ensure the name is set using the set method
    c.set('name', objectName);
    canvas.add(c);
    canvas.setActiveObject(c);
    // Save canvas after adding object
    saveCanvas();
  }

  export function showLayerOrderModal() {
    if (!canvas || !fabricLoaded) return;
    try {
      console.log('Opening layer order modal from external call');
      openLayerOrderModal();
    } catch (error) {
      console.error('Error opening layer order modal:', error);
    }
  }
  export function addText() {
    if (!canvas) return;
    const wf = window as any;
    // Get the current number of objects to create a unique name
    const objectCount = canvas.getObjects().length;
    const objectName = `Text ${objectCount + 1}`;
    const t = new wf.fabric.Textbox('Text', {
      left: 100,
      top: 100,
      fill: '#2c3e50',
      fontSize: 24,
      width: 200,
      name: objectName // Add a name
    });
    // Ensure the name is set using the set method
    t.set('name', objectName);
    canvas.add(t);
    canvas.setActiveObject(t);
    // Save canvas after adding object
    saveCanvas();
  }

  // Show file upload dialog for image
  let showFileUploadDialog = $state(false);

  // Handle file upload completion
  function handleImageUpload(event: CustomEvent<{ url: string, file: File }>) {
    const { url } = event.detail;
    addImageFromUrl(url);
    showFileUploadDialog = false;
  }

  // Add image from URL
  function addImageFromUrl(url: string) {
    if (!canvas || !url) return;

    const wf = window as any;
    // Get the current number of objects to create a unique name
    const objectCount = canvas.getObjects().length;
    wf.fabric.Image.fromURL(url, (img: any) => {
      const maxW = canvas.width * 0.8;
      const maxH = canvas.height * 0.8;
      if (img.width > maxW || img.height > maxH) {
        const scale = Math.min(maxW / img.width, maxH / img.height);
        img.scale(scale);
      }
      // Set a name for the image
      const objectName = `Image ${objectCount + 1}`;
      img.name = objectName;
      // Ensure the name is set using the set method
      img.set('name', objectName);
      canvas.add(img);
      canvas.setActiveObject(img);
      saveCanvas();
    }, { crossOrigin: 'anonymous' });
  }

  // Legacy method for backward compatibility
  export function addImage() {
    // Show a dialog with options: URL or Upload
    showFileUploadDialog = true;
  }

  // Method to add image from URL (for backward compatibility)
  export function addImageFromUrlPrompt() {
    if (!canvas) return;
    const url = prompt('Enter image URL:');
    if (!url) return;
    addImageFromUrl(url);
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
    if (confirm('Are you sure?')) {
      canvas.clear();
      canvas.backgroundColor = '#f0f0f0';
      canvas.renderAll();
      saveCanvas();
    }
  }

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

  export function unsetBackgroundImage() {
    if (!canvas) return;
    canvas.setBackgroundImage(null, canvas.renderAll.bind(canvas));
    saveCanvas();
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
      canvasWidth = newWidth;
      canvasHeight = newHeight;
      // Update the fabric canvas dimensions
      canvas.setWidth(newWidth);
      canvas.setHeight(newHeight);
      // Re-center viewport if needed, or fit to view
      fitToView(); // Fit to view after dimension change
      canvas.renderAll();
      // Don't save canvas on dimension change itself, only on content change
    } else {
      console.warn(`updateDimensions called but canvas not ready. W: ${newWidth}, H: ${newHeight}`);
      // Store dimensions even if canvas isn't ready yet, for initialization
      canvasWidth = newWidth;
      canvasHeight = newHeight;
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

  // --- Function to get current canvas JSON ---
  export function getCurrentCanvasJson(): string {
    if (canvas && fabricLoaded) {
      try {
        // Ensure all objects have their names set before saving
        const objects = canvas.getObjects();
        objects.forEach((obj: any, index: number) => {
          // If the object doesn't have a name, set a default one
          if (!obj.name) {
            const defaultName = `Layer ${index + 1}`;
            obj.name = defaultName;
            // Force the canvas to recognize the change
            obj.set('name', defaultName);
          }
        });

        // Get the canvas JSON with additional properties
        const canvasJson = canvas.toJSON(['name', 'id']); // Include custom properties in serialization

        // Ensure the objects array exists
        if (!canvasJson.objects) {
          canvasJson.objects = [];
        }
        // Filter out any problematic objects (optional, but good practice)
        canvasJson.objects = canvasJson.objects.filter((obj: any) => {
          const validTypes = ['rect', 'circle', 'text', 'textbox', 'image', 'path', 'polygon', 'polyline', 'line', 'triangle'];
          return obj && obj.type && validTypes.includes(obj.type.toLowerCase());
        });

        // Log the objects being saved to verify names are included
        console.log('Getting current canvas JSON with objects:', canvasJson.objects);

        return JSON.stringify(canvasJson);
      } catch (error) {
        console.error('Error getting current canvas JSON:', error);
        return '{}'; // Return empty JSON on error
      }
    }
    console.warn('getCurrentCanvasJson called but canvas is not ready.');
    return '{}'; // Return empty JSON if not ready
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
    <Button variant="outline" onclick={openLayerOrderModal} title="Manage Layers" disabled={!fabricLoaded}>
      <Layers class="h-4 w-4 mr-2" /> Layers
    </Button>
    {#if onNarrationChange}
      <Button variant="outline" onclick={() => isNarrationModalOpen = true} title="Edit Narration & Description" disabled={!fabricLoaded}>
        <MessageSquare class="h-4 w-4 mr-2" /> Edit Content
      </Button>
    {/if}
  </div>
  {/if}

  <!-- Zoom Controls -->
  <div class="flex items-center gap-2 mb-2 p-2 border rounded-md bg-muted/50">
    <Button variant="outline" size="icon" onclick={zoomOut} title="Zoom Out" disabled={!fabricLoaded || zoomLevel <= MIN_ZOOM}>
      <ZoomOut class="h-4 w-4" />
    </Button>
    <Slider
      min={MIN_ZOOM}
      max={MAX_ZOOM}
      step={ZOOM_STEP / 10} 
      value={[zoomLevel]}
      onValueChange={(value) => setZoom(value[0])}
      class="w-32"
      disabled={!fabricLoaded}
    />
    <Button variant="outline" size="icon" onclick={zoomIn} title="Zoom In" disabled={!fabricLoaded || zoomLevel >= MAX_ZOOM}>
      <ZoomIn class="h-4 w-4" />
    </Button>
    <Button variant="outline" size="icon" onclick={resetZoom} title="Reset Zoom (100%)" disabled={!fabricLoaded}>
      <RefreshCw class="h-4 w-4" />
    </Button>
     <Button variant="outline" size="icon" onclick={fitToView} title="Fit to View" disabled={!fabricLoaded || !canvasContainer}>
      <Maximize class="h-4 w-4" />
    </Button>
    <span class="text-sm ml-2">Zoom: {Math.round(zoomLevel * 100)}%</span>
    <span class="text-sm ml-auto">Canvas: {canvasWidth} x {canvasHeight} px</span>
  </div>
  <!-- End Zoom Controls -->

  <!-- Canvas Container -->
  <div bind:this={canvasContainer} class="border rounded-md overflow-auto relative bg-gray-200 dark:bg-gray-700" style="height: 60vh; min-height: 500px;">
    <canvas id="canvas"></canvas>
    {#if !fabricLoaded}
      <div class="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50">
        <p>Loading canvas...</p>
      </div>
    {/if}
  </div>
  <!-- End Canvas Container -->


  {#if showFileUploadDialog}
    <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
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
            <Button variant="outline" onclick={() => {
              showFileUploadDialog = false;
              addImageFromUrlPrompt();
            }}>
              <ImageUp class="h-4 w-4 mr-2" /> Enter Image URL
            </Button>
          </div>
          <div class="flex justify-end mt-4">
            <Button variant="ghost" onclick={() => showFileUploadDialog = false}>
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
        duration: 3000 // Default duration
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
      onClose={() => isLayerOrderModalOpen = false}
    />
  {/if}
</div>
