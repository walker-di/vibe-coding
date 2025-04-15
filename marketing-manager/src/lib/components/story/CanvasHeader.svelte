<script lang="ts">
    import { Canvas, type FabricObject } from "fabric";
    import { onMount, onDestroy } from "svelte";
    import PositionMenu from "./PositionMenu.svelte";
    import TransparencyMenu from "./TransparencyMenu.svelte";
    import type { CanvasService } from "./canvas-service.svelte";
  
    // Props
    let { duration = "5.0s", canvas, canvasService } = $props<{duration?: string, canvas?: Canvas, canvasService?: CanvasService}>();
  
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
      if (positionMenuVisible &&
          positionButtonRef &&
          !positionButtonRef.contains(event.target as Node) &&
          !(event.target as HTMLElement).closest('.position-menu')) {
        positionMenuVisible = false;
      }
  
      if (transparencyMenuVisible &&
          transparencyButtonRef &&
          !transparencyButtonRef.contains(event.target as Node) &&
          !(event.target as HTMLElement).closest('.transparency-menu')) {
        transparencyMenuVisible = false;
      }
    }
  
    // Set up event listeners
    onMount(() => {
      if (typeof document !== 'undefined') {
        document.addEventListener('mousedown', handleClickOutside);
  
        // Add keyboard shortcuts for undo/redo
        document.addEventListener('keydown', handleKeyDown);
      }
  
      // Set up history state change listeners
      if (canvasService?.history) {
        console.log('HeaderMenu: History service found');
        updateHistoryState();
  
        // Listen for history events
        canvas?.on('history:append' as any, updateHistoryState);
        canvas?.on('history:undo' as any, updateHistoryState);
        canvas?.on('history:redo' as any, updateHistoryState);
        canvas?.on('history:clear' as any, updateHistoryState);
      } else {
        console.log('HeaderMenu: History service not found');
      }
  
      // Force update after a short delay to ensure history state is initialized
      setTimeout(() => {
        if (canvasService?.history) {
          console.log('HeaderMenu: Delayed history state update');
          updateHistoryState();
        }
      }, 500);
    });
  
    // Clean up event listeners
    onDestroy(() => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      }
  
      // Remove history event listeners
      if (canvas) {
        canvas.off('history:append' as any, updateHistoryState);
        canvas.off('history:undo' as any, updateHistoryState);
        canvas.off('history:redo' as any, updateHistoryState);
        canvas.off('history:clear' as any, updateHistoryState);
      }
    });
  
    // Update history state (canUndo/canRedo)
    function updateHistoryState() {
      if (canvasService?.history) {
        canUndo = canvasService.history.canUndo();
        canRedo = canvasService.history.canRedo();
        console.log('HeaderMenu: History state updated', { canUndo, canRedo });
      }
    }
  
    // Handle keyboard shortcuts
    function handleKeyDown(event: KeyboardEvent) {
      // Check if Ctrl key is pressed
      if (event.ctrlKey) {
        // Undo: Ctrl+Z
        if (event.key === 'z' && !event.shiftKey) {
          event.preventDefault();
          handleUndo();
        }
        // Redo: Ctrl+Y or Ctrl+Shift+Z
        else if ((event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
          event.preventDefault();
          handleRedo();
        }
      }
    }
  
    // Functions for the header menu actions
    function handleUndo() {
      console.log('Undo clicked, canUndo:', canUndo);
      if (canvasService?.history) {
        console.log('History service exists');
        if (canUndo) {
          console.log('Executing undo');
          canvasService.history.undo(() => {
            console.log('Undo callback executed');
            updateHistoryState();
          });
        } else {
          console.log('Cannot undo - no history');
        }
      } else {
        console.log('No history service available');
      }
    }
  
    function handleRedo() {
      console.log('Redo clicked, canRedo:', canRedo);
      if (canvasService?.history) {
        console.log('History service exists');
        if (canRedo) {
          console.log('Executing redo');
          canvasService.history.redo(() => {
            console.log('Redo callback executed');
            updateHistoryState();
          });
        } else {
          console.log('Cannot redo - no history');
        }
      } else {
        console.log('No history service available');
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
      activeObject.set('selectable', isLocked);
  
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
      console.log('Render video clicked');
    }
  </script>
  
  <div class="header-menu">
    <div class="left-controls">
      <button class="icon-button" title="Undo" onclick={handleUndo} disabled={!canUndo} aria-label="Undo">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 7v6h6"></path>
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
        </svg>
      </button>
      <button class="icon-button" title="Redo" onclick={handleRedo} disabled={!canRedo} aria-label="Redo">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 7v6h-6"></path>
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path>
        </svg>
      </button>
      <div class="blank-square"></div>
    </div>
  
    <div class="center-controls">
      <div class="timer">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span>{duration}</span>
      </div>
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
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 3H3v18h18V3z"></path>
            <path d="M9 9h6v6H9V9z"></path>
          </svg>
        </button>
        {#if canvas}
          <PositionMenu {canvas} buttonRef={positionButtonRef} isVisible={positionMenuVisible} />
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
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
          </svg>
        </button>
        {#if canvas}
          <TransparencyMenu {canvas} buttonRef={transparencyButtonRef} isVisible={transparencyMenuVisible} />
        {/if}
      </div>
  
      <button class="icon-button" title="Lock" onclick={handleLock} aria-label="Lock">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </button>
  
      <button class="icon-button" title="Duplicate" onclick={handleDuplicate} aria-label="Duplicate">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
  
      <button class="icon-button" title="Delete" onclick={handleDelete} aria-label="Delete">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
  
      <button class="icon-button" title="Help" aria-label="Help">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </button>
  
      <!-- <button class="render-button" onclick={handleRenderVideo}>
        Render video
      </button> -->
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
  
    .left-controls, .right-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  
    .position-container, .transparency-container {
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
  
    .render-button {
      background-color: #4a6ee0;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 6px 12px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
      margin-left: 8px;
    }
  
    .render-button:hover {
      background-color: #3a5bbf;
    }
  </style>
  