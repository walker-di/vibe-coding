import type {
  BasicTransformEvent,
  Canvas,
  FabricObject,
  TPointerEvent,
} from 'fabric';
import { initAligningGuidelines } from 'fabric/extensions';
import type { AligningLineConfig } from 'fabric/extensions';

type TransformEvent = BasicTransformEvent<TPointerEvent> & {
  target: FabricObject;
};

/**
 * Initializes canvas border snapping in addition to the regular aligning guidelines
 * This makes objects snap to the canvas border (clipPath) when moved close to it
 *
 * @param canvas The fabric canvas instance
 * @param options Configuration options for the aligning guidelines
 * @returns A function to deactivate the snapping behavior
 */
export function initCanvasBorderSnap(
  canvas: Canvas,
  options: Partial<AligningLineConfig> = {},
) {
  // Initialize the regular aligning guidelines
  const deactivateAligning = initAligningGuidelines(canvas, options);

  // Define the snap margin
  const SNAP_MARGIN = options.margin || 4;

  // Store canvas border lines for visualization
  const guidelines: { x1: number, y1: number, x2: number, y2: number }[] = [];

  /**
   * Draw guidelines on the canvas
   */
  function drawGuidelines() {
    const ctx = canvas.getSelectionContext();
    const zoom = canvas.getZoom();
    const vpt = canvas.viewportTransform;

    ctx.save();
    ctx.lineWidth = (options.width || 1) / zoom;
    ctx.strokeStyle = options.color || 'rgb(255,0,0,0.9)';
    ctx.beginPath();

    // Apply viewport transform
    if (vpt) {
      ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);
    }

    // Draw all guidelines
    for (const line of guidelines) {
      ctx.moveTo(line.x1, line.y1);
      ctx.lineTo(line.x2, line.y2);
    }

    ctx.stroke();
    ctx.restore();
  }

  /**
   * Check if an object should snap to the canvas borders
   * @param activeObject The active object being moved/transformed
   */
  function checkBorderSnap(activeObject: FabricObject) {
    // Clear previous guidelines
    guidelines.length = 0;

    // Get object bounds
    const objectBounds = activeObject.getBoundingRect();

    // Get canvas dimensions
    const canvasWidth = canvas.width || 0;
    const canvasHeight = canvas.height || 0;

    // Calculate the effective margin based on zoom
    const margin = SNAP_MARGIN / (canvas.getZoom() || 1);

    // Check left border
    if (Math.abs(objectBounds.left) <= margin) {
      // Snap to left border
      activeObject.set('left', 0);
      activeObject.setCoords();

      // Add guideline
      guidelines.push({
        x1: 0,
        y1: 0,
        x2: 0,
        y2: canvasHeight
      });
    }

    // Check right border
    if (Math.abs((objectBounds.left + objectBounds.width) - canvasWidth) <= margin) {
      // Snap to right border
      const newLeft = canvasWidth - objectBounds.width;
      activeObject.set('left', newLeft);
      activeObject.setCoords();

      // Add guideline
      guidelines.push({
        x1: canvasWidth,
        y1: 0,
        x2: canvasWidth,
        y2: canvasHeight
      });
    }

    // Check top border
    if (Math.abs(objectBounds.top) <= margin) {
      // Snap to top border
      activeObject.set('top', 0);
      activeObject.setCoords();

      // Add guideline
      guidelines.push({
        x1: 0,
        y1: 0,
        x2: canvasWidth,
        y2: 0
      });
    }

    // Check bottom border
    if (Math.abs((objectBounds.top + objectBounds.height) - canvasHeight) <= margin) {
      // Snap to bottom border
      const newTop = canvasHeight - objectBounds.height;
      activeObject.set('top', newTop);
      activeObject.setCoords();

      // Add guideline
      guidelines.push({
        x1: 0,
        y1: canvasHeight,
        x2: canvasWidth,
        y2: canvasHeight
      });
    }

    // Check horizontal center alignment
    const objectCenterX = objectBounds.left + objectBounds.width / 2;
    const canvasCenterX = canvasWidth / 2;
    if (Math.abs(objectCenterX - canvasCenterX) <= margin) {
      // Snap to horizontal center
      const newLeft = canvasCenterX - objectBounds.width / 2;
      activeObject.set('left', newLeft);
      activeObject.setCoords();

      // Add guideline
      guidelines.push({
        x1: canvasCenterX,
        y1: 0,
        x2: canvasCenterX,
        y2: canvasHeight
      });
    }

    // Check vertical center alignment
    const objectCenterY = objectBounds.top + objectBounds.height / 2;
    const canvasCenterY = canvasHeight / 2;
    if (Math.abs(objectCenterY - canvasCenterY) <= margin) {
      // Snap to vertical center
      const newTop = canvasCenterY - objectBounds.height / 2;
      activeObject.set('top', newTop);
      activeObject.setCoords();

      // Add guideline
      guidelines.push({
        x1: 0,
        y1: canvasCenterY,
        x2: canvasWidth,
        y2: canvasCenterY
      });
    }
  }

  /**
   * Handle object moving event
   * @param e The transform event
   */
  function moving(e: TransformEvent) {
    const activeObject = e.target;
    checkBorderSnap(activeObject);
  }

  /**
   * Handle object scaling or resizing event
   * @param e The transform event
   */
  function scalingOrResizing(e: TransformEvent) {
    const activeObject = e.target;
    checkBorderSnap(activeObject);
  }

  /**
   * Render the guidelines before canvas rendering
   */
  function beforeRender() {
    canvas.clearContext(canvas.contextTop);
  }

  /**
   * Render the guidelines after canvas rendering
   */
  function afterRender() {
    if (guidelines.length > 0) {
      drawGuidelines();
    }
  }

  /**
   * Clean up when mouse is released
   */
  function mouseUp() {
    guidelines.length = 0;
    canvas.requestRenderAll();
  }

  // Attach event listeners
  canvas.on('object:moving', moving);
  canvas.on('object:scaling', scalingOrResizing);
  canvas.on('object:resizing', scalingOrResizing);
  canvas.on('before:render', beforeRender);
  canvas.on('after:render', afterRender);
  canvas.on('mouse:up', mouseUp);

  // Return a function to deactivate all event listeners
  return () => {
    deactivateAligning(); // Deactivate the regular aligning guidelines
    canvas.off('object:moving', moving);
    canvas.off('object:scaling', scalingOrResizing);
    canvas.off('object:resizing', scalingOrResizing);
    canvas.off('before:render', beforeRender);
    canvas.off('after:render', afterRender);
    canvas.off('mouse:up', mouseUp);
  };
}

// Re-export the original initAligningGuidelines function
export { initAligningGuidelines };
