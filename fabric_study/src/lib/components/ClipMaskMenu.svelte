<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Canvas, FabricObject } from 'fabric';

  // Props
  const props: {
    canvas: Canvas;
  } = $props();

  const canvas = props.canvas;

  // State variables
  let isVisible = $state(false);
  let selectedImage: FabricObject | null = $state(null);
  let selectedShape: FabricObject | null = $state(null);
  let menuRef: HTMLDivElement | null = $state(null);

  // Map to store original shapes used for clipping
  // We'll use a WeakMap to avoid memory leaks
  // Key: image object, Value: { shape: original shape object, serializedData: serialized shape data }
  type ShapeInfo = {
    shape: FabricObject;
    serializedData: any; // Store the full serialized data of the shape
  };
  const clipShapesMap = new WeakMap<FabricObject, ShapeInfo>();

  // Function to remove clip path from an image and restore the original shape
  function unclipImage(image: FabricObject) {
    if (!canvas) {
      console.log('ClipMaskMenu: Canvas not available, cannot unclip image');
      return;
    }

    if (!image) {
      console.log('ClipMaskMenu: Image is null, cannot unclip');
      return;
    }

    if (!image.clipPath) {
      console.log('ClipMaskMenu: Image has no clip path, nothing to unclip');
      return;
    }

    console.log('ClipMaskMenu: Removing clip path from image');

    // Check if we have the original shape stored
    if (clipShapesMap.has(image)) {
      // Get the original shape info
      const shapeInfo = clipShapesMap.get(image);
      console.log('ClipMaskMenu: Found original shape for image');

      // Add the original shape back to the canvas
      if (shapeInfo) {
        const { shape, serializedData } = shapeInfo;

        // Log the shape details before restoration
        console.log(`ClipMaskMenu: Restoring shape of type ${shape.type} with serialized data:`, serializedData);

        // Use the original shape and apply the serialized data
        const restoredShape = shape;

        // Apply all properties from serialized data
        restoredShape.set(serializedData);
        console.log('ClipMaskMenu: Applied serialized data to shape');

        // Ensure the shape is visible and selectable
        restoredShape.set({
          visible: true,
          evented: true,
          selectable: true
        });

        // Log the shape's position after setting it
        console.log('ClipMaskMenu: Shape position after set:', {
          left: restoredShape.left,
          top: restoredShape.top,
          scaleX: restoredShape.scaleX,
          scaleY: restoredShape.scaleY,
          angle: restoredShape.angle
        });

        // Add the restored shape back to the canvas
        canvas.add(restoredShape);
        console.log(`ClipMaskMenu: Shape added to canvas, current objects count: ${canvas.getObjects().length}`);

        // Move the shape to the front of the canvas stack to ensure it's visible
        canvas.bringObjectToFront(restoredShape);

        // Make the shape the active object so it's immediately selectable
        // Use a small timeout to ensure the shape is properly added to the canvas first
        setTimeout(() => {
          try {
            canvas.setActiveObject(restoredShape);
            canvas.requestRenderAll();
            console.log('ClipMaskMenu: Shape set as active object');
          } catch (error) {
            console.error('ClipMaskMenu: Error setting shape as active object:', error);
          }
        }, 100);

        console.log('ClipMaskMenu: Added original shape back to canvas with original position');

        // The WeakMap will automatically handle cleanup when the image is garbage collected
      }
    } else {
      console.log('ClipMaskMenu: No original shape found for this image');
    }

    // Remove the clip path
    image.clipPath = undefined;

    // Ensure object caching is enabled for the image
    image.objectCaching = true;

    // Render the canvas to ensure all changes are visible
    canvas.requestRenderAll();

    // Hide the unclip button
    showUnclipButton = false;
    imageToUnclip = null;

    console.log('ClipMaskMenu: Clip path removed successfully');
  }

  // Function to check if an object is an image
  function isImageObject(obj: any): boolean {
    return obj && obj.type === 'image';
  }

  // Function to check if an object is a shape (not an image or text)
  function isShapeObject(obj: any): boolean {
    if (!obj) return false;
    // Consider these types as shapes
    const shapeTypes = ['rect', 'circle', 'triangle', 'polygon', 'path', 'ellipse', 'star', 'pentagon', 'hexagon'];
    const isShape = shapeTypes.includes(obj.type);
    console.log(`ClipMaskMenu: isShapeObject check for type ${obj.type}: ${isShape}`);
    return isShape;
  }

  // Function to check if an object is an image with a clip path
  function isImageWithClipPath(obj: any): boolean {
    return isImageObject(obj) && obj.clipPath != null;
  }

  // State for the unclip button
  let showUnclipButton = $state(false);
  let imageToUnclip: FabricObject | null = $state(null);

  // Function to hide the menu
  function hideMenu() {
    isVisible = false;
    selectedImage = null;
    selectedShape = null;

    // Also hide the unclip button
    showUnclipButton = false;
    imageToUnclip = null;
  }

  // Function to check for images with clip paths in the selection
  function checkForImagesWithClipPaths() {
    if (!canvas) {
      console.log('ClipMaskMenu: Canvas is not available');
      return;
    }

    const activeObject = canvas.getActiveObject();
    if (!activeObject) {
      console.log('ClipMaskMenu: No active object');
      showUnclipButton = false;
      imageToUnclip = null;
      return;
    }

    console.log(`ClipMaskMenu: Active object type: ${activeObject.type}, has clipPath: ${!!activeObject.clipPath}`);

    if (isImageWithClipPath(activeObject)) {
      console.log('ClipMaskMenu: Found image with clip path, showing unclip button');
      showUnclipButton = true;
      imageToUnclip = activeObject;

      // Position the unclip button
      setTimeout(() => {
        updateUnclipButtonPosition();
      }, 0);
    } else {
      console.log('ClipMaskMenu: Active object is not an image with clip path');
      showUnclipButton = false;
      imageToUnclip = null;
    }
  }

  // Function to update the unclip button position
  function updateUnclipButtonPosition() {
    if (!showUnclipButton || !imageToUnclip || !canvas) {
      return;
    }

    const unclipButtonEl = document.querySelector('.unclip-button') as HTMLElement;
    if (!unclipButtonEl) {
      console.log('ClipMaskMenu: Unclip button element not found');
      return;
    }

    const zoom = canvas.getZoom();
    const boundingRect = imageToUnclip.getBoundingRect();

    // Position the button above the image
    const canvasEl = canvas.getElement();
    const canvasRect = canvasEl.getBoundingClientRect();

    const left = canvasRect.left + (boundingRect.left + boundingRect.width / 2) * zoom;
    const top = canvasRect.top + boundingRect.top * zoom - 40; // 40px above the image

    unclipButtonEl.style.left = `${left}px`;
    unclipButtonEl.style.top = `${top}px`;
    unclipButtonEl.style.transform = 'translateX(-50%)';
    console.log('ClipMaskMenu: Unclip button positioned at', left, top);
  }

  // Function to show the menu when both an image and a shape are selected
  function checkSelection() {
    if (!canvas) {
      console.log('ClipMaskMenu: Canvas is not available');
      return;
    }

    const activeObjects = canvas.getActiveObjects();
    console.log('ClipMaskMenu: Active object length:', activeObjects.length);
    console.log('ClipMaskMenu: Active objects:', activeObjects.map(obj => obj.type));

    // Check if we have a multiple selection
    const allowedPairTypes = ['rect', 'circle', 'triangle'];
    if (activeObjects.length === 2) {
      console.log('ClipMaskMenu: Two objects selected');
      console.log('ClipMaskMenu: Object 1 type:', activeObjects[0].type);
      console.log('ClipMaskMenu: Object 2 type:', activeObjects[1].type);

      const caseOne = activeObjects[0].type === 'image' && allowedPairTypes.includes(activeObjects[1].type);
      const caseTwo = activeObjects[1].type === 'image' && allowedPairTypes.includes(activeObjects[0].type);

      console.log('ClipMaskMenu: Case one (image + shape):', caseOne);
      console.log('ClipMaskMenu: Case two (shape + image):', caseTwo);

      if (!caseOne && !caseTwo) {
        console.log('ClipMaskMenu: Neither case matches, returning');
        return;
      }

      // Find an image and a shape in the selection
      let foundImage = null;
      let foundShape = null;

      for (const obj of activeObjects) {
        console.log('ClipMaskMenu: Checking object type:', obj.type);
        if (isImageObject(obj)) {
          console.log('ClipMaskMenu: Found image');
          foundImage = obj;
        } else if (isShapeObject(obj)) {
          console.log('ClipMaskMenu: Found shape');
          foundShape = obj;
        }

        // If we found both, break the loop
        if (foundImage && foundShape) break;
      }

      // If we have both an image and a shape, show the menu
      if (foundImage && foundShape) {
        console.log('ClipMaskMenu: Found both image and shape, showing menu');
        selectedImage = foundImage;
        selectedShape = foundShape;
        isVisible = true;
        console.log('ClipMaskMenu: Set isVisible to true');
        // Make sure the menu is visible in the DOM before positioning it
        setTimeout(() => {
          updateMenuPosition();
          console.log('ClipMaskMenu: Menu should be visible now');
        }, 0);
        return;
      } else {
        console.log('ClipMaskMenu: Did not find both image and shape');
      }
    } else if (activeObjects.length > 0) {
      console.log('ClipMaskMenu: Single object or multiple objects selected, but not exactly 2');
    } else {
      console.log('ClipMaskMenu: No active objects');
    }

    // If we don't have both an image and a shape, hide the menu
    hideMenu();
  }

  // Function to apply the clip mask
  async function applyClipMask() {
    if (!selectedImage || !selectedShape || !canvas) {
      console.log('ClipMaskMenu: Cannot apply clip mask, missing required objects');
      return;
    }

    console.log('ClipMaskMenu: Applying clip mask');

    try {
      // Clone the shape to use as a clip path using Promise-based approach
      const clonedShape = await (selectedShape as any).clone();

      if (!selectedImage || !canvas) return;

      // Clone the shape to store it (this is different from the clone used for the clip path)
      const originalShapeClone = await (selectedShape as any).clone();

      // Serialize the original shape to capture all its properties
      const serializedShape = selectedShape.toObject();
      console.log('ClipMaskMenu: Serialized original shape:', serializedShape);

      // Store the original shape and its serialized data in the map
      const shapeInfo: ShapeInfo = {
        shape: originalShapeClone,
        serializedData: serializedShape
      };
      clipShapesMap.set(selectedImage, shapeInfo);
      console.log('ClipMaskMenu: Stored cloned original shape with serialized data');

      // Remove the shape from the canvas
      if (selectedShape) {
        canvas.remove(selectedShape);
      }

      // Set the cloned shape as the clip path for the image
      selectedImage.clipPath = clonedShape;

      // Ensure object caching is enabled for the image
      selectedImage.objectCaching = true;

      // Deselect all objects
      canvas.discardActiveObject();

      // Render the canvas
      canvas.requestRenderAll();

      // Hide the menu
      isVisible = false;
      console.log('ClipMaskMenu: Clip mask applied successfully');
    } catch (error) {
      console.error('ClipMaskMenu: Error applying clip mask:', error);
    }
  }

  // Function to update the menu position
  function updateMenuPosition() {
    console.log('ClipMaskMenu: updateMenuPosition called, isVisible =', isVisible);
    if (!isVisible) {
      console.log('ClipMaskMenu: Menu not visible, skipping position update');
      return;
    }

    if (!canvas) {
      console.log('ClipMaskMenu: Canvas not available, skipping position update');
      return;
    }

    if (!menuRef) {
      console.log('ClipMaskMenu: Menu reference not available, skipping position update');
      return;
    }

    const activeObject = canvas.getActiveObject();
    if (!activeObject) {
      console.log('ClipMaskMenu: No active object, using active objects');
      const activeObjects = canvas.getActiveObjects();
      if (activeObjects.length === 0) {
        console.log('ClipMaskMenu: No active objects, skipping position update');
        return;
      }

      // Use the first object for positioning
      const firstObject = activeObjects[0];
      const zoom = canvas.getZoom();
      const boundingRect = firstObject.getBoundingRect();

      // Position the menu above the selection
      const canvasEl = canvas.getElement();
      const canvasRect = canvasEl.getBoundingClientRect();

      const left = canvasRect.left + (boundingRect.left + boundingRect.width / 2) * zoom;
      const top = canvasRect.top + boundingRect.top * zoom - 40; // 40px above the selection

      menuRef.style.left = `${left}px`;
      menuRef.style.top = `${top}px`;
      console.log('ClipMaskMenu: Menu positioned at', left, top);
      return;
    }

    const zoom = canvas.getZoom();
    const boundingRect = activeObject.getBoundingRect();

    // Position the menu above the selection
    const canvasEl = canvas.getElement();
    const canvasRect = canvasEl.getBoundingClientRect();

    const left = canvasRect.left + (boundingRect.left + boundingRect.width / 2) * zoom;
    const top = canvasRect.top + boundingRect.top * zoom - 40; // 40px above the selection

    menuRef.style.left = `${left}px`;
    menuRef.style.top = `${top}px`;
    console.log('ClipMaskMenu: Menu positioned at', left, top);
  }

  // Function to handle window resize
  function handleResize() {
    if (isVisible) {
      updateMenuPosition();
    }
  }

  // Function to handle clicks outside the menu
  function handleClickOutside(event: MouseEvent) {
    if (!canvas) return;

    const canvasEl = canvas.getElement();
    const isClickOnCanvas = canvasEl.contains(event.target as Node);

    // Handle clip mask menu
    if (isVisible && menuRef) {
      const isClickOnMenu = menuRef.contains(event.target as Node);
      if (!isClickOnMenu && !isClickOnCanvas) {
        console.log('ClipMaskMenu: Click outside menu, hiding');
        isVisible = false;
      }
    }
  }



  // No adjustment functions needed for unclip functionality

  // Set up event listeners
  onMount(() => {
    console.log('ClipMaskMenu: onMount called');
    if (canvas) {
      console.log('ClipMaskMenu: Canvas is available in onMount');

      // Listen for selection changes on the canvas
      canvas.on('selection:created', () => {
        checkSelection();
        checkForImagesWithClipPaths();
      });
      canvas.on('selection:updated', () => {
        checkSelection();
        checkForImagesWithClipPaths();
      });
      canvas.on('selection:cleared', () => {
        hideMenu();
        showUnclipButton = false;
        imageToUnclip = null;
      });
      canvas.on('object:modified', () => {
        updateMenuPosition();
        checkForImagesWithClipPaths();
      });
      canvas.on('object:scaling', () => {
        updateMenuPosition();
        if (showUnclipButton) updateUnclipButtonPosition();
      });
      canvas.on('object:moving', () => {
        updateMenuPosition();
        if (showUnclipButton) updateUnclipButtonPosition();
      });
      // Note: 'zoom:changed' is a custom event that might not be in the type definitions
      canvas.on('zoom' as any, () => {
        updateMenuPosition();
        if (showUnclipButton) updateUnclipButtonPosition();
      });

      // Check for images with clip paths initially
      setTimeout(() => {
        checkForImagesWithClipPaths();
      }, 500);

      // Listen for window resize
      window.addEventListener('resize', handleResize);

      // Listen for clicks outside the menu
      document.addEventListener('mousedown', handleClickOutside);

      console.log('ClipMaskMenu: All event listeners set up');
    }
  });

  // Clean up event listeners
  onDestroy(() => {
    console.log('ClipMaskMenu: onDestroy called');
    if (canvas) {
      console.log('ClipMaskMenu: Removing canvas event listeners');
      // We need to remove the event listeners with the same function references
      // Since we're using anonymous functions, we can't remove them directly
      // This is a limitation, but it's not a big issue since the component is being destroyed
      canvas.off('selection:created');
      canvas.off('selection:updated');
      canvas.off('selection:cleared');
      canvas.off('object:modified');
      canvas.off('object:scaling');
      canvas.off('object:moving');
      // Note: 'zoom:changed' is a custom event that might not be in the type definitions
      canvas.off('zoom' as any);
    }

    console.log('ClipMaskMenu: Removing window event listeners');
    window.removeEventListener('resize', handleResize);
    document.removeEventListener('mousedown', handleClickOutside);

    // Reset all state variables
    isVisible = false;
    selectedImage = null;
    selectedShape = null;
    showUnclipButton = false;
    imageToUnclip = null;

    console.log('ClipMaskMenu: All event listeners removed and state reset');
  });
