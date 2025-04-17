<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type { Canvas, FabricObject } from "fabric";
  import type { Rect } from "fabric";

  // Props
  const {
    canvas,
  }: {
    canvas: Canvas;
  } = $props();

  // State variables
  let isVisible = $state(false);
  let activeShapeObject = $state<FabricObject | null>(null);
  let menuRef = $state<HTMLDivElement | null>(null);

  // Stroke width options
  const strokeWidthOptions = [
    { value: 0, label: "0" },
    { value: 1, label: "1" },
    { value: 2, label: "2" },
    { value: 3, label: "3" },
    { value: 4, label: "4" },
    { value: 5, label: "5" },
    { value: 8, label: "8" },
    { value: 10, label: "10" },
    { value: 12, label: "12" },
    { value: 16, label: "16" },
  ];

  // Function to check if the selected object is a shape object
  function isShapeObject(obj: any): obj is FabricObject {
    if (!obj) return false;

    // Check if it's a shape object but not a text object
    const shapeTypes = [
      "rect",
      "circle",
      "triangle",
      "ellipse",
      "polygon",
      "path",
      "line",
    ];

    return shapeTypes.includes(obj.type);
  }

  // Function to show the menu when a shape is selected
  function showMenu() {
    const activeObject = canvas.getActiveObject();

    if (isShapeObject(activeObject)) {
      activeShapeObject = activeObject;
      isVisible = true;
    } else {
      hideMenu();
    }
  }

  // Function to hide the menu
  function hideMenu() {
    isVisible = false;
    activeShapeObject = null;
  }

  // Event handlers for shape formatting
  function handleStrokeWidthChange(event: Event) {
    if (!activeShapeObject) return;
    const select = event.target as HTMLSelectElement;
    activeShapeObject.set("strokeWidth", parseInt(select.value, 10));
    canvas.requestRenderAll();
  }

  function handleFillColorChange(event: Event) {
    if (!activeShapeObject) return;
    const input = event.target as HTMLInputElement;
    activeShapeObject.set("fill", input.value);
    canvas.requestRenderAll();
  }

  function handleStrokeColorChange(event: Event) {
    if (!activeShapeObject) return;
    const input = event.target as HTMLInputElement;
    activeShapeObject.set("stroke", input.value);
    canvas.requestRenderAll();
  }

  function handleOpacityChange(event: Event) {
    if (!activeShapeObject) return;
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value, 10);
    activeShapeObject.set("opacity", value / 100);
    canvas.requestRenderAll();
  }

  // Function to handle border radius for rectangles
  function handleBorderRadiusChange(event: Event) {
    if (!activeShapeObject || activeShapeObject.type !== "rect") return;
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value, 10);

    // Set both rx and ry for the rectangle
    activeShapeObject.set({
      rx: value,
      ry: value,
    });

    canvas.requestRenderAll();
  }

  // Function to handle clicks outside the menu
  function handleClickOutside(event: MouseEvent) {
    if (menuRef && !menuRef.contains(event.target as Node)) {
      // Don't hide if clicking on the canvas - let the canvas selection handle it
      if (!(event.target as HTMLElement).closest("canvas")) {
        hideMenu();
      }
    }
  }

  // Set up event listeners
  onMount(() => {
    canvas.on("selection:created", showMenu);
    canvas.on("selection:updated", showMenu);
    canvas.on("selection:cleared", hideMenu);

    // Listen for clicks outside the menu
    document.addEventListener("mousedown", handleClickOutside);
  });

  // Clean up event listeners
  onDestroy(() => {
    canvas.off("selection:created", showMenu);
    canvas.off("selection:updated", showMenu);
    canvas.off("selection:cleared", hideMenu);

    document.removeEventListener("mousedown", handleClickOutside);
  });
</script>

{#if isVisible}
  <div class="shape-selection-menu" bind:this={menuRef} style="top: 3rem;">
    <div class="menu-group">
      <label for="fill-color" class="color-label">Fill:</label>
      <input
        id="fill-color"
        type="color"
        class="color-input"
        value={activeShapeObject?.fill?.toString() || "#ffffff"}
        onchange={handleFillColorChange}
        oninput={handleFillColorChange}
        title="Fill Color"
      />
    </div>

    <div class="menu-group">
      <label for="stroke-color" class="color-label">Stroke:</label>
      <input
        id="stroke-color"
        type="color"
        class="color-input"
        value={activeShapeObject?.stroke?.toString() || "#000000"}
        onchange={handleStrokeColorChange}
        oninput={handleStrokeColorChange}
        title="Stroke Color"
      />
    </div>

    <div class="menu-group">
      <label for="stroke-width" class="select-label">Stroke:</label>
      <select
        id="stroke-width"
        class="stroke-width-select"
        onchange={handleStrokeWidthChange}
        value={activeShapeObject?.strokeWidth || 1}
      >
        {#each strokeWidthOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>

    <div class="menu-group">
      <label for="opacity-slider" class="slider-label">Opacity:</label>
      <input
        id="opacity-slider"
        type="range"
        min="0"
        max="100"
        value={activeShapeObject
          ? Math.round(activeShapeObject.opacity * 100)
          : 100}
        onchange={handleOpacityChange}
        class="opacity-slider"
        title="Opacity"
      />
    </div>

    {#if activeShapeObject?.type === "rect"}
      <div class="menu-group">
        <label for="radius-slider" class="slider-label">Radius:</label>
        <input
          id="radius-slider"
          type="range"
          min="0"
          max="50"
          value={(activeShapeObject as Rect).rx || 0}
          onchange={handleBorderRadiusChange}
          class="radius-slider"
          title="Border Radius"
        />
      </div>
    {/if}
  </div>
{/if}

<style>
  .shape-selection-menu {
    position: absolute;
    display: flex;
    align-items: center;
    background-color: white;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    padding: 4px 8px;
    z-index: 1000;
    gap: 8px;
    pointer-events: auto;
  }

  .menu-group {
    display: flex;
    align-items: center;
    gap: 4px;
    border-right: 1px solid #e0e0e0;
    padding-right: 8px;
  }

  .menu-group:last-child {
    border-right: none;
    padding-right: 0;
  }

  .stroke-width-select {
    padding: 4px 8px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    font-size: 14px;
    background-color: white;
    width: 60px;
  }

  .color-input {
    width: 30px;
    height: 30px;
    padding: 0;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    cursor: pointer;
  }

  .color-label {
    font-size: 14px;
    margin-right: 4px;
  }

  .select-label,
  .slider-label {
    font-size: 14px;
    white-space: nowrap;
  }

  .opacity-slider,
  .radius-slider {
    width: 100px;
    margin: 0 4px;
  }
</style>
