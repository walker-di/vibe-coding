<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Square, Circle, Type, Image as ImageIcon, Trash2, Palette, ImageUp, MessageSquare, Layers } from 'lucide-svelte';
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
                        obj.name = `Layer ${index + 1}`;
                        console.log(`Set default name for object ${index}: ${obj.name}`);
                      } else {
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
    } catch (error) {
      console.error('Error initializing canvas:', error);
    }
  }

  // Save canvas state
  function saveCanvas() {
    if (canvas) {
      try {
        // Ensure all objects have their names set before saving
        const objects = canvas.getObjects();
        objects.forEach((obj: any, index: number) => {
          // If the object doesn't have a name, set a default one
          if (!obj.name) {
            obj.name = `Layer ${index + 1}`;
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
      canvasLayers = objects.map((obj: any, index: number) => {
        // Ensure each object has an ID for tracking
        if (!obj.id) {
          obj.id = `layer-${index}-${Date.now()}`;
        }

        // Use the existing name if available, otherwise generate a default name
        const layerName = obj.name || `Layer ${index + 1}`;
        const layerType = obj.type || 'unknown';

        // Store the name on the object for persistence
        if (!obj.name) {
          obj.name = layerName;
        }

        console.log(`Layer ${index}: ${layerName} (${layerType})`);

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

      // First, bring all objects to the front in reverse order
      // This effectively sets the z-index in the order we want
      for (let i = 0; i < newLayers.length; i++) {
        const layer = newLayers[i];
        if (layer.object) {
          try {
            // Update the object name if it has changed
            if (layer.name && layer.object.name !== layer.name) {
              console.log(`Updating layer name from '${layer.object.name}' to '${layer.name}'`);
              layer.object.name = layer.name;
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

          // Add them back in the desired order
          for (let i = 0; i < newLayers.length; i++) {
            const layer = newLayers[i];
            if (layer.object) {
              // Update the object name if it has changed
              if (layer.name && layer.object.name !== layer.name) {
                console.log(`Updating layer name in fallback from '${layer.object.name}' to '${layer.name}'`);
                layer.object.name = layer.name;
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
    const r = new wf.fabric.Rect({
      left: 100,
      top: 100,
      fill: '#3498db',
      width: 100,
      height: 100,
      strokeWidth: 2,
      stroke: '#2980b9',
      name: `Rectangle ${objectCount + 1}` // Add a name
    });
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
    const c = new wf.fabric.Circle({
      left: 100,
      top: 100,
      fill: '#e74c3c',
      radius: 50,
      strokeWidth: 2,
      stroke: '#c0392b',
      name: `Circle ${objectCount + 1}` // Add a name
    });
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
    const t = new wf.fabric.Textbox('Text', {
      left: 100,
      top: 100,
      fill: '#2c3e50',
      fontSize: 24,
      width: 200,
      name: `Text ${objectCount + 1}` // Add a name
    });
    canvas.add(t);
    canvas.setActiveObject(t);
    // Save canvas after adding object
    saveCanvas();
  }

  export function addImage() {
    if (!canvas) return;
    const url = prompt('Enter image URL:');
    if (!url) return;
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
      img.name = `Image ${objectCount + 1}`;
      canvas.add(img);
      canvas.setActiveObject(img);
      saveCanvas();
    }, { crossOrigin: 'anonymous' });
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

  // --- Function to get current canvas JSON ---
  export function getCurrentCanvasJson(): string {
    if (canvas && fabricLoaded) {
      try {
        // Ensure all objects have their names set before saving
        const objects = canvas.getObjects();
        objects.forEach((obj: any, index: number) => {
          // If the object doesn't have a name, set a default one
          if (!obj.name) {
            obj.name = `Layer ${index + 1}`;
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

  <div class="border rounded-md overflow-hidden relative min-h-[500px]">
    <div>
      <canvas id="canvas"></canvas>
    </div>
  </div>


  {#if !fabricLoaded}
    <div class="text-center py-4">
      <p>Loading canvas editor...</p>
    </div>
  {/if}

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
