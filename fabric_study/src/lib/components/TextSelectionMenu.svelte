<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type { Canvas, IText, Textbox } from "fabric";

  // Props
  const props = $props<{
    canvas: Canvas;
  }>();

  const canvas = props.canvas;

  // State variables
  let isVisible = $state(false);
  let menuPosition = $state({ top: 0, left: 0 });
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
    return obj && (obj.type === 'i-text' || obj.type === 'textbox');
  }

  // Function to update the menu position based on the selected text
  function updateMenuPosition() {
    if (!activeTextObject || !canvas) return;

    const zoom = canvas.getZoom();
    const objRect = activeTextObject.getBoundingRect();
    const canvasRect = canvas.getElement().getBoundingClientRect();

    // Position the menu above the text object
    const top = canvasRect.top + objRect.top * zoom - 40; // 40px above the text
    const left = canvasRect.left + objRect.left * zoom;

    menuPosition = { top, left };
  }

  // Function to show the menu when text is selected
  function showMenu() {
    const activeObject = canvas.getActiveObject();

    if (isTextObject(activeObject)) {
      activeTextObject = activeObject;
      isVisible = true;
      updateMenuPosition();
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
    activeTextObject.set('fontFamily', select.value);
    canvas.requestRenderAll();
  }

  function handleFontSizeChange(event: Event) {
    if (!activeTextObject) return;
    const select = event.target as HTMLSelectElement;
    activeTextObject.set('fontSize', parseInt(select.value, 10));
    canvas.requestRenderAll();
    updateMenuPosition();
  }

  function toggleBold() {
    if (!activeTextObject) return;
    const currentWeight = activeTextObject.fontWeight;
    activeTextObject.set('fontWeight', currentWeight === 'bold' ? 'normal' : 'bold');
    canvas.requestRenderAll();
  }

  function toggleItalic() {
    if (!activeTextObject) return;
    const currentStyle = activeTextObject.fontStyle;
    activeTextObject.set('fontStyle', currentStyle === 'italic' ? 'normal' : 'italic');
    canvas.requestRenderAll();
  }

  function toggleUnderline() {
    if (!activeTextObject) return;
    activeTextObject.set('underline', !activeTextObject.underline);
    canvas.requestRenderAll();
  }

  function toggleStrikethrough() {
    if (!activeTextObject) return;
    activeTextObject.set('linethrough', !activeTextObject.linethrough);
    canvas.requestRenderAll();
  }

  function setTextAlign(align: string) {
    if (!activeTextObject) return;
    activeTextObject.set('textAlign', align);
    canvas.requestRenderAll();
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
      // Don't hide the menu if clicking on the canvas - the canvas will handle selection changes
      if (!(event.target as HTMLElement).closest('canvas')) {
        hideMenu();
      }
    }
  }

  // Set up event listeners
  onMount(() => {
    if (canvas) {
      // Listen for selection changes on the canvas
      canvas.on('selection:created', showMenu);
      canvas.on('selection:updated', showMenu);
      canvas.on('selection:cleared', hideMenu);
      canvas.on('object:modified', updateMenuPosition);
      canvas.on('object:scaling', updateMenuPosition);
      canvas.on('object:moving', updateMenuPosition);
      canvas.on('zoom:changed', updateMenuPosition);

      // Listen for window resize
      window.addEventListener('resize', handleResize);

      // Listen for clicks outside the menu
      document.addEventListener('mousedown', handleClickOutside);
    }
  });

  // Clean up event listeners
  onDestroy(() => {
    if (canvas) {
      canvas.off('selection:created', showMenu);
      canvas.off('selection:updated', showMenu);
      canvas.off('selection:cleared', hideMenu);
      canvas.off('object:modified', updateMenuPosition);
      canvas.off('object:scaling', updateMenuPosition);
      canvas.off('object:moving', updateMenuPosition);
      canvas.off('zoom:changed', updateMenuPosition);
    }

    window.removeEventListener('resize', handleResize);
    document.removeEventListener('mousedown', handleClickOutside);
  });
</script>

{#if isVisible}
<div
  class="text-selection-menu"
  style="top: {menuPosition.top}px; left: {menuPosition.left}px;"
  bind:this={menuRef}
>
  <div class="menu-group">
    <select class="font-select" onchange={handleFontChange} value={activeTextObject?.fontFamily || 'Corben'}>
      {#each fontOptions as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  </div>

  <div class="menu-group">
    <select class="font-size-select" onchange={handleFontSizeChange} value={activeTextObject?.fontSize || 24}>
      {#each fontSizeOptions as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  </div>

  <div class="menu-group formatting-buttons">
    <button
      class="format-btn"
      class:active={activeTextObject?.fontWeight === 'bold'}
      onclick={toggleBold}
      title="Bold"
    >
      <span class="icon">B</span>
    </button>
    <button
      class="format-btn"
      class:active={activeTextObject?.fontStyle === 'italic'}
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
        <span class="icon">{option.icon === 'align-left' ? '≡' :
                           option.icon === 'align-center' ? '≡' :
                           option.icon === 'align-right' ? '≡' : '≡'}</span>
      </button>
    {/each}
  </div>

  <div class="menu-group">
    <button class="position-btn" title="Position" aria-label="Position">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="9" y1="3" x2="9" y2="21"></line>
        <line x1="15" y1="3" x2="15" y2="21"></line>
        <line x1="3" y1="9" x2="21" y2="9"></line>
        <line x1="3" y1="15" x2="21" y2="15"></line>
      </svg>
    </button>
    <button class="color-btn" title="Text Color" aria-label="Text Color">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2l-5.5 9h11z"></path>
        <path d="M6.5 11L12 22l5.5-11z"></path>
      </svg>
    </button>
    <button class="delete-btn" title="Delete" aria-label="Delete">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18"></path>
        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
      </svg>
    </button>
  </div>
</div>
{/if}

<style>
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

  .font-select, .font-size-select {
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

  .format-btn, .position-btn, .color-btn, .delete-btn {
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

  .format-btn:hover, .position-btn:hover, .color-btn:hover, .delete-btn:hover {
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

  .formatting-buttons, .alignment-buttons {
    display: flex;
    gap: 2px;
  }
</style>
