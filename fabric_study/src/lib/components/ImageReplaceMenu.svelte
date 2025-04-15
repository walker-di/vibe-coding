<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { type Canvas, type FabricObject, FabricImage } from 'fabric';
  import addImage from "$lib/tools/canvas-image.svelte";

  // Props
  const props: {
    canvas: Canvas;
  } = $props();

  const canvas = props.canvas;

  // State variables
  let isVisible = $state(false);
  let selectedImage: FabricObject | null = $state(null);
  let menuRef: HTMLDivElement | null = $state(null);
  let menuPosition = $state({ top: 0, left: 0 });

  // Function to check if an object is an image
  function isImageObject(obj: any): boolean {
    return obj && obj.type === 'image';
  }

  // Function to check selection and show menu if an image is selected
  function checkSelection() {
    if (!canvas) {
      console.log('ImageReplaceMenu: Canvas is not available');
      return;
    }

    const activeObject = canvas.getActiveObject();
    console.log('ImageReplaceMenu: Active object:', activeObject?.type);

    if (isImageObject(activeObject)) {
      console.log('ImageReplaceMenu: Image selected, showing menu');
      selectedImage = activeObject;
      isVisible = true;
      // Make sure the menu is visible in the DOM before positioning it
      setTimeout(() => {
        updateMenuPosition();
      }, 0);
    } else {
      hideMenu();
    }
  }

  // Function to hide the menu
  function hideMenu() {
    isVisible = false;
    selectedImage = null;
  }

  // Function to update the menu position based on the selected image
  function updateMenuPosition() {
    if (!selectedImage || !canvas || !menuRef) return;

    const zoom = canvas.getZoom();
    const objRect = selectedImage.getBoundingRect();
    const canvasRect = canvas.getElement().getBoundingClientRect();

    // Position the menu above the image
    const top = canvasRect.top + objRect.top * zoom - 40; // 40px above the image
    const left = canvasRect.left + (objRect.left + objRect.width / 2) * zoom - (menuRef.offsetWidth / 2);

    menuPosition = { top, left };
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
      // Don't hide the menu if the click is on the canvas - the canvas will handle selection changes
      const canvasEl = canvas.getElement();
      if (canvasEl.contains(event.target as Node)) {
        return;
      }
      hideMenu();
    }
  }

  // Function to replace the selected image
  function replaceImage() {
    if (!selectedImage || !canvas) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (f) => {
          const data = f.target?.result as string;
          if (!data) return;

          try {
            // Ensure selectedImage is not null at this point
            if (!selectedImage) return;

            // Get current image properties
            const currentLeft = selectedImage.left || 0;
            const currentTop = selectedImage.top || 0;
            const currentAngle = selectedImage.angle || 0;
            const currentFlipX = selectedImage.flipX || false;
            const currentFlipY = selectedImage.flipY || false;
            const currentOpacity = selectedImage.opacity || 1;
            // Use type assertion for name property
            const currentName = (selectedImage as any).name || `Image ${Date.now()}`;
            const currentClipPath = selectedImage.clipPath;
            const currentVisible = selectedImage.visible !== false;

            // Calculate the current displayed dimensions of the image
            // This is what we want to preserve
            const originalImage = selectedImage as FabricImage;
            const currentWidth = originalImage.width * (originalImage.scaleX || 1);
            const currentHeight = originalImage.height * (originalImage.scaleY || 1);

            console.log('Current image dimensions:', currentWidth, 'x', currentHeight);

            // Create new image from URL
            const img = await FabricImage.fromURL(data, { crossOrigin: 'anonymous' });

            // Calculate scale factors to maintain the same visual dimensions
            const newScaleX = currentWidth / img.width;
            const newScaleY = currentHeight / img.height;

            console.log('New image original dimensions:', img.width, 'x', img.height);
            console.log('New scale factors:', newScaleX, newScaleY);

            // Apply properties from the old image
            img.set({
              left: currentLeft,
              top: currentTop,
              scaleX: newScaleX,
              scaleY: newScaleY,
              angle: currentAngle,
              flipX: currentFlipX,
              flipY: currentFlipY,
              opacity: currentOpacity,
              name: currentName,
              clipPath: currentClipPath,
              visible: currentVisible
            });

            // Remove the old image (we've already checked it's not null)
            canvas.remove(selectedImage);

            // Add the new image
            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.requestRenderAll();

            // Update the selected image reference
            selectedImage = img;
            updateMenuPosition();
          } catch (error) {
            console.error('Error replacing image:', error);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
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
      canvas.off('zoom' as any, updateMenuPosition);
    }

    window.removeEventListener('resize', handleResize);
    document.removeEventListener('mousedown', handleClickOutside);
  });
</script>

{#if isVisible}
<div
  class="image-replace-menu"
  style="top: {menuPosition.top}px; left: {menuPosition.left}px;"
  bind:this={menuRef}
>
  <button class="replace-image-btn" onclick={replaceImage}>
    Replace Image
  </button>
</div>
{/if}

<style>
  .image-replace-menu {
    position: absolute;
    display: flex;
    align-items: center;
    background-color: white;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    padding: 4px 8px;
    z-index: 1000;
    pointer-events: auto;
  }

  .replace-image-btn {
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .replace-image-btn:hover {
    background-color: #45a049;
  }
</style>
