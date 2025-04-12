<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Square, Circle, Type, Image as ImageIcon, Trash2, Palette, ImageUp, MessageSquare, Layers, ZoomIn, ZoomOut, RefreshCw, Maximize, Target, RotateCcw } from 'lucide-svelte';
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
  let canvasBorder: any = null; // Reference to the canvas border object
  let isZooming = $state(false); // Flag to track zoom operations

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

  // Flag to temporarily disable canvas events during loading
  let isLoadingCanvas = $state(false);

  // --- Method to load canvas data (no transition) ---
  export async function loadCanvasData(canvasJson: string | null) {
    console.log('loadCanvasData called with data length:', canvasJson?.length || 0);

    // Always load the canvas data, even if it's the same as what's already loaded
    // This ensures the canvas is properly updated when switching between clips

    // Handle undefined or null canvas data
    if (!canvasJson) {
      console.log('Canvas data is null or undefined, loading empty canvas');

      // If canvas is ready, clear it and set default background
      if (canvas && fabricLoaded) {
        // Remove existing border
        if (canvasBorder) {
          canvas.remove(canvasBorder);
          canvasBorder = null;
        }

        // Reset viewport transform to ensure consistent loading
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

        canvas.clear();
        canvas.backgroundColor = '#f0f0f0';
        canvas.renderAll();

        // Ensure canvas is properly sized in the view
        setTimeout(() => {
          addCanvasBorder();
          fitToView();
          canvas.renderAll();
          console.log('Empty canvas loaded and fitted to view');
        }, 50);
      }
      return;
    }

    if (canvas && fabricLoaded) {
      console.log('Loading canvas data');

      // Set loading flag to prevent event handling during load
      isLoadingCanvas = true;
      console.log('[DEBUG] isLoadingCanvas set to true');

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

            // Reset viewport transform to ensure consistent loading
            canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

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

                  // Filter out any problematic objects and Canvas Border objects
                  jsonObj.objects = jsonObj.objects.filter((obj: any) => {
                    // Filter out Canvas Border objects
                    if (obj && obj.name === 'Canvas Border') {
                      console.log('Filtering out Canvas Border object from loaded JSON');
                      return false;
                    }

                    // Keep only objects with valid types
                    const validTypes = ['rect', 'circle', 'text', 'textbox', 'image', 'path', 'polygon', 'polyline', 'line', 'triangle'];
                    const isValid = obj && obj.type && validTypes.includes(obj.type.toLowerCase());
                    if (!isValid) {
                      console.warn('Filtering out invalid object:', obj);
                    }
                    return isValid;
                  });

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
                    if (obj.left !== undefined && (obj.left < -canvasWidth / 2 || obj.left > canvasWidth * 1.5)) {
                      console.warn(`Object has extreme X position: ${originalLeft}`, obj);
                      hasExtremeValues = true;
                      // Center horizontally with better calculation
                      obj.left = canvasWidth / 2 - ((obj.width || 100) * (obj.scaleX || 1)) / 2;
                      console.log(`Fixed extreme X position: ${originalLeft} -> ${obj.left}`);
                    }

                    if (obj.top !== undefined && (obj.top < -canvasHeight / 2 || obj.top > canvasHeight * 1.5)) {
                      console.warn(`Object has extreme Y position: ${originalTop}`, obj);
                      hasExtremeValues = true;
                      // Center vertically with better calculation
                      obj.top = canvasHeight / 2 - ((obj.height || 100) * (obj.scaleY || 1)) / 2;
                      console.log(`Fixed extreme Y position: ${originalTop} -> ${obj.top}`);
                    }

                    // Check for extreme scale values
                    if (obj.scaleX !== undefined && (obj.scaleX > 5 || obj.scaleX < 0.1)) {
                      console.warn(`Object has extreme scaleX: ${obj.scaleX}`, obj);
                      hasExtremeValues = true;

                      // Calculate actual dimensions and reset scale
                      if (obj.width) {
                        obj.width = obj.width * obj.scaleX;
                        obj.scaleX = 1;
                      }
                    }

                    if (obj.scaleY !== undefined && (obj.scaleY > 5 || obj.scaleY < 0.1)) {
                      console.warn(`Object has extreme scaleY: ${obj.scaleY}`, obj);
                      hasExtremeValues = true;

                      // Calculate actual dimensions and reset scale
                      if (obj.height) {
                        obj.height = obj.height * obj.scaleY;
                        obj.scaleY = 1;
                      }
                    }
                  });

                  if (hasExtremeValues) {
                    console.log('Extreme values detected and fixed in JSON data before loading');
                  }

                  // Ensure preserveObjectStacking is set before loading
                  canvas.preserveObjectStacking = true;

                  // Load the sanitized JSON
                  canvas.loadFromJSON(jsonObj, () => {
                    // After loading, ensure all objects have their names properly set
                    // Also check for any Canvas Border objects that might have been loaded
                    const objects = canvas.getObjects();
                    const borderObjects = objects.filter((obj: any) => obj.name === 'Canvas Border');

                    // Remove any Canvas Border objects that were loaded from JSON
                    if (borderObjects.length > 0) {
                      console.log(`Found ${borderObjects.length} Canvas Border objects in loaded JSON, removing them...`);
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
                        obj.set('name', defaultName);
                        console.log(`Set default name for object ${index}: ${defaultName}`);
                      } else {
                        // Ensure the name is properly set using the set method
                        obj.set('name', obj.name);
                        console.log(`Loaded object ${index} with name: ${obj.name}`);
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
                      if (obj.name === 'Canvas Border') return;

                      // Check for extreme positions that would cause display issues
                      // Use more conservative thresholds to avoid false positives
                      if (obj.left < -canvas.width || obj.left > canvas.width * 2 ||
                          obj.top < -canvas.height || obj.top > canvas.height * 2) {
                        hasExtremePositions = true;
                        extremeObjectCount++;
                        console.log(`Object ${obj.name || 'unnamed'} has extreme position: left=${obj.left}, top=${obj.top}`);

                        // Fix this object's position directly instead of resetting everything
                        obj.set({
                          left: Math.max(0, Math.min(canvas.width, obj.left)),
                          top: Math.max(0, Math.min(canvas.height, obj.top))
                        });
                        obj.setCoords();
                      }
                    });

                    // If extreme positions are detected and there are too many to fix individually,
                    // use resetCanvasView as a last resort
                    if (hasExtremePositions && extremeObjectCount > maxExtremeObjects) {
                      console.log('Extreme positions detected, recreating objects with correct positions');
                      // Use setTimeout to ensure the canvas is fully loaded before resetting
                      setTimeout(() => {
                        // Set loading flag to prevent saving during reset
                        isLoadingCanvas = true;
                        resetCanvasView();
                      }, 100);
                    } else {
                      // Otherwise, use the normal approach
                      const normalized = normalizeObjects();
                      if (normalized) {
                        console.log('Objects were normalized in the canvas');
                      }

                      const centered = centerAllObjects();
                      if (centered) {
                        console.log('Objects were centered in the canvas');
                      }
                    }

                    canvas.renderAll();
                    // Ensure canvas is properly sized in the view after loading
                    setTimeout(() => {
                      // Temporarily disable event firing to prevent infinite loops
                      const originalFire = canvas.fire;
                      canvas.fire = function() {};

                      // Add the border after loading
                      addCanvasBorder();

                      // Make sure border is on top
                      if (canvasBorder) {
                        canvas.bringToFront(canvasBorder);
                      }

                      // Restore event firing
                      canvas.fire = originalFire;

                      // Fit to view
                      fitToView();
                      canvas.renderAll();
                      console.log('Canvas data loaded and fitted to view');
                    }, 50);
                    resolve();
                  }, (err: any) => {
                    console.warn('Error in fabric.loadFromJSON:', err);

                    // If we get an error, try to recover by checking if the object was added despite the error
                    // This can happen with objects that have extreme positions but are otherwise valid
                    const objects = canvas.getObjects();
                    if (objects && objects.length > 0) {
                      console.log(`Recovered ${objects.length} objects despite loading errors`);

                      // Remove any problematic objects that might be causing issues
                      // Specifically look for objects with extreme positions or invalid properties
                      const objectsToRemove: any[] = [];
                      objects.forEach((obj: any) => {
                        if (!obj) return;

                        // Check for extreme positions
                        const objBounds = obj.getBoundingRect();
                        if (objBounds.left < -1000 || objBounds.top < -1000 ||
                            objBounds.left + objBounds.width > canvas.width + 1000 ||
                            objBounds.top + objBounds.height > canvas.height + 1000) {
                          console.log(`Removing object with extreme position: ${obj.name || 'unnamed'}`);
                          objectsToRemove.push(obj);
                          return;
                        }

                        // Check for extreme scale values
                        if ((obj.scaleX && (obj.scaleX > 10 || obj.scaleX < 0.01)) ||
                            (obj.scaleY && (obj.scaleY > 10 || obj.scaleY < 0.01))) {
                          console.log(`Removing object with extreme scale: ${obj.name || 'unnamed'}`);
                          objectsToRemove.push(obj);
                          return;
                        }
                      });

                      // Remove problematic objects
                      if (objectsToRemove.length > 0) {
                        console.log(`Removing ${objectsToRemove.length} problematic objects`);
                        objectsToRemove.forEach(obj => canvas.remove(obj));
                      }

                      // Try to normalize any remaining objects
                      const normalized = normalizeObjects();
                      if (normalized) {
                        console.log('Objects were normalized after loading error');
                      }

                      // Try to center objects
                      const centered = centerAllObjects();
                      if (centered) {
                        console.log('Objects were centered after loading error');
                      }

                      // Force a render
                      canvas.renderAll();
                    }

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
        console.error('Error in loadCanvasData:', error);
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

        // Force multiple renders to ensure everything is properly displayed
        if (canvas) {
          // Immediate render
          canvas.renderAll();

          // Delayed render after a short delay
          setTimeout(() => {
            if (canvas) {
              canvas.renderAll();
              console.log('Delayed canvas render completed');

              // Reset loading flag after rendering is complete
              isLoadingCanvas = false;
              console.log('isLoadingCanvas set to false');
            }
          }, 50);
        } else {
          // Reset loading flag if canvas is not available
          isLoadingCanvas = false;
        }
      }
    } else {
       console.log(`loadCanvasData skipped. Canvas ready: ${!!canvas}, Fabric loaded: ${fabricLoaded}`);
    }
  }
  // --- End of explicit method ---


  // Load fabric.js and initialize canvas
  onMount(async (): Promise<any> => {
    try {
      // Log initial mount
      console.log('CanvasEditor component mounted');

      // Load fabric.js from CDN
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js';
      script.async = true;

      script.onload = () => {
        console.log('Fabric.js loaded successfully');
        initializeCanvas();
        fabricLoaded = true;

        // Log canvas status after initialization
        console.log('=== CANVAS STATUS AFTER INITIALIZATION ===');
        console.log('Canvas initialized:', !!canvas);
        if (canvas) {
          console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
          console.log('Canvas objects count:', canvas.getObjects().length);
          console.log('Canvas background color:', canvas.backgroundColor);
          console.log('Canvas viewport transform:', canvas.viewportTransform);
        }
        console.log('=== END CANVAS STATUS ===');

        onReady?.(); // Signal readiness to the parent
        // Initial load is now fully handled by the parent calling loadCanvasData
      };

      document.body.appendChild(script);

      // Add window resize handler to adjust canvas view
      const handleResize = () => {
        if (fabricLoaded && canvas) {
          // Use setTimeout to ensure the container has been resized
          setTimeout(fitToView, 100);
        }
      };

      window.addEventListener('resize', handleResize);

      // Add ResizeObserver to monitor container size changes
      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          if (fabricLoaded && canvas && canvasContainer) {
            setTimeout(fitToView, 100);
          }
        });

        // Start observing once the container is available
        if (canvasContainer) {
          resizeObserver.observe(canvasContainer);
        }
      }

      return () => {
        // Clean up
        if (canvas) {
          canvas.dispose();
        }
        const existingScript = document.querySelector(`script[src="${script.src}"]`);
        if (existingScript && document.body.contains(existingScript)) {
           document.body.removeChild(existingScript);
        }
        window.removeEventListener('resize', handleResize);

        // Clean up ResizeObserver
        if (resizeObserver && canvasContainer) {
          resizeObserver.unobserve(canvasContainer);
          resizeObserver.disconnect();
        }
      };
    } catch (error) {
      console.error('Error loading fabric.js:', error);
    }
  });

  // $effect removed - loading is now imperative via loadCanvasData


  // Initialize canvas
  function initializeCanvas() {
    console.log('=== INITIALIZING CANVAS ===');
    try {
      const windowWithFabric = window as any;
      if (!windowWithFabric.fabric) {
        console.error('Fabric.js not loaded');
        return;
      }

      console.log('Fabric.js found in window object');
      console.log('Canvas element:', document.getElementById('canvas'));

      // Initialize with default dimensions, will be updated by parent if needed
      console.log('Creating canvas with default dimensions: 800x600');
      canvas = new windowWithFabric.fabric.Canvas('canvas', {
        width: 800,
        height: 600,
        backgroundColor: '#f0f0f0',
        renderOnAddRemove: true,
        stateful: true,
        preserveObjectStacking: true // Add this to prevent layer shuffling
      });

      console.log('Canvas initialized with dimensions:', canvas.width, 'x', canvas.height);
      console.log('Canvas DOM element:', canvas.lowerCanvasEl);
      console.log('Canvas DOM element dimensions:', canvas.lowerCanvasEl.width, 'x', canvas.lowerCanvasEl.height);

      // Add canvas border/outline that will be visible when zooming out
      addCanvasBorder();

      // Initial load is now fully handled by the parent calling loadCanvasData

      // Set up event listeners
      canvas.on('object:modified', (e: any) => {
        // Skip if the object is the canvas border
        if (e.target && e.target.name === 'Canvas Border') return;

        // Skip if we're currently loading canvas data
        if (isLoadingCanvas) {
          console.log('Skipping object:modified event during canvas loading');
          return;
        }

        // First constrain the object to the canvas boundaries
        constrainObjectsToCanvas();
        // Then save the canvas
        saveCanvas();
      });

      canvas.on('object:added', (e: any) => {
        // Skip if the object is the canvas border
        if (e.target && e.target.name === 'Canvas Border') return;

        // Skip if we're currently loading canvas data
        if (isLoadingCanvas) {
          console.log('Skipping object:added event during canvas loading');
          return;
        }

        saveCanvas();
      });

      canvas.on('object:removed', (e: any) => {
        // Skip if the object is the canvas border
        if (e.target && e.target.name === 'Canvas Border') return;

        // Skip if we're currently loading canvas data
        if (isLoadingCanvas) {
          console.log('Skipping object:removed event during canvas loading');
          return;
        }

        saveCanvas();
      });

      canvas.on('selection:created', updateSelection);
      canvas.on('selection:updated', updateSelection);
      canvas.on('selection:cleared', clearSelection);

      // Add object moving event to constrain objects during movement
      canvas.on('object:moving', (e: any) => {
        if (!e.target) return;

        // Skip if the object is the canvas border
        if (e.target.name === 'Canvas Border') return;

        // Ensure isZooming is false during object movement
        isZooming = false;

        const obj = e.target;
        const objBounds = obj.getBoundingRect();

        // Check boundaries and adjust position if needed
        if (objBounds.left < 0) {
          obj.left = obj.left - objBounds.left + 1;
        }
        if (objBounds.top < 0) {
          obj.top = obj.top - objBounds.top + 1;
        }
        if (objBounds.left + objBounds.width > canvas.width) {
          obj.left = canvas.width - objBounds.width + (obj.left - objBounds.left) - 1;
        }
        if (objBounds.top + objBounds.height > canvas.height) {
          obj.top = canvas.height - objBounds.height + (obj.top - objBounds.top) - 1;
        }
      });

      // Add object moved event to save canvas after movement is complete
      canvas.on('object:moved', (e: any) => {
        if (!e.target) return;

        // Skip if the object is the canvas border
        if (e.target.name === 'Canvas Border') return;

        // Skip if we're currently loading canvas data
        if (isLoadingCanvas) {
          console.log('Skipping object:moved event during canvas loading');
          return;
        }

        // Ensure isZooming is false after object movement
        isZooming = false;

        // Save the canvas after movement is complete
        saveCanvas();
      });

      // Add mouse wheel zoom listener
      canvas.on('mouse:wheel', handleMouseWheel);

      // Force a render after initialization
      setTimeout(() => {
        if (canvas) {
          canvas.renderAll();
          console.log('Forced initial render');
        }
      }, 100);

    } catch (error) {
      console.error('Error initializing canvas:', error);
    }
  }

  // --- Zoom Functions ---
  function setZoom(newZoom: number, point?: { x: number; y: number }) {
    if (!canvas || !fabricLoaded) return;

    // Set the zooming flag to prevent saving during zoom operations
    isZooming = true;

    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    zoomLevel = clampedZoom;

    // Store the border temporarily if it exists
    let hadBorder = false;
    if (canvasBorder) {
      hadBorder = true;
      canvas.remove(canvasBorder);
      canvasBorder = null;
    }

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
        canvasContainer.classList.add('zoomed-in');
      } else {
        canvasContainer.classList.remove('zoomed-in');
      }
    }

    // Re-add the border after zoom is applied
    if (hadBorder) {
      // Use setTimeout to ensure the zoom is fully applied before adding the border
      setTimeout(() => {
        addCanvasBorder();
        canvas.renderAll();
      }, 10);
    }

    canvas.renderAll();

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
    if (!canvas || !canvasContainer || !fabricLoaded) return;

    // Set the zooming flag to prevent saving during fit-to-view operation
    isZooming = true;

    // First ensure all objects are normalized and centered
    normalizeObjects();
    centerAllObjects();

    // Remove the border temporarily
    if (canvasBorder) {
      canvas.remove(canvasBorder);
      canvasBorder = null;
    }

    // Account for padding in the container
    const containerWidth = canvasContainer.clientWidth - 40; // 20px padding on each side
    const containerHeight = canvasContainer.clientHeight - 40; // 20px padding on each side

    // Calculate the fit ratio similar to the design-editor example
    let scaleX = containerWidth / canvasWidth;
    let scaleY = containerHeight / canvasHeight;

    // Use the approach from the FrameHandler.getFitRatio method
    if (canvasHeight >= canvasWidth) {
      scaleX = scaleY;
      if (containerWidth < canvasWidth * scaleX) {
        scaleX = scaleX * (containerWidth / (canvasWidth * scaleX));
      }
    } else {
      scaleY = scaleX;
      if (containerHeight < canvasHeight * scaleY) {
        scaleX = scaleX * (containerHeight / (canvasHeight * scaleX));
      }
    }

    // Apply a slight padding
    const newZoom = scaleX * 0.95;

    // Reset viewport transform first
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

    // Apply the zoom to center
    const center = canvas.getCenter();
    const wf = window as any;
    canvas.zoomToPoint(new wf.fabric.Point(center.left, center.top), newZoom);

    // Force a render
    canvas.renderAll();

    // Log the fit operation
    console.log(`Fit to view: container ${containerWidth}x${containerHeight}, canvas ${canvasWidth}x${canvasHeight}, zoom ${newZoom}`);

    // Force all objects to be marked as dirty to ensure they render
    const objects = canvas.getObjects();
    objects.forEach((obj: any) => {
      if (obj) obj.dirty = true;
    });

    // Re-add the border without triggering events
    setTimeout(() => {
      // Temporarily disable event firing
      const originalFire = canvas.fire;
      canvas.fire = function() {};

      addCanvasBorder();
      canvas.renderAll();

      // Restore event firing
      canvas.fire = originalFire;
    }, 10);
  }

  function handleMouseWheel(opt: any) {
    if (!canvas || !fabricLoaded) return;
    const delta = opt.e.deltaY;
    let newZoom = canvas.getZoom();

    // Use a more consistent zoom calculation
    if (delta > 0) {
      newZoom = newZoom * 0.9; // Zoom out
    } else {
      newZoom = newZoom * 1.1; // Zoom in
    }

    // Clamp zoom level
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
  // Function to normalize object scales and positions
  function normalizeObjects() {
    if (!canvas || !fabricLoaded) return false;

    const objects = canvas.getObjects();
    if (!objects || objects.length === 0) return false;

    let modified = false;

    // Process each object
    objects.forEach((obj: any) => {
      if (!obj) return;

      // Check for extreme scale values
      let needsRescale = false;
      if (obj.scaleX && (obj.scaleX > 5 || obj.scaleX < 0.1)) {
        console.log(`Object ${obj.name || 'unnamed'} has extreme scaleX: ${obj.scaleX}`);
        needsRescale = true;
      }
      if (obj.scaleY && (obj.scaleY > 5 || obj.scaleY < 0.1)) {
        console.log(`Object ${obj.name || 'unnamed'} has extreme scaleY: ${obj.scaleY}`);
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
          scaleY: 1
        });

        console.log(`Normalized scale for ${obj.name || 'unnamed'}: width=${actualWidth}, height=${actualHeight}`);
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
      if (obj.left !== undefined && (obj.left < -canvasWidth / 2 || obj.left > canvasWidth * 1.5)) {
        // Center the object horizontally
        const newLeft = canvasWidth / 2 - (obj.width * (obj.scaleX || 1)) / 2;
        obj.set('left', newLeft);
        console.log(`Fixed extreme X position for ${obj.name || 'unnamed'}: ${originalLeft} -> ${newLeft}`);
        modified = true;
      }

      if (obj.top !== undefined && (obj.top < -canvasHeight / 2 || obj.top > canvasHeight * 1.5)) {
        // Center the object vertically
        const newTop = canvasHeight / 2 - (obj.height * (obj.scaleY || 1)) / 2;
        obj.set('top', newTop);
        console.log(`Fixed extreme Y position for ${obj.name || 'unnamed'}: ${originalTop} -> ${newTop}`);
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

  // Function to center all objects in the canvas view
  function centerAllObjects() {
    if (!canvas || !fabricLoaded) return false;

    // First normalize any objects with extreme scales or positions
    normalizeObjects();

    const objects = canvas.getObjects();
    if (!objects || objects.length === 0) return false;

    // Calculate the bounding box of all objects
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    // First pass: check if any objects have extreme positions that would skew the calculation
    let hasExtremePositions = false;
    objects.forEach((obj: any) => {
      if (!obj) return;

      // Check for extreme positions that would skew the calculation
      if (obj.left < -canvas.width * 2 || obj.left > canvas.width * 3 ||
          obj.top < -canvas.height * 2 || obj.top > canvas.height * 3) {
        hasExtremePositions = true;
        console.log(`Object ${obj.name || 'unnamed'} has extreme position: left=${obj.left}, top=${obj.top}`);
      }
    });

    // If we have extreme positions, recreate all objects with correct positions
    if (hasExtremePositions) {
      console.log('Extreme positions detected, recreating objects with correct positions');

      // Store the original objects to recreate them
      const objectsToRecreate: any[] = [];
      objects.forEach((obj: any) => {
        if (!obj) return;

        // Store all the properties we need to recreate the object
        const objData = {
          type: obj.type,
          name: obj.name,
          width: obj.width || 100,
          height: obj.height || 100,
          scaleX: obj.scaleX || 1,
          scaleY: obj.scaleY || 1,
          fill: obj.fill,
          stroke: obj.stroke,
          strokeWidth: obj.strokeWidth,
          src: obj.getSrc ? obj.getSrc() : null, // For images
          text: obj.text, // For text objects
          fontSize: obj.fontSize, // For text objects
          fontFamily: obj.fontFamily // For text objects
        };
        objectsToRecreate.push(objData);
      });

      // Clear the canvas
      canvas.clear();

      // Set background color
      canvas.backgroundColor = '#f0f0f0';

      // Recreate each object with proper positioning
      let imageLoadCount = 0;
      const totalImages = objectsToRecreate.filter(obj => obj.type === 'image').length;

      objectsToRecreate.forEach((objData: any, index: number) => {
        let newObj;
        const wf = window as any;

        // Calculate centered position
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Stagger objects vertically and horizontally for visibility
        const offsetX = (index % 3) * 50 - 50;
        const offsetY = Math.floor(index / 3) * 50 - 50;

        // Create different types of objects
        if (objData.type === 'rect') {
          newObj = new wf.fabric.Rect({
            left: centerX - (objData.width / 2) + offsetX,
            top: centerY - (objData.height / 2) + offsetY,
            width: objData.width,
            height: objData.height,
            fill: objData.fill || '#3498db',
            stroke: objData.stroke,
            strokeWidth: objData.strokeWidth,
            name: objData.name
          });
        } else if (objData.type === 'circle') {
          newObj = new wf.fabric.Circle({
            left: centerX - (objData.width / 2) + offsetX,
            top: centerY - (objData.height / 2) + offsetY,
            radius: Math.min(objData.width, objData.height) / 2,
            fill: objData.fill || '#3498db',
            stroke: objData.stroke,
            strokeWidth: objData.strokeWidth,
            name: objData.name
          });
        } else if (objData.type === 'text' || objData.type === 'textbox') {
          newObj = new wf.fabric.Textbox(objData.text || 'Text', {
            left: centerX - (objData.width / 2) + offsetX,
            top: centerY - (objData.height / 2) + offsetY,
            width: objData.width,
            fontSize: objData.fontSize || 24,
            fontFamily: objData.fontFamily || 'Arial',
            fill: objData.fill || '#2c3e50',
            name: objData.name
          });
        } else if (objData.type === 'image') {
          // For images, we need to load them asynchronously
          // Use a placeholder URL if src is not available
          const imageUrl = objData.src || `https://via.placeholder.com/${objData.width}x${objData.height}?text=${encodeURIComponent(objData.name || 'Image')}`;

          wf.fabric.Image.fromURL(imageUrl, (img: any) => {
            // Scale the image to match the original dimensions
            const scale = Math.min(
              objData.width / (img.width || 1),
              objData.height / (img.height || 1)
            );

            img.set({
              left: centerX - (objData.width / 2) + offsetX,
              top: centerY - (objData.height / 2) + offsetY,
              scaleX: scale,
              scaleY: scale,
              name: objData.name
            });

            canvas.add(img);
            imageLoadCount++;

            // When all images are loaded, render the canvas
            if (imageLoadCount >= totalImages) {
              canvas.renderAll();
              console.log('All images loaded and rendered');
            }
          }, { crossOrigin: 'anonymous' });
          return; // Skip the add below for images
        } else {
          // Default fallback - create a rectangle with the object's name
          newObj = new wf.fabric.Rect({
            left: centerX - 50 + offsetX,
            top: centerY - 50 + offsetY,
            width: 100,
            height: 100,
            fill: '#e74c3c',
            name: objData.name || `Unknown object ${index}`
          });
        }

        if (newObj) {
          canvas.add(newObj);
        }
      });

      // If there were no images, render the canvas now
      if (totalImages === 0) {
        canvas.renderAll();
      }

      console.log('Objects recreated with proper positioning');
      return true;
    }

    // If no extreme positions, proceed with normal centering
    objects.forEach((obj: any) => {
      if (!obj) return;

      // Get object bounds considering its width, height, scale, and position
      const objBounds = obj.getBoundingRect();
      minX = Math.min(minX, objBounds.left);
      minY = Math.min(minY, objBounds.top);
      maxX = Math.max(maxX, objBounds.left + objBounds.width);
      maxY = Math.max(maxY, objBounds.top + objBounds.height);
    });

    // If we have valid bounds
    if (minX !== Infinity && minY !== Infinity && maxX !== -Infinity && maxY !== -Infinity) {
      // Calculate center of all objects
      const objectsCenterX = (minX + maxX) / 2;
      const objectsCenterY = (minY + maxY) / 2;

      // Calculate canvas center
      const canvasCenterX = canvas.width / 2;
      const canvasCenterY = canvas.height / 2;

      // Calculate offset to move objects to center
      const offsetX = canvasCenterX - objectsCenterX;
      const offsetY = canvasCenterY - objectsCenterY;

      // Apply offset if it's significant or if objects are outside the visible area
      if (Math.abs(offsetX) > 5 || Math.abs(offsetY) > 5 ||
          minX < 0 || minY < 0 || maxX > canvas.width || maxY > canvas.height) {
        console.log(`Centering objects: offset (${offsetX}, ${offsetY})`);

        // Move all objects by the offset
        objects.forEach((obj: any) => {
          if (!obj) return;
          obj.set({
            left: obj.left + offsetX,
            top: obj.top + offsetY
          });
          obj.setCoords(); // Update coordinates
        });

        canvas.renderAll();
        return true; // Indicate that centering was applied
      }
    }

    return false; // No centering was needed or possible
  }

  // Flag to prevent recursive save calls
  let isSaving = false;

  // Function to add a canvas border/outline
  function addCanvasBorder() {
    if (!canvas || !fabricLoaded) return;

    const wf = window as any;
    if (!wf.fabric) return;

    // First, remove any existing border objects by name
    const objects = canvas.getObjects();
    const existingBorders = objects.filter((obj: any) => obj.name === 'Canvas Border');

    if (existingBorders.length > 0) {
      console.log(`Found ${existingBorders.length} existing border objects, removing them...`);
      // Use removeWithoutEvents to prevent triggering object:removed
      existingBorders.forEach((border: any) => {
        if (border) {
          // Temporarily disable event firing
          const originalFire = canvas.fire;
          canvas.fire = function() {};
          canvas.remove(border);
          // Restore event firing
          canvas.fire = originalFire;
        }
      });
    }

    // Also remove the reference if it exists
    if (canvasBorder) {
      // Temporarily disable event firing
      const originalFire = canvas.fire;
      canvas.fire = function() {};
      canvas.remove(canvasBorder);
      // Restore event firing
      canvas.fire = originalFire;
      canvasBorder = null;
    }

    try {
      // Create a rectangle that matches the canvas dimensions exactly
      canvasBorder = new wf.fabric.Rect({
        left: 0,
        top: 0,
        width: canvas.width,
        height: canvas.height,
        fill: 'transparent',
        stroke: '#FF0000', // Bright red border
        strokeWidth: 4, // Fixed stroke width
        strokeDashArray: [10, 10], // Dashed line for better visibility
        selectable: false,
        evented: false,
        name: 'Canvas Border',
        excludeFromExport: true,
        hoverCursor: 'default',
        strokeUniform: true, // Stroke width is not affected by scaling
        hasBorders: false,
        hasControls: false,
        lockMovementX: true,
        lockMovementY: true,
        lockRotation: true,
        lockScalingX: true,
        lockScalingY: true,
        // This is the key property to make it appear on top
        objectCaching: false
      });

      if (canvasBorder) {
        // Add the border to the canvas without triggering events
        const originalFire = canvas.fire;
        canvas.fire = function() {};
        canvas.add(canvasBorder);
        canvas.fire = originalFire;

        // Instead of sending to back, bring it to front
        canvas.bringToFront(canvasBorder);

        // Explicitly set the border as non-selectable again after adding
        canvasBorder.selectable = false;
        canvasBorder.evented = false;

        // Create a clipPath to constrain all objects to the canvas dimensions
        const clipPath = new wf.fabric.Rect({
          left: 0,
          top: 0,
          width: canvas.width,
          height: canvas.height,
          absolutePositioned: true
        });

        // Apply the clipPath to the canvas
        canvas.clipPath = clipPath;

        // Render the canvas
        canvas.renderAll();
        console.log('Canvas border added with dimensions:', canvas.width, 'x', canvas.height);
      }
    } catch (error) {
      console.error('Error creating canvas border:', error);
    }
  }

  // Update canvas dimensions and border
  export function updateCanvasDimensions(width: number, height: number) {
    if (!canvas || !fabricLoaded) return;

    // Remove existing border
    if (canvasBorder) {
      canvas.remove(canvasBorder);
      canvasBorder = null;
    }

    // Update canvas dimensions
    canvas.setDimensions({ width, height });
    canvasWidth = width;
    canvasHeight = height;

    // Create a new border with the updated dimensions
    setTimeout(() => {
      addCanvasBorder();
      canvas.renderAll();
    }, 10);

    console.log(`Canvas dimensions updated to ${width}x${height}`);
  }

  // --- End Zoom Functions ---

  // Function to completely reset the canvas view
  function resetCanvasView() {
    if (!canvas || !fabricLoaded) return;

    console.log('Starting complete canvas view reset...');

    // Set the loading flag to prevent saving during reset
    isLoadingCanvas = true;

    // Step 1: Reset zoom to 1
    zoomLevel = 1; // Set directly to avoid triggering setZoom which would cause events
    canvas.setZoom(1);
    console.log('Reset zoom to 1');

    // Step 2: Reset pan
    canvas.absolutePan({ x: 0, y: 0 });
    console.log('Reset pan to origin');

    // Remove existing border
    if (canvasBorder) {
      canvas.remove(canvasBorder);
      canvasBorder = null;
    }
    // Create a new border after a short delay to ensure the canvas is fully reset
    setTimeout(() => {
      addCanvasBorder();
    }, 50);

    // Step 3: Force recreation of all objects with proper positioning
    const objects = canvas.getObjects();
    if (objects && objects.length > 0) {
      // Force recreation of objects with proper positioning

      // Store the original objects to recreate them
      const objectsToRecreate: any[] = [];
      objects.forEach((obj: any) => {
        if (!obj) return;

        // Store all the properties we need to recreate the object
        const objData = {
          type: obj.type,
          name: obj.name,
          width: obj.width || 100,
          height: obj.height || 100,
          scaleX: obj.scaleX || 1,
          scaleY: obj.scaleY || 1,
          fill: obj.fill,
          stroke: obj.stroke,
          strokeWidth: obj.strokeWidth,
          src: obj.getSrc ? obj.getSrc() : null, // For images
          text: obj.text, // For text objects
          fontSize: obj.fontSize, // For text objects
          fontFamily: obj.fontFamily, // For text objects
          left: obj.left, // Store original position
          top: obj.top, // Store original position
          angle: obj.angle || 0 // Store original rotation
        };
        objectsToRecreate.push(objData);
      });

      // Clear the canvas
      canvas.clear();

      // Set background color
      canvas.backgroundColor = '#f0f0f0';

      // Recreate each object with proper positioning
      let imageLoadCount = 0;
      const totalImages = objectsToRecreate.filter(obj => obj.type === 'image').length;

      objectsToRecreate.forEach((objData: any, index: number) => {
        let newObj;
        const wf = window as any;

        // Calculate default position if original is not available
        const defaultLeft = canvas.width / 2 - (objData.width / 2);
        const defaultTop = canvas.height / 2 - (objData.height / 2);

        // Use original position if available, otherwise use default centered position
        const left = objData.left !== undefined ? objData.left : defaultLeft;
        const top = objData.top !== undefined ? objData.top : defaultTop;

        // Create different types of objects
        if (objData.type === 'rect') {
          newObj = new wf.fabric.Rect({
            left: left,
            top: top,
            width: objData.width,
            height: objData.height,
            fill: objData.fill || '#3498db',
            stroke: objData.stroke,
            strokeWidth: objData.strokeWidth,
            name: objData.name,
            angle: objData.angle || 0
          });
        } else if (objData.type === 'circle') {
          newObj = new wf.fabric.Circle({
            left: left,
            top: top,
            radius: Math.min(objData.width, objData.height) / 2,
            fill: objData.fill || '#3498db',
            stroke: objData.stroke,
            strokeWidth: objData.strokeWidth,
            name: objData.name,
            angle: objData.angle || 0
          });
        } else if (objData.type === 'text' || objData.type === 'textbox') {
          newObj = new wf.fabric.Textbox(objData.text || 'Text', {
            left: left,
            top: top,
            width: objData.width,
            fontSize: objData.fontSize || 24,
            fontFamily: objData.fontFamily || 'Arial',
            fill: objData.fill || '#2c3e50',
            name: objData.name,
            angle: objData.angle || 0
          });
        } else if (objData.type === 'image') {
          // For images, we need to load them asynchronously
          // Use a placeholder URL if src is not available
          const imageUrl = objData.src || `https://via.placeholder.com/${objData.width}x${objData.height}?text=${encodeURIComponent(objData.name || 'Image')}`;

          wf.fabric.Image.fromURL(imageUrl, (img: any) => {
            // Scale the image to match the original dimensions
            const scale = Math.min(
              objData.width / (img.width || 1),
              objData.height / (img.height || 1)
            );

            img.set({
              left: left,
              top: top,
              scaleX: scale,
              scaleY: scale,
              name: objData.name,
              angle: objData.angle || 0
            });

            canvas.add(img);
            imageLoadCount++;

            // When all images are loaded, render the canvas
            if (imageLoadCount >= totalImages) {
              canvas.renderAll();
              console.log('All images loaded and rendered');
              // Fit to view after all images are loaded
              fitToView();
            }
          }, { crossOrigin: 'anonymous' });
          return; // Skip the add below for images
        } else {
          // Default fallback - create a rectangle with the object's name
          newObj = new wf.fabric.Rect({
            left: left,
            top: top,
            width: 100,
            height: 100,
            fill: '#e74c3c',
            name: objData.name || `Unknown object ${index}`,
            angle: objData.angle || 0
          });
        }

        if (newObj) {
          canvas.add(newObj);
        }
      });

      // If there were no images, render the canvas now and fit to view
      if (totalImages === 0) {
        canvas.renderAll();
        fitToView();
      }

      console.log('Objects recreated with proper positioning');
    } else {
      // If no objects, just fit to view
      fitToView();
    }

    // Final render
    canvas.renderAll();
    console.log('Canvas reset: normalized, centered, and fitted to view');

    // Log the final state
    logCanvasState();

    // Reset the loading flag after a delay to ensure all operations are complete
    setTimeout(() => {
      isLoadingCanvas = false;
      console.log('Canvas reset complete, loading flag cleared');
    }, 500);
  }

  // Debug function to log canvas state
  function logCanvasState() {
    if (!canvas || !fabricLoaded) return;

    try {
      const objects = canvas.getObjects();
      console.log('Canvas state:', {
        width: canvas.width,
        height: canvas.height,
        zoom: canvas.getZoom(),
        objectCount: objects.length,
        objects: objects.map((obj: any, index: number) => ({
          type: obj.type,
          name: obj.name || `Unnamed ${obj.type} ${index}`,
          visible: obj.visible !== false,
          width: obj.width,
          height: obj.height,
          left: obj.left,
          top: obj.top
        }))
      });
    } catch (error) {
      console.error('Error logging canvas state:', error);
    }
  }

  // Save canvas state
  function saveCanvas() {
    if (!canvas) return;

    // Skip saving if we're currently loading canvas data
    if (isLoadingCanvas) {
      console.log('Skipping saveCanvas during canvas loading');
      return;
    }

    // Skip saving if we're currently zooming - but only if the save is triggered by a zoom event
    // This check was causing issues with element movement not being saved
    if (isZooming && !canvas.getActiveObject()) {
      console.log('Skipping saveCanvas during zoom operation');
      return;
    }

    // Prevent recursive calls
    if (isSaving) {
      console.log('Already saving, skipping recursive call');
      return;
    }

    console.log('Starting saveCanvas operation');

    try {
      isSaving = true;

      // First, constrain all objects to be within canvas boundaries
      constrainObjectsToCanvas();

      // Store reference to border
      let hadBorder = false;

      // Remove the border before saving without triggering events
      if (canvasBorder) {
        hadBorder = true;

        // Temporarily disable event firing
        const originalFire = canvas.fire;
        canvas.fire = function() {};
        canvas.remove(canvasBorder);
        canvas.fire = originalFire;

        canvasBorder = null;
      }

      // Ensure all objects have their names set before saving
      const objects = canvas.getObjects();
      objects.forEach((obj: any, index: number) => {
        // Skip null objects
        if (!obj) return;

        // If the object doesn't have a name, set a default one
        if (!obj.name) {
          const defaultName = `Layer ${index + 1}`;
          obj.name = defaultName;
          // Force the canvas to recognize the change
          obj.set('name', defaultName);
        }

        // Ensure coordinates are up to date
        obj.setCoords();
      });

      // Get the canvas JSON with additional properties
      const canvasJson = canvas.toJSON(['name', 'id', 'selectable', 'evented', 'lockMovementX', 'lockMovementY']); // Include custom properties in serialization

      // Ensure the objects array exists
      if (!canvasJson.objects) {
        canvasJson.objects = [];
      }

      // Filter out any problematic objects and Canvas Border objects
      canvasJson.objects = canvasJson.objects.filter((obj: any) => {
        // Filter out Canvas Border objects
        if (obj && obj.name === 'Canvas Border') {
          console.log('Filtering out Canvas Border object from saved JSON');
          return false;
        }

        // Keep only objects with valid types
        const validTypes = ['rect', 'circle', 'text', 'textbox', 'image', 'path', 'polygon', 'polyline', 'line', 'triangle'];
        return obj && obj.type && validTypes.includes(obj.type.toLowerCase());
      });

      // Log the objects being saved to verify names are included
      console.log('Saving canvas with objects:', canvasJson.objects.length);

      // Stringify the sanitized JSON
      const json = JSON.stringify(canvasJson);
      console.log('Canvas changed, saving state with JSON length:', json.length);

      // Call onCanvasChange directly without setTimeout to ensure immediate update
      onCanvasChange(json);
      console.log('onCanvasChange called with canvas data');

      // Add the border back if it was removed
      if (hadBorder) {
        // Add border back immediately without setTimeout
        addCanvasBorder();
        canvas.renderAll();
      }

      // Log canvas state after saving
      logCanvasState();
    } catch (error) {
      console.error('Error saving canvas state:', error);
    } finally {
      // Always reset the saving flag
      isSaving = false;
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

      // Only use the fallback approach if the first approach didn't work correctly
      // Check if the current order matches what we want
      const currentObjects = canvas.getObjects();
      let needsFallback = false;

      // Compare the current order with the desired order
      if (currentObjects.length === canvasOrderLayers.length) {
        for (let i = 0; i < currentObjects.length; i++) {
          if (currentObjects[i] !== canvasOrderLayers[i].object) {
            console.log(`Order mismatch at position ${i}: expected ${canvasOrderLayers[i].name}, got ${currentObjects[i].name || 'unnamed'}`);
            needsFallback = true;
            break;
          }
        }
      } else {
        console.log(`Length mismatch: current ${currentObjects.length}, expected ${canvasOrderLayers.length}`);
        needsFallback = true;
      }

      // Only use fallback if needed
      if (needsFallback) {
        setTimeout(() => {
          try {
            console.log('Using fallback approach to reorder layers...');

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
      }

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

    // Calculate a position that ensures the rectangle is fully within the canvas
    const rectWidth = 100;
    const rectHeight = 100;
    const maxLeft = Math.max(0, canvas.width - rectWidth);
    const maxTop = Math.max(0, canvas.height - rectHeight);
    const left = Math.min(100, maxLeft);
    const top = Math.min(100, maxTop);

    const r = new wf.fabric.Rect({
      left: left,
      top: top,
      fill: '#3498db',
      width: rectWidth,
      height: rectHeight,
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

    // Calculate a position that ensures the circle is fully within the canvas
    const radius = 50;
    const maxLeft = Math.max(radius, canvas.width - radius);
    const maxTop = Math.max(radius, canvas.height - radius);
    const left = Math.min(100, maxLeft);
    const top = Math.min(100, maxTop);

    const c = new wf.fabric.Circle({
      left: left,
      top: top,
      fill: '#e74c3c',
      radius: radius,
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

    // Calculate a position that ensures the text is fully within the canvas
    const textWidth = 200;
    const textHeight = 50; // Approximate height for a text element
    const maxLeft = Math.max(0, canvas.width - textWidth);
    const maxTop = Math.max(0, canvas.height - textHeight);
    const left = Math.min(100, maxLeft);
    const top = Math.min(100, maxTop);

    const t = new wf.fabric.Textbox('Text', {
      left: left,
      top: top,
      fill: '#2c3e50',
      fontSize: 24,
      width: textWidth,
      name: objectName // Add a name
    });
    // Ensure the name is set using the set method
    t.set('name', objectName);
    canvas.add(t);
    canvas.setActiveObject(t);
    // Save canvas after adding object
    saveCanvas();
  }

  // Function to constrain objects within the canvas boundaries
  function constrainObjectsToCanvas() {
    if (!canvas || !fabricLoaded) return false;

    const objects = canvas.getObjects();
    if (!objects || objects.length === 0) return false;

    let modified = false;

    objects.forEach((obj: any) => {
      if (!obj || obj.name === 'Canvas Border') return;

      // Skip objects that don't have dimensions
      if (obj.width === undefined || obj.height === undefined) return;

      // Get object bounds considering its width, height, scale, and position
      const objBounds = obj.getBoundingRect();

      // Check if the object is outside the canvas boundaries
      let needsAdjustment = false;
      let newLeft = obj.left;
      let newTop = obj.top;

      // Check left boundary
      if (objBounds.left < 0) {
        newLeft = obj.left - objBounds.left + 1; // Add 1px buffer
        needsAdjustment = true;
      }

      // Check right boundary
      if (objBounds.left + objBounds.width > canvas.width) {
        newLeft = canvas.width - objBounds.width + (obj.left - objBounds.left) - 1; // Subtract 1px buffer
        needsAdjustment = true;
      }

      // Check top boundary
      if (objBounds.top < 0) {
        newTop = obj.top - objBounds.top + 1; // Add 1px buffer
        needsAdjustment = true;
      }

      // Check bottom boundary
      if (objBounds.top + objBounds.height > canvas.height) {
        newTop = canvas.height - objBounds.height + (obj.top - objBounds.top) - 1; // Subtract 1px buffer
        needsAdjustment = true;
      }

      // Apply adjustments if needed
      if (needsAdjustment) {
        obj.set({
          left: newLeft,
          top: newTop
        });
        obj.setCoords();
        modified = true;
        console.log(`Constrained object ${obj.name || 'unnamed'} to canvas boundaries`);
      }
    });

    if (modified) {
      canvas.renderAll();
    }

    return modified;
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
      // Calculate maximum dimensions to fit within canvas
      const maxW = canvas.width * 0.8;
      const maxH = canvas.height * 0.8;
      if (img.width > maxW || img.height > maxH) {
        const scale = Math.min(maxW / img.width, maxH / img.height);
        img.scale(scale);
      }

      // Calculate position to ensure the image is centered and within canvas
      const imgWidth = img.width * img.scaleX;
      const imgHeight = img.height * img.scaleY;
      const left = (canvas.width - imgWidth) / 2;
      const top = (canvas.height - imgHeight) / 2;

      img.set({
        left: left,
        top: top
      });

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

  // Expose the reset function for parent components
  export function resetView() {
    resetCanvasView();
  }

  // --- Method to update canvas dimensions ---
  export function updateDimensions(newWidth: number, newHeight: number) {
    console.log('=== UPDATING CANVAS DIMENSIONS ===');
    console.log(`Requested dimensions: ${newWidth}x${newHeight}`);
    console.log(`Current dimensions: ${canvasWidth}x${canvasHeight}`);
    console.log(`Canvas ready: ${!!canvas}, Fabric loaded: ${fabricLoaded}`);

    if (canvas && fabricLoaded) {
      console.log(`CanvasEditor: Updating dimensions to ${newWidth}x${newHeight}`);

      // Log current objects for debugging
      const objects = canvas.getObjects();
      console.log(`Current objects before dimension update: ${objects.length}`);
      objects.forEach((obj: any, index: number) => {
        console.log(`Object ${index}: type=${obj.type}, name=${obj.name}, dimensions=${obj.width}x${obj.height}`);
      });

      // Update dimensions
      canvasWidth = newWidth;
      canvasHeight = newHeight;

      // Update the fabric canvas dimensions
      canvas.setWidth(newWidth);
      canvas.setHeight(newHeight);

      // Remove existing border without triggering events
      if (canvasBorder) {
        // Temporarily disable event firing
        const originalFire = canvas.fire;
        canvas.fire = function() {};
        canvas.remove(canvasBorder);
        canvas.fire = originalFire;

        canvasBorder = null;
      }

      // Reset viewport transform to ensure consistent positioning
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

      // Wait a brief moment to ensure the canvas dimensions are updated
      setTimeout(() => {
        // Add a new border
        addCanvasBorder();

        // Ensure all objects have proper coordinates
        canvas.getObjects().forEach((obj: any) => {
          if (obj && obj.name !== 'Canvas Border') {
            obj.setCoords();
            obj.dirty = true;
          }
        });

        // Constrain objects to the new canvas dimensions
        constrainObjectsToCanvas();

        canvas.renderAll();
      }, 50);

      // Wait a brief moment to ensure the DOM has updated
      setTimeout(() => {
        // Re-center viewport if needed, or fit to view
        fitToView(); // Fit to view after dimension change
        canvas.renderAll();

        // Apply another fit after a longer delay to ensure everything is settled
        setTimeout(() => {
          fitToView();
          // Force a re-render of all objects
          if (canvas) {
            const objects = canvas.getObjects();
            objects.forEach((obj: any) => {
              if (obj) obj.dirty = true;
            });
            canvas.renderAll();
          }
        }, 300);
      }, 50);

      // Don't save canvas on dimension change itself, only on content change
    } else {
      console.warn(`updateDimensions called but canvas not ready. W: ${newWidth}, H: ${newHeight}`);
      // Store dimensions even if canvas isn't ready yet, for initialization
      canvasWidth = newWidth;
      canvasHeight = newHeight;
    }
  }
  // --- End Method ---


  // Note: We've simplified the export process to use Fabric's built-in toDataURL method
  // with specific options, so we no longer need a separate preparation function.



  // --- Function to get canvas image data ---
  export function getCanvasImageDataUrl(): string | null {
    if (canvas && fabricLoaded) {
      try {
        console.log('=== CANVAS EXPORT DEBUG START ===');
        console.log('Original canvas dimensions:', canvas.width, 'x', canvas.height);

        // Store original state
        const originalClipPath = canvas.clipPath;
        const originalBgColor = canvas.backgroundColor;
        const originalObjects = canvas.getObjects();
        const hiddenBorderObjects: any[] = [];
        const originalVT = canvas.viewportTransform ? [...canvas.viewportTransform] : [1, 0, 0, 1, 0, 0];
        console.log('Original viewport transform:', originalVT);

        // Hide any border objects temporarily
        originalObjects.forEach((obj: any) => {
          if (obj && obj.name === 'Canvas Border') {
            if (obj.visible !== false) {
              obj.visible = false;
              hiddenBorderObjects.push(obj);
            }
          }
        });
        console.log('Hidden border objects count:', hiddenBorderObjects.length);

        // Reset the viewportTransform to default (no zoom)
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        console.log('Reset viewport transform to:', canvas.viewportTransform);

        // Make sure all objects are within the canvas boundaries
        constrainObjectsToCanvas();

        // Force a render to ensure everything is up to date
        canvas.renderAll();

        // Use Fabric's built-in toDataURL method with specific options
        // This is the most direct way to get an accurate image of the canvas
        const dataUrl = canvas.toDataURL({
          format: 'png',
          quality: 1,
          multiplier: 1, // Use exact 1:1 pixel mapping
          left: 0,
          top: 0,
          width: canvas.width,
          height: canvas.height,
          enableRetinaScaling: false // Disable retina scaling to prevent resolution issues
        });

        console.log('Generated data URL directly from fabric canvas');

        // Extract image dimensions from data URL by loading it into an Image object
        const img = new Image();
        img.src = dataUrl;

        // We need to wait for the image to load to get its dimensions
        setTimeout(() => {
          console.log('Image natural dimensions from data URL:', img.naturalWidth, 'x', img.naturalHeight);
        }, 100);

        // Log the first part of the data URL
        console.log('Data URL prefix:', dataUrl.substring(0, 100) + '...');
        console.log('Data URL length:', dataUrl.length);

        // Restore original state
        canvas.clipPath = originalClipPath;
        canvas.setBackgroundColor(originalBgColor, () => {});
        canvas.setViewportTransform(originalVT);
        console.log('Restored original canvas state');

        // Restore visibility of border objects
        hiddenBorderObjects.forEach((obj: any) => {
          obj.visible = true;
        });

        // Re-render the canvas
        canvas.renderAll();
        console.log('=== CANVAS EXPORT DEBUG END ===');

        return dataUrl;
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
        const canvasJson = canvas.toJSON(['name', 'id', 'selectable', 'evented', 'lockMovementX', 'lockMovementY']); // Include custom properties in serialization

        // Ensure the objects array exists
        if (!canvasJson.objects) {
          canvasJson.objects = [];
        }
        // Filter out any problematic objects and Canvas Border objects
        canvasJson.objects = canvasJson.objects.filter((obj: any) => {
          // Filter out Canvas Border objects
          if (obj && obj.name === 'Canvas Border') {
            console.log('[DEBUG] Filtering out Canvas Border object from JSON');
            return false;
          }

          // Keep only objects with valid types
          const validTypes = ['rect', 'circle', 'text', 'textbox', 'image', 'path', 'polygon', 'polyline', 'line', 'triangle'];
          return obj && obj.type && validTypes.includes(obj.type.toLowerCase());
        });

        // Log the objects being saved to verify names are included
        console.log('[DEBUG] Getting current canvas JSON with objects:', canvasJson.objects);

        // Stringify the JSON
        const jsonString = JSON.stringify(canvasJson);
        console.log('[DEBUG] Current canvas JSON length:', jsonString.length);

        return jsonString;
      } catch (error) {
        console.error('[DEBUG] Error getting current canvas JSON:', error);
        return '{}'; // Return empty JSON on error
      }
    }
    console.warn('[DEBUG] getCurrentCanvasJson called but canvas is not ready.');
    return '{}'; // Return empty JSON if not ready
  }
  // --- End function ---

</script>

<style>
  /* Canvas container styles */
  .canvas-wrapper {
    position: relative;
    overflow: hidden;
    transition: height 0.2s ease;
  }

  .canvas-element-wrapper {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>

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
    <div class="w-32">
      <input
        type="range"
        min={MIN_ZOOM}
        max={MAX_ZOOM}
        step={ZOOM_STEP / 10}
        value={zoomLevel}
        oninput={(e) => setZoom(parseFloat(e.currentTarget.value))}
        disabled={!fabricLoaded}
        class="w-full h-2 bg-secondary rounded-full"
      />
    </div>
    <Button variant="outline" size="icon" onclick={zoomIn} title="Zoom In" disabled={!fabricLoaded || zoomLevel >= MAX_ZOOM}>
      <ZoomIn class="h-4 w-4" />
    </Button>
    <Button variant="outline" size="icon" onclick={resetZoom} title="Reset Zoom (100%)" disabled={!fabricLoaded}>
      <RefreshCw class="h-4 w-4" />
    </Button>
    <Button variant="outline" size="icon" onclick={fitToView} title="Fit to View" disabled={!fabricLoaded || !canvasContainer}>
      <Maximize class="h-4 w-4" />
    </Button>
    <Button variant="outline" size="icon" onclick={centerAllObjects} title="Center All Objects" disabled={!fabricLoaded}>
      <Target class="h-4 w-4" />
    </Button>
    <Button
      variant="outline"
      size="icon"
      onclick={() => {
        if (canvas && fabricLoaded) {
          // Complete canvas reset function
          resetCanvasView();
        }
      }}
      title="Reset Canvas View"
      disabled={!fabricLoaded}
    >
      <RotateCcw class="h-4 w-4" />
    </Button>
    <Button
      variant="outline"
      onclick={() => {
        if (canvas && fabricLoaded) {
          // Force re-render all objects
          const objects = canvas.getObjects();
          objects.forEach((obj: any) => {
            if (obj) obj.dirty = true;
          });
          canvas.renderAll();
          console.log('Forced re-render of all canvas objects');
          // Log detailed canvas state
          logCanvasState();
        }
      }}
      title="Force Refresh"
      disabled={!fabricLoaded}
    >
      Refresh
    </Button>
    <Button
      variant="outline"
      onclick={() => {
        if (canvas && fabricLoaded) {
          // Complete canvas reset and fix
          resetCanvasView();
        }
      }}
      title="Fix Canvas Display"
      disabled={!fabricLoaded}
    >
      Fix Display
    </Button>
    <Button
      variant="outline"
      onclick={() => {
        if (canvas && fabricLoaded) {
          if (confirm('This will recreate all objects with proper positioning. Continue?')) {
            // Force recreation of all objects
            resetCanvasView();
            // Save the canvas after reset
            setTimeout(() => {
              saveCanvas();
            }, 500);
          }
        }
      }}
      title="Recreate All Objects"
      disabled={!fabricLoaded}
    >
      Recreate Objects
    </Button>
    <span class="text-sm ml-2">Zoom: {Math.round(zoomLevel * 100)}%</span>
    <span class="text-sm ml-auto">Canvas: {canvasWidth} x {canvasHeight} px</span>
  </div>
  <!-- End Zoom Controls -->

  <!-- Canvas Container Wrapper -->
  <div class="canvas-wrapper border rounded-md relative bg-gray-200 dark:bg-gray-700" style="height: 75vh; min-height: 650px;">
    <!-- Fixed Inner Container (no scrolling) -->
    <div bind:this={canvasContainer} class="relative flex items-center justify-center" style="width: 100%; height: 100%; padding: 20px;">
      <!-- Canvas Element -->
      <div class="canvas-element-wrapper">
        <canvas id="canvas"></canvas>
      </div>
    </div>
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
