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
  let menuRef: HTMLDivElement;

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

  // Function to hide the menu
  function hideMenu() {
    isVisible = false;
    selectedImage = null;
    selectedShape = null;
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
    if (menuRef && !menuRef.contains(event.target as Node)) {
      // Don't hide the menu when clicking on the canvas
      const canvasEl = canvas.getElement();
      if (canvasEl.contains(event.target as Node)) {
        return;
      }
      isVisible = false;
    }
  }

  // Set up event listeners
  onMount(() => {
    if (canvas) {
      // Listen for selection changes on the canvas
      canvas.on('selection:created', checkSelection);
      canvas.on('selection:updated', checkSelection);
      canvas.on('selection:cleared', hideMenu);
      canvas.on('object:modified', updateMenuPosition);
      canvas.on('object:scaling', updateMenuPosition);
      canvas.on('object:moving', updateMenuPosition);
      // Note: 'zoom:changed' is a custom event that might not be in the type definitions
      canvas.on('zoom' as any, updateMenuPosition);

      // Listen for window resize
      window.addEventListener('resize', handleResize);

      // Listen for clicks outside the menu
      document.addEventListener('mousedown', handleClickOutside);
    }
  });

  // Clean up event listeners
  onDestroy(() => {
    if (canvas) {
      canvas.off('selection:created', checkSelection);
      canvas.off('selection:updated', checkSelection);
      canvas.off('selection:cleared', hideMenu);
      canvas.off('object:modified', updateMenuPosition);
      canvas.off('object:scaling', updateMenuPosition);
      canvas.off('object:moving', updateMenuPosition);
      // Note: 'zoom:changed' is a custom event that might not be in the type definitions
      canvas.off('zoom' as any, updateMenuPosition);
    }

    window.removeEventListener('resize', handleResize);
    document.removeEventListener('mousedown', handleClickOutside);
  });
</script>

<!-- Debug message to show component state -->
{#if true}
  <div style="position: fixed; top: 10px; right: 10px; background: rgba(255,0,0,0.8); color: white; padding: 10px; z-index: 9999; font-weight: bold; border-radius: 5px;">
    ClipMaskMenu Debug:<br>
    isVisible = {isVisible ? 'true' : 'false'}<br>
    selectedImage = {selectedImage ? 'yes' : 'no'}<br>
    selectedShape = {selectedShape ? 'yes' : 'no'}
  </div>
{/if}

<div
  class="clip-mask-menu"
  class:visible={isVisible}
  bind:this={menuRef}
>
  <button class="clip-mask-btn" onclick={applyClipMask}>
    Clip Mask
  </button>
</div>

<style>
  .clip-mask-menu {
    position: absolute;
    display: none;
    background-color: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    padding: 8px;
    z-index: 9999; /* Increased z-index to ensure it's on top */
    transform: translateX(-50%);
  }

  /* When isVisible is true, display the menu */
  .clip-mask-menu.visible {
    display: block !important;
  }

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
