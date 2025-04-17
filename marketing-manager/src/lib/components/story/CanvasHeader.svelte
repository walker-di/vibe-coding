<script lang="ts">
  import { Canvas, type FabricObject } from "fabric";
  import { onMount, onDestroy } from "svelte";
  import PositionMenu from "./PositionMenu.svelte";
  import TransparencyMenu from "./TransparencyMenu.svelte";
  import type { CanvasService } from "./canvas-service.svelte";
  import {
    CopyIcon,
    Droplet,
    LayersIcon,
    LockIcon,
    RedoIcon,
    Trash2,
    UndoIcon,
  } from "lucide-svelte";
    import TextSelectionMenu from "./TextSelectionMenu.svelte";
    import ShapeStyleMenu from "./ShapeStyleMenu.svelte";

  // Props
  let {
    duration = "5.0s",
    canvas,
    canvasService,
  } = $props<{
    duration?: string;
    canvas?: Canvas;
    canvasService?: CanvasService;
  }>();

  // State variables
  let canUndo = $state(false);
  let canRedo = $state(false);
  let positionMenuVisible = $state(false);
  let transparencyMenuVisible = $state(false);

  // References to buttons for positioning menus
  let positionButtonRef = $state<HTMLElement | null>(null);
  let transparencyButtonRef = $state<HTMLElement | null>(null);

  // Add click outside handler to close menus
  function handleClickOutside(event: MouseEvent) {
    // Close menus when clicking outside of them
    if (
      positionMenuVisible &&
      positionButtonRef &&
      !positionButtonRef.contains(event.target as Node) &&
      !(event.target as HTMLElement).closest(".position-menu")
    ) {
      positionMenuVisible = false;
    }

    if (
      transparencyMenuVisible &&
      transparencyButtonRef &&
      !transparencyButtonRef.contains(event.target as Node) &&
      !(event.target as HTMLElement).closest(".transparency-menu")
    ) {
      transparencyMenuVisible = false;
    }
  }

  // Set up event listeners
  onMount(() => {
    if (typeof document !== "undefined") {
      document.addEventListener("mousedown", handleClickOutside);

      // Add keyboard shortcuts for undo/redo
      document.addEventListener("keydown", handleKeyDown);
    }

    // Set up history state change listeners
    if (canvasService?.history) {
      console.log("HeaderMenu: History service found");
      updateHistoryState();

      // Listen for history events
      canvas?.on("history:append" as any, updateHistoryState);
      canvas?.on("history:undo" as any, updateHistoryState);
      canvas?.on("history:redo" as any, updateHistoryState);
      canvas?.on("history:clear" as any, updateHistoryState);
    } else {
      console.log("HeaderMenu: History service not found");
    }

    // Force update after a short delay to ensure history state is initialized
    setTimeout(() => {
      if (canvasService?.history) {
        console.log("HeaderMenu: Delayed history state update");
        updateHistoryState();
      }
    }, 500);
  });

  // Clean up event listeners
  onDestroy(() => {
    if (typeof document !== "undefined") {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    }

    // Remove history event listeners
    if (canvas) {
      canvas.off("history:append" as any, updateHistoryState);
      canvas.off("history:undo" as any, updateHistoryState);
      canvas.off("history:redo" as any, updateHistoryState);
      canvas.off("history:clear" as any, updateHistoryState);
    }
  });

  // Update history state (canUndo/canRedo)
  function updateHistoryState() {
    if (canvasService?.history) {
      canUndo = canvasService.history.canUndo();
      canRedo = canvasService.history.canRedo();
      console.log("HeaderMenu: History state updated", { canUndo, canRedo });
    }
  }

  // Handle keyboard shortcuts
  function handleKeyDown(event: KeyboardEvent) {
    // Check if Ctrl key is pressed
    if (event.ctrlKey) {
      // Undo: Ctrl+Z
      if (event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
      }
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      else if (event.key === "y" || (event.key === "z" && event.shiftKey)) {
        event.preventDefault();
        handleRedo();
      }
    }
  }

  // Functions for the header menu actions
  function handleUndo() {
    console.log("Undo clicked, canUndo:", canUndo);
    if (canvasService?.history) {
      console.log("History service exists");
      if (canUndo) {
        console.log("Executing undo");
        canvasService.history.undo(() => {
          console.log("Undo callback executed");
          updateHistoryState();
        });
      } else {
        console.log("Cannot undo - no history");
      }
    } else {
      console.log("No history service available");
    }
  }

  function handleRedo() {
    console.log("Redo clicked, canRedo:", canRedo);
    if (canvasService?.history) {
      console.log("History service exists");
      if (canRedo) {
        console.log("Executing redo");
        canvasService.history.redo(() => {
          console.log("Redo callback executed");
          updateHistoryState();
        });
      } else {
        console.log("Cannot redo - no history");
      }
    } else {
      console.log("No history service available");
    }
  }

  function handlePosition() {
    positionMenuVisible = !positionMenuVisible;
  }

  function handleTransparency() {
    transparencyMenuVisible = !transparencyMenuVisible;
  }

  function handleLock() {
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    // Toggle selectable property to lock/unlock
    const isLocked = !activeObject.selectable;
    activeObject.set("selectable", isLocked);

    // If locking, deselect the object
    if (!isLocked) {
      canvas.discardActiveObject();
    }

    canvas.requestRenderAll();
  }

  function handleDuplicate() {
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    // Clone the object
    activeObject.clone().then((clonedObj: FabricObject) => {
      // Offset the cloned object slightly to make it visible
      clonedObj.set({
        left: activeObject.left! + 10,
        top: activeObject.top! + 10,
        evented: true,
      });

      // Add the cloned object to the canvas
      canvas.add(clonedObj);
      canvas.setActiveObject(clonedObj);
      canvas.requestRenderAll();
    });
  }

  function handleDelete() {
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    // Remove the object from the canvas
    canvas.remove(activeObject);
    canvas.requestRenderAll();
  }

  function handleRenderVideo() {
    // Implement render video functionality
    console.log("Render video clicked");
  }
