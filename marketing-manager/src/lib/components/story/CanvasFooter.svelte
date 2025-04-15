<script lang="ts">
  import { Canvas, type FabricObject } from "fabric";
  import { onMount, onDestroy } from "svelte";
  import type { CanvasService } from "./canvas-service.svelte";
  import ZoomMenu from "./ZoomMenu.svelte";
  import type { CanvasZoomPan } from "./canvas-zoom-pan.svelte";

  // Props
  let { canvas, canvasService, canvasZoomPan }: {
    canvas?: Canvas;
    canvasService?: CanvasService;
    canvasZoomPan: CanvasZoomPan;
  } = $props();
</script>

<div class="canvas-footer">
  {#if canvas}
  <ZoomMenu {canvasZoomPan} />
  {/if }
</div>
