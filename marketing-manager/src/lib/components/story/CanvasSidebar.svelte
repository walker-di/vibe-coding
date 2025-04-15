<script lang="ts">
    import { Canvas } from "fabric";
    import { addRectangle } from "./tools/canvas-rectangle.svelte";
    import { addCircle } from "./tools/canvas-circle.svelte";
    import { addTriangle } from "./tools/canvas-triangle.svelte";
    import { addStar } from "./tools/canvas-star.svelte";
    import { addPentagon } from "./tools/canvas-pentagon.svelte";
    import { addHexagon } from "./tools/canvas-hexagon.svelte";
    import { addSpeechBubble } from "./tools/canvas-speech.svelte";
    import { addCross } from "./tools/canvas-cross.svelte";
    import { addArch } from "./tools/canvas-arch.svelte";
    import { addCloud } from "./tools/canvas-cloud.svelte";
    import { addSolidLine, addDashedLine, addDottedLine } from "./tools/canvas-line.svelte";
    import { addSimpleArrow, addDoubleArrow, addThickArrow } from "./tools/canvas-arrow.svelte";
    import { addText } from "./tools/canvas-text.svelte";
    import LayerManager from "./LayerManager.svelte";
    import ResizeTab from "./ResizeTab.svelte";
    import type { CanvasService } from "./canvas-service.svelte";
  
    let { activeTab = 'shapes', canvas, canvasService } = $props<{activeTab?: string, canvas: Canvas, canvasService: CanvasService}>();
  
    // Define the shapes for the shapes tab
    const shapes = [
      { id: 'rectangle', icon: '■', action: () => addRectangle(canvas) },
      { id: 'circle', icon: '●', action: () => addCircle(canvas) },
      { id: 'triangle', icon: '▲', action: () => addTriangle(canvas) },
      { id: 'star', icon: '★', action: () => addStar(canvas) },
      { id: 'pentagon', icon: '⬠', action: () => addPentagon(canvas) },
      { id: 'hexagon', icon: '⬡', action: () => addHexagon(canvas) },
      { id: 'speech', icon: '💬', action: () => addSpeechBubble(canvas) },
      { id: 'cross', icon: '✚', action: () => addCross(canvas) },
      { id: 'arch', icon: '◠', action: () => addArch(canvas) },
      { id: 'cloud', icon: '☁️', action: () => addCloud(canvas) }
    ];
  
    // Define the lines for the lines tab
    const lines = [
      { id: 'solid-line', icon: '—', action: () => addSolidLine(canvas) },
      { id: 'dashed-line', icon: '- - -', action: () => addDashedLine(canvas) },
      { id: 'dotted-line', icon: '······', action: () => addDottedLine(canvas) },
      { id: 'simple-arrow', icon: '→', action: () => addSimpleArrow(canvas) },
      { id: 'double-arrow', icon: '⟷', action: () => addDoubleArrow(canvas) },
      { id: 'thick-arrow', icon: '➡', action: () => addThickArrow(canvas) }
    ];
  
    // Define the text options
    const textOptions = [
      { id: 'text', icon: 'T', label: 'Add Text', action: () => addText(canvas) },
      { id: 'heading', icon: 'H', label: 'Heading', action: () => {} },
      { id: 'subheading', icon: 'S', label: 'Subheading', action: () => {} }
    ];
  
    // Function to handle item click
    function handleItemClick(action: () => void) {
      action();
    }
  </script>
  
  <div class="sidebar-content">
    <div class="search-container">
      <input type="text" placeholder="Search..." class="search-input" />
    </div>
  
    {#if activeTab === 'elements'}
      <div class="content-section">
        <h3 class="section-title">Lines</h3>
        <div class="items-grid">
          {#each lines as line}
            <button
              type="button"
              class="item"
              onclick={() => handleItemClick(line.action)}
              aria-label={`Add ${line.id}`}
            >
              <div class="item-icon">{line.icon}</div>
            </button>
          {/each}
        </div>
      </div>
  
      <div class="content-section">
        <h3 class="section-title">Shapes</h3>
        <div class="items-grid">
          {#each shapes as shape}
            <button
              type="button"
              class="item"
              onclick={() => handleItemClick(shape.action)}
              aria-label={`Add ${shape.id}`}
            >
              <div class="item-icon">{shape.icon}</div>
            </button>
          {/each}
        </div>
      </div>
    {:else if activeTab === 'text'}
      <div class="content-section">
        <div class="items-list">
          {#each textOptions as option}
            <button
              type="button"
              class="text-item"
              onclick={() => handleItemClick(option.action)}
              aria-label={option.label}
            >
              <div class="text-item-icon">{option.icon}</div>
              <div class="text-item-label">{option.label}</div>
            </button>
          {/each}
        </div>
      </div>
    {:else if activeTab === 'templates'}
      <div class="content-section">
        <h3 class="section-title">Templates</h3>
        <div class="items-grid">
          <div class="template-placeholder">Template 1</div>
          <div class="template-placeholder">Template 2</div>
          <div class="template-placeholder">Template 3</div>
        </div>
      </div>
    {:else if activeTab === 'photos'}
      <div class="content-section">
        <h3 class="section-title">Photos</h3>
        <div class="items-grid">
          <div class="photo-placeholder">Photo 1</div>
          <div class="photo-placeholder">Photo 2</div>
          <div class="photo-placeholder">Photo 3</div>
        </div>
      </div>
    {:else if activeTab === 'layers'}
      <div class="content-section">
        <LayerManager canvas={canvas} />
      </div>
    {:else if activeTab === 'resize'}
      <div class="content-section">
        <ResizeTab canvas={canvas} {canvasService} />
      </div>
    {:else}
      <div class="content-section">
        <h3 class="section-title">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h3>
        <p>Content for {activeTab} tab</p>
      </div>
    {/if}
  </div>
  
  <style>
    .sidebar-content {
      width: 250px;
      height: 100%;
      background-color: white;
      border-right: 1px solid hsl(var(--sidebar-border));
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }
  
    .search-container {
      padding: 12px;
      border-bottom: 1px solid hsl(var(--sidebar-border));
    }
  
    .search-input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid hsl(var(--sidebar-border));
      border-radius: 20px;
      font-size: 0.9rem;
    }
  
    .content-section {
      padding: 12px;
    }
  
    .section-title {
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 12px;
      color: hsl(var(--sidebar-foreground));
    }
  
    .items-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
  
    .item {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: hsl(var(--sidebar-accent));
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
  
    .item:hover {
      background-color: hsl(var(--sidebar-border));
    }
  
    .item-icon {
      font-size: 1.5rem;
      color: hsl(var(--sidebar-foreground));
    }
  
    .items-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
  
    .text-item {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
  
    .text-item:hover {
      background-color: hsl(var(--sidebar-accent));
    }
  
    .text-item-icon {
      font-size: 1.2rem;
      margin-right: 12px;
      color: hsl(var(--sidebar-foreground));
    }
  
    .text-item-label {
      font-size: 0.9rem;
      color: hsl(var(--sidebar-foreground));
    }
  
    .template-placeholder, .photo-placeholder {
      aspect-ratio: 16/9;
      background-color: hsl(var(--sidebar-accent));
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      font-size: 0.8rem;
      color: hsl(var(--sidebar-foreground));
    }
  </style>
  