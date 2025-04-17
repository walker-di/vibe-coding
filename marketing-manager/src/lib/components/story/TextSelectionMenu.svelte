<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type { Canvas, FabricObject, IText, Textbox } from "fabric";

  // Props
  const props = $props<{
    canvas: Canvas;
  }>();

  const canvas = props.canvas;

  // State variables
  let isVisible = $state(false);
  let activeTextObject = $state<IText | Textbox | null>(null);
  let menuRef = $state<HTMLDivElement | null>(null);

  // Font options
  const fontOptions = [
    { value: "Corben", label: "Corben" },
    { value: "Arial", label: "Arial" },
    { value: "Helvetica", label: "Helvetica" },
    { value: "Times New Roman", label: "Times New Roman" },
    { value: "Courier New", label: "Courier New" },
  ];

  // Font size options
  const fontSizeOptions = [
    { value: 8, label: "8" },
    { value: 10, label: "10" },
    { value: 12, label: "12" },
    { value: 14, label: "14" },
    { value: 16, label: "16" },
    { value: 18, label: "18" },
    { value: 24, label: "24" },
    { value: 36, label: "36" },
    { value: 48, label: "48" },
    { value: 72, label: "72" },
  ];

  // Text alignment options
  const alignmentOptions = [
    { value: "left", icon: "align-left", label: "Align Left" },
    { value: "center", icon: "align-center", label: "Align Center" },
    { value: "right", icon: "align-right", label: "Align Right" },
    { value: "justify", icon: "align-justify", label: "Justify" },
  ];

  // Function to check if the selected object is a text object
  function isTextObject(obj: any): obj is IText | Textbox {
    return obj && (obj.type === "i-text" || obj.type === "textbox");
  }

  // Function to show the menu when text is selected
  function showMenu() {
    const activeObject = canvas.getActiveObject();

    if (isTextObject(activeObject)) {
      activeTextObject = activeObject;
      isVisible = true;
    } else {
      hideMenu();
    }
  }

  // Function to hide the menu
  function hideMenu() {
    isVisible = false;
    activeTextObject = null;
  }

  // Event handlers for text formatting
  function handleFontChange(event: Event) {
    if (!activeTextObject) return;
    const select = event.target as HTMLSelectElement;
    activeTextObject.set("fontFamily", select.value);
    canvas.requestRenderAll();
  }

  function handleFontSizeChange(event: Event) {
    if (!activeTextObject) return;
    const select = event.target as HTMLSelectElement;
    activeTextObject.set("fontSize", parseInt(select.value, 10));
    canvas.requestRenderAll();
  }

  function toggleBold() {
    if (!activeTextObject) return;
    const currentWeight = activeTextObject.fontWeight;
    activeTextObject.set(
      "fontWeight",
      currentWeight === "bold" ? "normal" : "bold",
    );
    canvas.requestRenderAll();
  }

  function toggleItalic() {
    if (!activeTextObject) return;
    const currentStyle = activeTextObject.fontStyle;
    activeTextObject.set(
      "fontStyle",
      currentStyle === "italic" ? "normal" : "italic",
    );
    canvas.requestRenderAll();
  }

  function toggleUnderline() {
    if (!activeTextObject) return;
    activeTextObject.set("underline", !activeTextObject.underline);
    canvas.requestRenderAll();
  }

  function toggleStrikethrough() {
    if (!activeTextObject) return;
    activeTextObject.set("linethrough", !activeTextObject.linethrough);
    canvas.requestRenderAll();
  }

  function setTextAlign(align: string) {
    if (!activeTextObject) return;
    activeTextObject.set("textAlign", align);
    canvas.requestRenderAll();
  }

  // Function to handle window resize
  function handleResize() {
    if (isVisible) {
    }
  }

  // Function to handle clicks outside the menu
  function handleClickOutside(event: MouseEvent) {
    if (menuRef && !menuRef.contains(event.target as Node)) {
      // Don't hide the menu if clicking on the canvas - the canvas will handle selection changes
      if (!(event.target as HTMLElement).closest("canvas")) {
        hideMenu();
      }
    }
  }

  // Set up event listeners
  onMount(() => {
    if (canvas) {
      // Listen for selection changes on the canvas
      canvas.on("selection:created", showMenu);
      canvas.on("selection:updated", showMenu);
      canvas.on("selection:cleared", hideMenu);
    }
  });

  // Clean up event listeners
  onDestroy(() => {
    if (canvas) {
      canvas.off("selection:created", showMenu);
      canvas.off("selection:updated", showMenu);
      canvas.off("selection:cleared", hideMenu);
    }

    window.removeEventListener("resize", handleResize);
    document.removeEventListener("mousedown", handleClickOutside);
  });

  function handleFillColorChange(event: Event) {
    if (!activeTextObject) return;
    const input = event.target as HTMLInputElement;
    activeTextObject.set("fill", input.value);
    canvas.requestRenderAll();
  }
  function handleStrokeColorChange(event: Event) {
    if (!activeTextObject) return;
    const input = event.target as HTMLInputElement;
    activeTextObject.set("stroke", input.value);
    canvas.requestRenderAll();
  }
