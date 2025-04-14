<script lang="ts">
  import { Canvas } from "fabric";
  import { onMount, onDestroy } from "svelte";

  // Props
  let { canvas, buttonRef, isVisible = false } = $props<{canvas: Canvas, buttonRef?: HTMLElement, isVisible?: boolean}>();
  let menuPosition = $state({ top: 0, left: 0 });
  let menuRef = $state<HTMLDivElement | null>(null);
  let opacity = $state(100);

  // Update position and opacity when visibility changes
  $effect(() => {
    if (isVisible) {
      updatePosition();

      // Get current opacity from selected object
      const activeObject = canvas.getActiveObject();
      if (activeObject) {
        opacity = Math.round(activeObject.opacity * 100);
      }
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

  // Expose the toggle method to parent components via binding

  // Close menu when clicking outside
  function handleClickOutside(event: MouseEvent) {
    if (menuRef && !menuRef.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('[title="Transparency"]')) {
      isVisible = false;
    }
  }

  // isVisible is controlled by the parent component

  // Update opacity of selected object
  function updateOpacity(event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value);
    opacity = value;

    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      activeObject.set('opacity', value / 100);
      canvas.requestRenderAll();
    }
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

<div class="transparency-menu-container">
    <div
      class="transparency-menu"
      bind:this={menuRef}
      style="top: {menuPosition.top}px; left: {menuPosition.left}px; display: {isVisible ? 'block' : 'none'};"
    >
      <div class="menu-section">
        <h3 class="menu-title">Transparency</h3>
        <div class="slider-container">
          <input
            type="range"
            min="0"
            max="100"
            value={opacity}
            class="opacity-slider"
            oninput={updateOpacity}
          />
          <div class="opacity-value">{opacity}%</div>
        </div>
      </div>
    </div>
</div>

<style>
  .transparency-menu-container {
    position: relative;
  }

  .transparency-menu {
    position: fixed;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    width: 240px;
    z-index: 1000;
    overflow: hidden;
  }

  .menu-section {
    padding: 12px;
  }

  .menu-title {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 12px 0;
    color: #333;
  }

  .slider-container {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .opacity-slider {
    flex: 1;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: #e0e0e0;
    outline: none;
    border-radius: 2px;
  }

  .opacity-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #4a90e2;
    cursor: pointer;
  }

  .opacity-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #4a90e2;
    cursor: pointer;
    border: none;
  }

  .opacity-value {
    font-size: 13px;
    color: #333;
    min-width: 40px;
    text-align: right;
  }
</style>