</script>

<!-- Debug message to show component state -->
{#if true}
  <div style="position: fixed; top: 10px; right: 10px; background: rgba(255,0,0,0.8); color: white; padding: 10px; z-index: 9999; font-weight: bold; border-radius: 5px;">
    ClipMaskMenu Debug:<br>
    isVisible = {isVisible ? 'true' : 'false'}<br>
    selectedImage = {selectedImage ? 'yes' : 'no'}<br>
    selectedShape = {selectedShape ? 'yes' : 'no'}<br>
    showUnclipButton = {showUnclipButton ? 'true' : 'false'}<br>
    imageToUnclip = {imageToUnclip ? 'yes' : 'no'}
  </div>
{/if}

<!-- Clip Mask Menu -->
<div
  class="clip-mask-menu"
  class:visible={isVisible}
  bind:this={menuRef}
>
  <button class="clip-mask-btn" onclick={applyClipMask}>
    Clip Mask
  </button>
</div>

<!-- Unclip Button -->
<div
  class="unclip-button"
  class:visible={showUnclipButton}
>
  <button class="clip-mask-btn" onclick={() => {
    if (imageToUnclip) {
      console.log('ClipMaskMenu: Unclip button clicked, removing clip path');
      unclipImage(imageToUnclip);
    }
  }}>
    Unclip & Restore Shape with Position
  </button>
</div>

<!-- No adjustment menu needed for unclip functionality -->

<style>
  /* Common styles for menus */
  .clip-mask-menu,
  .unclip-button {
    position: absolute;
    display: none;
    background-color: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    padding: 8px;
    z-index: 9999; /* Increased z-index to ensure it's on top */
  }

  .clip-mask-menu {
    transform: translateX(-50%);
  }

  /* When visible class is applied, display the menu */
  .clip-mask-menu.visible,
  .unclip-button.visible {
    display: block !important;
  }

  /* Clip mask button */
  .clip-mask-btn {
    background-color: #4CAF50;
    color: white;
    border: none;
    padding: 6px 12px;
    text-align: center;
    text-decoration: none;
    display: inline-block;
    font-size: 14px;
    margin: 2px;
    cursor: pointer;
    border-radius: 4px;
    transition: background-color 0.3s;
  }

  .clip-mask-btn:hover {
    background-color: #45a049;
  }
</style>