</script>

{#if isVisible}
  <div class="text-selection-menu" bind:this={menuRef} style="top: 3rem;">
    <div class="menu-group">
      <label for="fill-color" class="color-label">Fill:</label>
      <input
        id="fill-color"
        type="color"
        class="color-input"
        value={activeTextObject?.fill?.toString() || "#ffffff"}
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
        value={activeTextObject?.stroke?.toString() || "#000000"}
        onchange={handleStrokeColorChange}
        oninput={handleStrokeColorChange}
        title="Stroke Color"
      />
    </div>
    <div class="menu-group">
      <select
        class="font-select"
        onchange={handleFontChange}
        value={activeTextObject?.fontFamily || "Corben"}
      >
        {#each fontOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>

    <div class="menu-group">
      <select
        class="font-size-select"
        onchange={handleFontSizeChange}
        value={activeTextObject?.fontSize || 24}
      >
        {#each fontSizeOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>

    <div class="menu-group formatting-buttons">
      <button
        class="format-btn"
        class:active={activeTextObject?.fontWeight === "bold"}
        onclick={toggleBold}
        title="Bold"
      >
        <span class="icon">B</span>
      </button>
      <button
        class="format-btn"
        class:active={activeTextObject?.fontStyle === "italic"}
        onclick={toggleItalic}
        title="Italic"
      >
        <span class="icon">I</span>
      </button>
      <button
        class="format-btn"
        class:active={activeTextObject?.underline}
        onclick={toggleUnderline}
        title="Underline"
      >
        <span class="icon">U</span>
      </button>
      <button
        class="format-btn"
        class:active={activeTextObject?.linethrough}
        onclick={toggleStrikethrough}
        title="Strikethrough"
      >
        <span class="icon">S</span>
      </button>
    </div>

    <div class="menu-group alignment-buttons">
      {#each alignmentOptions as option}
        <button
          class="format-btn"
          class:active={activeTextObject?.textAlign === option.value}
          onclick={() => setTextAlign(option.value)}
          title={option.label}
        >
          <span class="icon"
            >{option.icon === "align-left"
              ? "≡"
              : option.icon === "align-center"
                ? "≡"
                : option.icon === "align-right"
                  ? "≡"
                  : "≡"}</span
          >
        </button>
      {/each}
    </div>
  </div>
{/if}

<style>
  .color-input {
    width: 30px;
    height: 30px;
    padding: 0;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    cursor: pointer;
  }
  .text-selection-menu {
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

  .font-select,
  .font-size-select {
    padding: 4px 8px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    font-size: 14px;
    background-color: white;
  }

  .font-select {
    min-width: 120px;
  }

  .font-size-select {
    width: 60px;
  }

  .format-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid transparent;
    border-radius: 4px;
    background: none;
    cursor: pointer;
    padding: 0;
    color: #555;
  }

  .format-btn:hover {
    background-color: #f5f5f5;
  }

  .format-btn.active {
    background-color: #e6f7ff;
    border-color: #91d5ff;
    color: #1890ff;
  }

  .icon {
    font-size: 14px;
    font-weight: bold;
  }

  .formatting-buttons,
  .alignment-buttons {
    display: flex;
    gap: 2px;
  }
</style>
