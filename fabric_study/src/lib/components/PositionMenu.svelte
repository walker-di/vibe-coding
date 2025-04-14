<script lang="ts">
  import { Canvas } from "fabric";
  import { onMount, onDestroy } from "svelte";

  // Props
  let { canvas, buttonRef, isVisible = false } = $props<{canvas: Canvas, buttonRef?: HTMLElement, isVisible?: boolean}>();
  let menuPosition = $state({ top: 0, left: 0 });
  let menuRef = $state<HTMLDivElement | null>(null);

  // Update position when visibility changes
  $effect(() => {
    if (isVisible) {
      updatePosition();
    }
  });

  // Update menu position based on button position
  function updatePosition() {
    if (isVisible && buttonRef) {
      const buttonRect = buttonRef.getBoundingClientRect();
      menuPosition = {
        top: buttonRect.bottom + 5,
        left: buttonRect.left
      };
    }
  }

  // Make toggleMenu accessible to the parent component via binding

  // Close menu when clicking outside
  function handleClickOutside(event: MouseEvent) {
    if (menuRef && !menuRef.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('[title="Position"]')) {
      isVisible = false;
    }
  }

  // Alignment functions
  function alignLeft() {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    // Calculate position

    // Calculate left position (accounting for object width and origin)
    const objectWidth = activeObject.getScaledWidth();
    const leftPosition = objectWidth * (activeObject.originX === 'center' ? 0.5 : 0);

    activeObject.set({ left: leftPosition });
    canvas.requestRenderAll();
    isVisible = false;
  }

  function alignCenter() {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    // Get canvas dimensions
    const canvasWidth = canvas.getWidth();

    // Calculate center position
    activeObject.set({ left: canvasWidth / 2 });
    if (activeObject.originX !== 'center') {
      const objectWidth = activeObject.getScaledWidth();
      activeObject.set({ left: canvasWidth / 2 - objectWidth / 2 });
    }

    canvas.requestRenderAll();
    isVisible = false;
  }

  function alignRight() {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    // Get canvas dimensions
    const canvasWidth = canvas.getWidth();

    // Calculate right position
    const objectWidth = activeObject.getScaledWidth();
    const rightPosition = canvasWidth - objectWidth * (activeObject.originX === 'center' ? 0.5 : 1);

    activeObject.set({ left: rightPosition });
    canvas.requestRenderAll();
    isVisible = false;
  }

  function alignTop() {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    // Calculate top position
    const objectHeight = activeObject.getScaledHeight();
    const topPosition = objectHeight * (activeObject.originY === 'center' ? 0.5 : 0);

    activeObject.set({ top: topPosition });
    canvas.requestRenderAll();
    isVisible = false;
  }

  function alignMiddle() {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    // Get canvas dimensions
    const canvasHeight = canvas.getHeight();

    // Calculate middle position
    activeObject.set({ top: canvasHeight / 2 });
    if (activeObject.originY !== 'center') {
      const objectHeight = activeObject.getScaledHeight();
      activeObject.set({ top: canvasHeight / 2 - objectHeight / 2 });
    }

    canvas.requestRenderAll();
    isVisible = false;
  }

  function alignBottom() {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    // Get canvas dimensions
    const canvasHeight = canvas.getHeight();

    // Calculate bottom position
    const objectHeight = activeObject.getScaledHeight();
    const bottomPosition = canvasHeight - objectHeight * (activeObject.originY === 'center' ? 0.5 : 1);

    activeObject.set({ top: bottomPosition });
    canvas.requestRenderAll();
    isVisible = false;
  }

  // Set up event listeners
  onMount(() => {
    if (typeof document !== 'undefined') {
      document.addEventListener('mousedown', handleClickOutside);
    }
  });

  // Clean up event listeners
  onDestroy(() => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('mousedown', handleClickOutside);
    }
  });
</script>

<div class="position-menu-container">
    <div
      class="position-menu"
      bind:this={menuRef}
      style="top: {menuPosition.top}px; left: {menuPosition.left}px; display: {isVisible ? 'block' : 'none'};"
    >
      <div class="menu-section">
        <h3 class="menu-title">Position</h3>
        <div class="menu-grid">
          <button class="menu-item" onclick={alignLeft} title="Align left">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="4" y1="6" x2="20" y2="6"></line>
              <line x1="4" y1="12" x2="14" y2="12"></line>
              <line x1="4" y1="18" x2="18" y2="18"></line>
            </svg>
            <span>Align left</span>
          </button>
          <button class="menu-item" onclick={alignTop} title="Align top">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="6" y1="4" x2="6" y2="20"></line>
              <line x1="12" y1="4" x2="12" y2="14"></line>
              <line x1="18" y1="4" x2="18" y2="18"></line>
            </svg>
            <span>Align top</span>
          </button>
          <button class="menu-item" onclick={alignCenter} title="Align center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="4" y1="6" x2="20" y2="6"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
              <line x1="6" y1="18" x2="18" y2="18"></line>
            </svg>
            <span>Align center</span>
          </button>
          <button class="menu-item" onclick={alignMiddle} title="Align middle">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="6" y1="4" x2="6" y2="20"></line>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="18" y1="6" x2="18" y2="18"></line>
            </svg>
            <span>Align middle</span>
          </button>
          <button class="menu-item" onclick={alignRight} title="Align right">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="4" y1="6" x2="20" y2="6"></line>
              <line x1="10" y1="12" x2="20" y2="12"></line>
              <line x1="6" y1="18" x2="20" y2="18"></line>
            </svg>
            <span>Align right</span>
          </button>
          <button class="menu-item" onclick={alignBottom} title="Align bottom">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="6" y1="4" x2="6" y2="20"></line>
              <line x1="12" y1="10" x2="12" y2="20"></line>
              <line x1="18" y1="6" x2="18" y2="20"></line>
            </svg>
            <span>Align bottom</span>
          </button>
        </div>
      </div>
    </div>
</div>

<style>
  .position-menu-container {
    position: relative;
  }

  .position-menu {
    position: fixed;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    width: 240px;
    z-index: 1000;
    overflow: hidden;
  }

  .menu-section {
    padding: 8px;
  }

  .menu-title {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 8px 0;
    padding: 0 8px;
    color: #333;
  }

  .menu-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
  }

  .menu-item {
    display: flex;
    align-items: center;
    padding: 8px;
    border: none;
    background: none;
    cursor: pointer;
    text-align: left;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .menu-item:hover {
    background-color: #f5f5f5;
  }

  .menu-item svg {
    margin-right: 8px;
    color: #555;
  }

  .menu-item span {
    font-size: 13px;
    color: #333;
  }
</style>
