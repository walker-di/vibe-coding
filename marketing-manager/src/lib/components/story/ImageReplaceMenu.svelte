<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { type Canvas, type FabricObject, FabricImage } from "fabric";
  import ImageUploadModal from "./ImageUploadModal.svelte";

  // Props
  const props: {
    canvas: Canvas;
  } = $props();

  const canvas = props.canvas;

  // State variables
  let isVisible = $state(false);
  let selectedImage = $state<FabricObject>();
  let menuRef: HTMLDivElement | null = $state(null);
  let isImageUploadModalOpen = $state(false);

  // Function to check if an object is an image
  function isImageObject(obj: any): boolean {
    return obj && obj.type === "image";
  }

  // Function to check selection and show menu if an image is selected
  function checkSelection() {
    const activeObject = canvas.getActiveObject();

    if (isImageObject(activeObject)) {
      selectedImage = activeObject;
      isVisible = true;
      console.log("ImageReplaceMenu: Image selected, showing menu", isVisible);
    } else {
      hideMenu();
    }
  }

  // Function to hide the menu
  function hideMenu() {
    isVisible = false;
    selectedImage = undefined;
  }

  // Function to open the image upload modal
  function replaceImage() {
    if (!selectedImage || !canvas) return;
    isImageUploadModalOpen = true;
  }

  // Function to handle image selection from the modal
  async function handleImageSelected(url: string) {
    if (!selectedImage || !canvas || !url) return;

    try {
      // Get current image properties
      const currentLeft = selectedImage.left || 0;
      const currentTop = selectedImage.top || 0;
      const currentAngle = selectedImage.angle || 0;
      const currentFlipX = selectedImage.flipX || false;
      const currentFlipY = selectedImage.flipY || false;
      const currentOpacity = selectedImage.opacity || 1;
      // Use type assertion for name property
      const currentName =
        (selectedImage as any).name || `Image ${Date.now()}`;
      const currentClipPath = selectedImage.clipPath;
      const currentVisible = selectedImage.visible !== false;

      // Calculate the current displayed dimensions of the image
      // This is what we want to preserve
      const originalImage = selectedImage as FabricImage;
      const currentWidth =
        originalImage.width * (originalImage.scaleX || 1);
      const currentHeight =
        originalImage.height * (originalImage.scaleY || 1);

      console.log(
        "Current image dimensions:",
        currentWidth,
        "x",
        currentHeight,
      );

      // Create new image from URL
      const img = await FabricImage.fromURL(url, {
        crossOrigin: "anonymous",
      });

      // Calculate scale factors to maintain the same visual dimensions
      const newScaleX = currentWidth / img.width;
      const newScaleY = currentHeight / img.height;

      console.log(
        "New image original dimensions:",
        img.width,
        "x",
        img.height,
      );
      console.log("New scale factors:", newScaleX, newScaleY);

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
        visible: currentVisible,
      });

      // Remove the old image (we've already checked it's not null)
      canvas.remove(selectedImage);

      // Add the new image
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();

      // Update the selected image reference
      selectedImage = img;
    } catch (error) {
      console.error("Error replacing image:", error);
    }
  }

  // Set up event listeners
  onMount(() => {
    canvas.on("selection:created", checkSelection);
    canvas.on("selection:updated", checkSelection);
    canvas.on("selection:cleared", hideMenu);
  });

  // Clean up event listeners
  onDestroy(() => {
    canvas.off("selection:created", checkSelection);
    canvas.off("selection:updated", checkSelection);
    canvas.off("selection:cleared", hideMenu);
  });
</script>

{#if isVisible}
  <div class="image-replace-menu" bind:this={menuRef}>
    <button class="replace-image-btn" onclick={replaceImage}>
      Replace Image
    </button>
  </div>
{/if}

<!-- Image Upload Modal -->
<ImageUploadModal
  open={isImageUploadModalOpen}
  onClose={() => (isImageUploadModalOpen = false)}
  onImageSelected={(url) => {
    handleImageSelected(url);
    isImageUploadModalOpen = false;
  }}
  modalTitle="Replace Image"
/>

<style>
  .image-replace-menu {
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
    background-color: #4caf50;
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
