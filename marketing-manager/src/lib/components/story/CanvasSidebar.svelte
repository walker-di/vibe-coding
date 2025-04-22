<script lang="ts">
  import { Canvas, FabricImage } from "fabric";
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
  import {
    addSolidLine,
    addDashedLine,
    addDottedLine,
  } from "./tools/canvas-line.svelte";
  import {
    addSimpleArrow,
    addDoubleArrow,
    addThickArrow,
  } from "./tools/canvas-arrow.svelte";
  import { addText } from "./tools/canvas-text.svelte";
  import LayerManager from "./LayerManager.svelte";
  import ResizeTab from "./ResizeTab.svelte";
  import type { CanvasService } from "./canvas-service.svelte";
  import CanvasSideNav from "./CanvasSideNav.svelte";
  import ImageGallery from "./ImageGallery.svelte";
  import { addImageFromUrl } from "./canvas-tools/canvas-image.svelte";
  import ImageUploadModal from "./ImageUploadModal.svelte";
  import { onMount } from "svelte";
  import type { CanvasAspectRatio } from "$lib/constants";

  let {
    canvas,
    canvasService,
  }: { activeTab?: string; canvas: Canvas; canvasService: CanvasService } =
    $props();
  let activeTab = $state("elements");
  let isBackgroundImageModalOpen = $state(false);
  let templates = $state<any[]>([]);
  let isLoadingTemplates = $state(false);
  let templateError = $state<string | null>(null);

  // Define the shapes for the shapes tab
  const shapes = [
    { id: "rectangle", icon: "■", action: () => addRectangle(canvas) },
    { id: "circle", icon: "●", action: () => addCircle(canvas) },
    { id: "triangle", icon: "▲", action: () => addTriangle(canvas) },
    { id: "star", icon: "★", action: () => addStar(canvas) },
    { id: "pentagon", icon: "⬠", action: () => addPentagon(canvas) },
    { id: "hexagon", icon: "⬡", action: () => addHexagon(canvas) },
    { id: "speech", icon: "💬", action: () => addSpeechBubble(canvas) },
    { id: "cross", icon: "✚", action: () => addCross(canvas) },
    { id: "arch", icon: "◠", action: () => addArch(canvas) },
    { id: "cloud", icon: "☁️", action: () => addCloud(canvas) },
  ];

  // Define the lines for the lines tab
  const lines = [
    { id: "solid-line", icon: "—", action: () => addSolidLine(canvas) },
    { id: "dashed-line", icon: "- - -", action: () => addDashedLine(canvas) },
    { id: "dotted-line", icon: "······", action: () => addDottedLine(canvas) },
    { id: "simple-arrow", icon: "→", action: () => addSimpleArrow(canvas) },
    { id: "double-arrow", icon: "⟷", action: () => addDoubleArrow(canvas) },
    { id: "thick-arrow", icon: "➡", action: () => addThickArrow(canvas) },
  ];

  // Define the text options
  const textOptions = [
    { id: "text", icon: "T", label: "Add Text", action: () => addText(canvas) },
    { id: "heading", icon: "H", label: "Heading", action: () => {} },
    { id: "subheading", icon: "S", label: "Subheading", action: () => {} },
  ];

  // Function to handle item click
  function handleItemClick(action: () => void) {
    action();
  }

  async function addImageFromURl(url: string) {
    addImageFromUrl(canvas, url)();
  }

  // Function to fetch templates
  async function fetchTemplates() {
    isLoadingTemplates = true;
    templateError = null;
    try {
      const response = await fetch('/api/canvas-templates');
      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.statusText}`);
      }
      const data = await response.json();
      templates = data;
    } catch (err: any) {
      console.error('Error fetching canvas templates:', err);
      templateError = err.message || 'An unknown error occurred.';
    } finally {
      isLoadingTemplates = false;
    }
  }

  // Function to apply a template to the canvas
  async function applyTemplate(templateId: number) {
    if (!canvas || !canvasService) return;

    try {
      const response = await fetch(`/api/canvas-templates/${templateId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.statusText}`);
      }
      const template = await response.json();

      // Load the template data into the canvas
      if (template.canvasData) {
        await canvas.loadFromJSON(template.canvasData);
        canvas.renderAll();
      }
    } catch (err: any) {
      console.error('Error applying template:', err);
      alert(`Failed to apply template: ${err.message}`);
    }
  }

  // Get the current canvas aspect ratio
  function getCurrentAspectRatio(): CanvasAspectRatio {
    if (!canvasService) return "16:9";

    const width = canvasService.width;
    const height = canvasService.height;

    // Calculate the aspect ratio
    const ratio = width / height;

    // Match to known aspect ratios
    if (Math.abs(ratio - 16/9) < 0.1) return "16:9";
    if (Math.abs(ratio - 9/16) < 0.1) return "9:16";
    if (Math.abs(ratio - 1) < 0.1) return "1:1";
    if (Math.abs(ratio - 4/5) < 0.1) return "4:5";
    if (Math.abs(ratio - 1.91) < 0.1) return "1.91:1";

    return "Other";
  }

  // Filter templates based on current canvas aspect ratio
  function getFilteredTemplates() {
    if (!templates.length) return [];

    const currentAspectRatio = getCurrentAspectRatio();
    return templates.filter(template => template.aspectRatio === currentAspectRatio);
  }

  // Load templates when the component mounts or when the activeTab changes to "templates"
  $effect(() => {
    if (activeTab === "templates" && templates.length === 0) {
      fetchTemplates();
    }
  });
</script>

<div class="flex">
  <CanvasSideNav bind:activeTab />
  <div class="sidebar-content">
    {#if activeTab === "elements"}
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
    {:else if activeTab === "text"}
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
    {:else if activeTab === "templates"}
      <div class="content-section">
        <h3 class="section-title">Templates for {getCurrentAspectRatio()} Aspect Ratio</h3>

        {#if isLoadingTemplates}
          <div class="loading-indicator">Loading templates...</div>
        {:else if templateError}
          <div class="error-message">
            <p>Error: {templateError}</p>
            <button class="retry-button" onclick={() => fetchTemplates()}>Retry</button>
          </div>
        {:else if getFilteredTemplates().length === 0}
          <div class="no-templates-message">
            <p>No templates available for the current canvas aspect ratio ({getCurrentAspectRatio()}).</p>
            <p class="hint">You can create templates in Settings > Canvas Templates.</p>
          </div>
        {:else}
          <div class="templates-grid">
            {#each getFilteredTemplates() as template (template.id)}
              <button
                class="template-item"
                onclick={() => applyTemplate(template.id)}
                title={template.description || template.name}
              >
                {#if template.previewImageUrl}
                  <img src={template.previewImageUrl} alt={template.name} class="template-preview" />
                {:else}
                  <div class="template-placeholder">{template.name}</div>
                {/if}
                <div class="template-name">{template.name}</div>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {:else if activeTab === "photos"}
      <div class="content-section">
        <h3 class="section-title">Photos</h3>
        <button class="bg-primary text-white px-4 py-2 rounded-md" onclick={() => (isBackgroundImageModalOpen = true)}>
          Upload Image
        </button>
        <ImageUploadModal open={isBackgroundImageModalOpen} onClose={() => (isBackgroundImageModalOpen = false)} />
        <ImageGallery onImageSelected={addImageFromURl} />
      </div>
    {:else if activeTab === "layers"}
      <div class="content-section">
        <LayerManager {canvas} />
      </div>
    {:else if activeTab === "resize"}
      <div class="content-section">
        <ResizeTab {canvas} {canvasService} />
      </div>
    {:else}
      <div class="content-section">
        <h3 class="section-title">
          {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
        </h3>
        <p>Content for {activeTab} tab</p>
      </div>
    {/if}
  </div>
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

  .template-placeholder {
    aspect-ratio: 16/9;
    background-color: hsl(var(--sidebar-accent));
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    font-size: 0.8rem;
    color: hsl(var(--sidebar-foreground));
  }

  .templates-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-top: 8px;
  }

  .template-item {
    display: flex;
    flex-direction: column;
    border: 1px solid hsl(var(--sidebar-border));
    border-radius: 4px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s ease;
    background: none;
    padding: 0;
  }

  .template-item:hover {
    border-color: hsl(var(--primary));
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .template-preview {
    width: 100%;
    aspect-ratio: 16/9;
    object-fit: cover;
  }

  .template-name {
    padding: 6px;
    font-size: 0.8rem;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .loading-indicator {
    padding: 12px 0;
    text-align: center;
    color: hsl(var(--muted-foreground));
  }

  .error-message {
    padding: 12px;
    color: hsl(var(--destructive));
    background-color: hsl(var(--destructive) / 0.1);
    border-radius: 4px;
    margin-bottom: 8px;
  }

  .retry-button {
    margin-top: 8px;
    padding: 4px 8px;
    background-color: hsl(var(--primary));
    color: white;
    border-radius: 4px;
    font-size: 0.8rem;
  }

  .no-templates-message {
    padding: 12px;
    color: hsl(var(--muted-foreground));
    text-align: center;
    font-size: 0.9rem;
  }

  .hint {
    font-size: 0.8rem;
    margin-top: 8px;
    font-style: italic;
  }
</style>
