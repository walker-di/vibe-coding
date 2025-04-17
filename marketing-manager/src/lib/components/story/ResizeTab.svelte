<script lang="ts">
  import { Canvas } from "fabric";
  import { onMount } from "svelte";
  import { initCanvasBorderSnap } from "./canvas-border-snap";
    import type { CanvasService } from "./canvas-service.svelte";

  // Define preset type
  type Preset = {
    id: string;
    label: string;
    width: number;
    height: number;
    icon: string;
  };

  let { canvas, canvasService }: {canvas: Canvas, canvasService: CanvasService} = $props();

  // State for width and height inputs
  let width = $state(canvas?.width || 1080);
  let height = $state(canvas?.height || 1080);
  let useMagicResize = $state(false);

  // Preset sizes
  const presets: Preset[] = [
    { id: 'instagram-post', label: 'Instagram Post', width: 1080, height: 1080, icon: '📷' },
    { id: 'instagram-story', label: 'Instagram Story', width: 1080, height: 1920, icon: '📱' },
    { id: 'instagram-ad', label: 'Instagram Ad', width: 1080, height: 1080, icon: '💰' },
    { id: 'facebook-post', label: 'Facebook Post', width: 940, height: 788, icon: '👍' },
    { id: 'facebook-cover', label: 'Facebook Cover', width: 851, height: 315, icon: '🖼️' },
    { id: 'facebook-ad', label: 'Facebook Ad', width: 1200, height: 628, icon: '📢' },
    { id: 'youtube-thumbnail', label: 'Youtube Thumbnail', width: 1280, height: 720, icon: '▶️' },
    { id: 'youtube-channel', label: 'Youtube Channel', width: 2560, height: 1440, icon: '📺' },
    { id: 'full-hd', label: 'Full HD', width: 1920, height: 1080, icon: '🎬' },
    { id: 'invitation', label: 'Invitation', width: 1654, height: 1654, icon: '✉️' }, // 14x14cm at 300dpi
    { id: 'a4', label: 'A4', width: 2480, height: 3508, icon: '📄' }, // 21x29.7cm at 300dpi
    { id: 'business-card', label: 'Business card', width: 1050, height: 600, icon: '💼' } // 3.5x2in at 300dpi
  ];

  // Function to apply resize
  function applyResize() {
    canvasService.resize(width, height, useMagicResize);
  }

  // Function to select a preset
  function selectPreset(preset: Preset) {
    width = preset.width;
    height = preset.height;
  }

  // Function to handle width input change
  function handleWidthChange(e: Event) {
    const input = e.target as HTMLInputElement;
    width = parseInt(input.value, 10) || 1080;
  }

  // Function to handle height input change
  function handleHeightChange(e: Event) {
    const input = e.target as HTMLInputElement;
    height = parseInt(input.value, 10) || 1080;
  }

  // Function to toggle magic resize
  function toggleMagicResize() {
    useMagicResize = !useMagicResize;
  }

  onMount(() => {
    // Initialize with current canvas dimensions
    if (canvas) {
      width = canvas.width || 1080;
      height = canvas.height || 1080;
    }
  });
</script>

<div class="resize-tab">
  <div class="resize-options">
    <div class="magic-resize-toggle">
      <div class="toggle-label">
        <span>Use magic resize</span>
        <button
          type="button"
          class="toggle-switch"
          class:active={useMagicResize}
          onclick={toggleMagicResize}
          onkeydown={(e) => e.key === 'Enter' && toggleMagicResize()}
          aria-pressed={useMagicResize}
          aria-label="Toggle magic resize"
        >
          <div class="toggle-slider"></div>
        </button>
      </div>
    </div>

    <div class="dimension-inputs">
      <div class="input-group">
        <label for="width-input">Width (px)</label>
        <div class="input-with-controls">
          <input
            id="width-input"
            type="number"
            value={width}
            onchange={handleWidthChange}
            oninput={handleWidthChange}
            min="50"
            max="5000"
          />
          <div class="input-controls">
            <button class="control-btn" onclick={() => width += 10} aria-label="Increase width">▲</button>
            <button class="control-btn" onclick={() => width = Math.max(50, width - 10)} aria-label="Decrease width">▼</button>
          </div>
        </div>
      </div>

      <div class="input-group">
        <label for="height-input">Height (px)</label>
        <div class="input-with-controls">
          <input
            id="height-input"
            type="number"
            value={height}
            onchange={handleHeightChange}
            oninput={handleHeightChange}
            min="50"
            max="5000"
          />
          <div class="input-controls">
            <button class="control-btn" onclick={() => height += 10} aria-label="Increase height">▲</button>
            <button class="control-btn" onclick={() => height = Math.max(50, height - 10)} aria-label="Decrease height">▼</button>
          </div>
        </div>
      </div>
    </div>

    <button class="resize-button" onclick={applyResize}>
      Resize
    </button>
  </div>

  <div class="preset-sizes">
    {#each presets as preset}
      <button
        class="preset-item"
        onclick={() => selectPreset(preset)}
        aria-label={`Set size to ${preset.label}`}
      >
        <span class="preset-icon">{preset.icon}</span>
        <span class="preset-label">{preset.label}</span>
        <span class="preset-dimensions">{preset.width} x {preset.height} px</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .resize-tab {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
    height: 100%;
    overflow-y: auto;
  }

  .resize-options {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid hsl(var(--sidebar-border));
  }

  .magic-resize-toggle {
    margin-bottom: 8px;
  }

  .toggle-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .toggle-switch {
    position: relative;
    width: 40px;
    height: 20px;
    background-color: #e0e0e0;
    border-radius: 10px;
    transition: background-color 0.3s;
  }

  .toggle-switch.active {
    background-color: #4a7dff;
  }

  .toggle-slider {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    background-color: white;
    border-radius: 50%;
    transition: transform 0.3s;
  }

  .toggle-switch.active .toggle-slider {
    transform: translateX(20px);
  }

  .dimension-inputs {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .input-group label {
    font-size: 0.85rem;
    color: hsl(var(--sidebar-foreground));
  }

  .input-with-controls {
    display: flex;
    align-items: center;
  }

  .input-with-controls input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid hsl(var(--sidebar-border));
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .input-controls {
    display: flex;
    flex-direction: column;
    margin-left: 4px;
  }

  .control-btn {
    background: none;
    border: 1px solid hsl(var(--sidebar-border));
    border-radius: 2px;
    width: 20px;
    height: 14px;
    font-size: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }

  .control-btn:hover {
    background-color: #f0f0f0;
  }

  .resize-button {
    background-color: #4a7dff;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 10px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .resize-button:hover {
    background-color: #3a6ae6;
  }

  .preset-sizes {
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
  }

  .preset-item {
    display: flex;
    align-items: center;
    padding: 10px;
    border: 1px solid hsl(var(--sidebar-border));
    border-radius: 4px;
    background: none;
    cursor: pointer;
    text-align: left;
    transition: background-color 0.2s;
  }

  .preset-item:hover {
    background-color: #f5f5f5;
  }

  .preset-icon {
    margin-right: 8px;
    font-size: 1.2rem;
    width: 24px;
    text-align: center;
  }

  .preset-label {
    flex: 1;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .preset-dimensions {
    font-size: 0.8rem;
    color: #666;
    white-space: nowrap;
  }
</style>
