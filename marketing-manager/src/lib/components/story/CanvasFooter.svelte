<script lang="ts">
  import { Canvas, type FabricObject } from "fabric";
  import { onMount, onDestroy } from "svelte";
  import type { CanvasService } from "./canvas-service.svelte";
  import ZoomMenu from "./ZoomMenu.svelte";
  import type { CanvasZoomPan } from "./canvas-zoom-pan.svelte";

  // Props
  let { canvas, canvasZoomPan }: {
    canvas?: Canvas;
    canvasService?: CanvasService;
    canvasZoomPan: CanvasZoomPan;
  } = $props();
</script>

<div class="flex justify-between items-center gap-2 mb-2 p-2 border rounded-md bg-muted/50">
  <div>
    <!-- wip left side of footer -->
  </div>
  <div>
    <span class="text-sm ml-auto mr-2">
      {canvas?.width} x {canvas?.height} px
    </span>
    {#if canvas && canvasZoomPan}
      <ZoomMenu {canvasZoomPan} {canvas} />
    {/if }
  </div>
</div>
