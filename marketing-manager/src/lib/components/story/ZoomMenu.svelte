<script lang="ts">
  import { onMount } from "svelte";
  import type { CanvasZoomPan } from "./canvas-zoom-pan.svelte";

  const {
    canvasZoomPan,
    zoomChange = () => {}
  }: {
    canvasZoomPan: CanvasZoomPan;
    zoomChange?: (event: { zoom: number }) => void;
  } = $props();

  let isOpen = $state(false);
  let currentZoom = $state(100); // Default zoom level in percentage
  let sliderValue = $state(100); // Slider value in percentage
  let menuRef: HTMLDivElement;

  // Min and max zoom values for the slider
  const minZoom = 10; // 10%
  const maxZoom = 300; // 300%

  // Zoom level options
  const zoomLevels = [
    { value: 10, label: "10%" },
    { value: 25, label: "25%" },
    { value: 50, label: "50%" },
    { value: 75, label: "75%" },
    { value: 100, label: "100%" },
    { value: 125, label: "125%" },
    { value: 200, label: "200%" },
    { value: 300, label: "300%" },
  ];

  // Special options
  const specialOptions = [
    { id: "fit-editor", label: "Ajustar ao editor" },
    { id: "fit-all", label: "Ver inteiro" }
  ];

  // Toggle menu open/close
  function toggleMenu() {
    isOpen = !isOpen;
  }

  // Close menu when clicking outside
  function handleClickOutside(event: MouseEvent) {
    if (menuRef && !menuRef.contains(event.target as Node)) {
      isOpen = false;
    }
  }

  // Set zoom level
  function setZoomLevel(zoomPercent: number) {
    const zoomFactor = zoomPercent / 100;

    // Get canvas center for zooming
    const canvas = canvasZoomPan.getCanvas();
    const center = {
      x: canvas.width! / 2,
      y: canvas.height! / 2
    };

    canvasZoomPan.zoomToLevel(zoomFactor, center);
    currentZoom = zoomPercent;
    sliderValue = zoomPercent;
    isOpen = false;

    zoomChange({ zoom: zoomPercent });
  }

  // Handle slider change
  function handleSliderChange(event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value);
    sliderValue = value;

    // Update the slider fill
    updateSliderFill();

    // Debounce the actual zoom change to improve performance
    // Only apply zoom when slider stops moving
    if (event.type === 'change') {
      setZoomLevel(value);
    } else {
      // Just update the display value during sliding
      currentZoom = value;
    }
  }

  // Update the slider fill based on current value
  function updateSliderFill() {
    const percent = ((sliderValue - minZoom) / (maxZoom - minZoom)) * 100;
    const sliderContainer = document.querySelector('.slider-container') as HTMLElement;
    if (sliderContainer) {
      sliderContainer.style.setProperty('--percent', `${percent}%`);
    }
  }

  // Handle special options
  function handleSpecialOption(optionId: string) {
    if (optionId === "fit-all") {
      canvasZoomPan.zoomToFit();
      // Update current zoom after fitting
      setTimeout(() => {
        currentZoom = Math.round(canvasZoomPan.getCanvas().getZoom() * 100);
        zoomChange({ zoom: currentZoom });
      }, 50);
    } else if (optionId === "fit-editor") {
      canvasZoomPan.zoomToFitWidth();
      // Update current zoom after fitting
      setTimeout(() => {
        currentZoom = Math.round(canvasZoomPan.getCanvas().getZoom() * 100);
        zoomChange({ zoom: currentZoom });
      }, 50);
    }

    isOpen = false;
  }

  // Update zoom display when canvas zoom changes
  function updateZoomDisplay() {
    if (canvasZoomPan) {
      const canvas = canvasZoomPan.getCanvas();
      if (canvas) {
        const zoom = canvas.getZoom();
        currentZoom = Math.round(zoom * 100);
        sliderValue = currentZoom;
        updateSliderFill();
        zoomChange({ zoom: currentZoom });
      }
    }
  }

  // Initialize
  onMount(() => {
    // Add click outside listener
    document.addEventListener('click', handleClickOutside);

    // Update zoom display initially
    setTimeout(() => {
      updateZoomDisplay();
      updateSliderFill();
    }, 100);

    // Listen for zoom changes
    const canvas = canvasZoomPan.getCanvas();
    if (canvas) {
      canvas.on('mouse:wheel', updateZoomDisplay);

      return () => {
        document.removeEventListener('click', handleClickOutside);
        canvas.off('mouse:wheel', updateZoomDisplay);
      };
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });
</script>

<div class="zoom-menu-container" bind:this={menuRef}>
  <div class="zoom-controls">
    <div class="slider-container">
      <input
        type="range"
        min={minZoom}
        max={maxZoom}
        value={sliderValue}
        class="zoom-slider"
        onchange={handleSliderChange}
        oninput={handleSliderChange}
      />
    </div>
    <button class="zoom-display" onclick={toggleMenu}>
      {currentZoom}%
    </button>
  </div>

  {#if isOpen}
    <div class="zoom-dropdown">
      <div class="special-options">
        {#each specialOptions as option}
          <button
            class="special-option"
            onclick={() => handleSpecialOption(option.id)}
          >
            {option.label}
            {#if option.id === "fit-editor"}
              <span class="checkmark">✓</span>
            {/if}
          </button>
        {/each}
      </div>

      <div class="zoom-options">
        {#each zoomLevels as level}
          <button
            class="zoom-option"
            class:active={currentZoom === level.value}
            onclick={() => setZoomLevel(level.value)}
          >
            {level.label}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .zoom-menu-container {
    position: relative;
    display: inline-block;
  }

  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .slider-container {
    width: 120px;
    position: relative;
  }

  .zoom-slider {
    width: 100%;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: #e0e0e0;
    outline: none;
    border-radius: 2px;
    margin: 0;
    position: relative;
    z-index: 1;
  }

  .zoom-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #4285f4;
    cursor: pointer;
    margin-top: -4px;
  }

  .zoom-slider::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #4285f4;
    cursor: pointer;
    border: none;
  }

  .zoom-slider::-webkit-slider-runnable-track {
    height: 4px;
    border-radius: 2px;
    background: #e0e0e0;
  }

  .zoom-slider::-moz-range-track {
    height: 4px;
    border-radius: 2px;
    background: #e0e0e0;
  }

  /* Style for the filled part of the slider */
  .slider-container {
    --percent: 0%;
    position: relative;
  }

  .slider-container::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    height: 4px;
    width: var(--percent);
    background-color: #4285f4;
    border-radius: 2px;
    pointer-events: none;
    z-index: 0;
  }

  .zoom-display {
    background-color: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 14px;
    cursor: pointer;
    min-width: 50px;
    text-align: center;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .zoom-dropdown {
    position: absolute;
    right: 0;
    bottom: calc(100% + 10px);
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    width: 150px;
    z-index: 1000;
    overflow: hidden;
  }

  .zoom-options {
    display: flex;
    flex-direction: column;
  }

  .zoom-option, .special-option {
    padding: 10px 16px;
    text-align: left;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;
  }

  .zoom-option:hover, .special-option:hover {
    background-color: #f5f5f5;
  }

  .zoom-option.active {
    font-weight: bold;
  }

  .special-options {
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid #eee;
  }

  .special-option {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .checkmark {
    font-weight: bold;
  }
</style>