</script>

<div class="header-menu">
  <div class="left-controls relative">
    <button
      class="icon-button"
      title="Undo"
      onclick={handleUndo}
      disabled={!canUndo}
    >
      <UndoIcon />
    </button>
    <button
      class="icon-button"
      title="Redo"
      onclick={handleRedo}
      disabled={!canRedo}
    >
      <RedoIcon />
    </button>
    {#if canvas}
    <TextSelectionMenu {canvas} />
    <ShapeStyleMenu {canvas} />
    {/if}
  </div>

  <div class="right-controls">
    <div class="position-container">
      <button
        class="icon-button"
        title="Position"
        onclick={handlePosition}
        aria-label="Position"
        bind:this={positionButtonRef}
      >
        <LayersIcon />
      </button>
      {#if canvas}
        <PositionMenu
          {canvas}
          buttonRef={positionButtonRef}
          isVisible={positionMenuVisible}
        />
      {/if}
    </div>

    <div class="transparency-container">
      <button
        class="icon-button"
        title="Transparency"
        onclick={handleTransparency}
        aria-label="Transparency"
        bind:this={transparencyButtonRef}
      >
        <Droplet />
      </button>
      {#if canvas}
        <TransparencyMenu
          {canvas}
          buttonRef={transparencyButtonRef}
          isVisible={transparencyMenuVisible}
        />
      {/if}
    </div>

    <button
      class="icon-button"
      title="Lock"
      onclick={handleLock}
      aria-label="Lock"
    >
      <LockIcon />
    </button>

    <button
      class="icon-button"
      title="Duplicate"
      onclick={handleDuplicate}
      aria-label="Duplicate"
    >
      <CopyIcon />
    </button>

    <button
      class="icon-button"
      title="Delete"
      onclick={handleDelete}
      aria-label="Delete"
    >
      <Trash2 />
    </button>
  </div>
</div>

<style>
  .header-menu {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 16px;
    background-color: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
    height: 40px;
    margin-bottom: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .left-controls,
  .right-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .position-container,
  .transparency-container {
    position: relative;
  }

  .center-controls {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    cursor: pointer;
    padding: 6px;
    border-radius: 4px;
    color: #6c757d;
  }

  .icon-button:hover {
    background-color: #e9ecef;
    color: #495057;
  }

  .icon-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .blank-square {
    width: 20px;
    height: 20px;
    border: 1px solid #ced4da;
    background-color: white;
  }

  .timer {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 14px;
    color: #495057;
    padding: 4px 8px;
    border-radius: 4px;
    background-color: white;
    border: 1px solid #ced4da;
  }
</style>
