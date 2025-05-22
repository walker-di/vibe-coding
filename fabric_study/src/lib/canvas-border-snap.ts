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

    // Get canvas dimensions
    const canvasWidth = canvas.width || 0;
    const canvasHeight = canvas.height || 0;

    // Calculate the effective margin based on zoom
    const margin = SNAP_MARGIN / (canvas.getZoom() || 1);

    // Ensure oCoords are up-to-date
    activeObject.setCoords();
    const oCoords = activeObject.oCoords;

    // If oCoords are not available, fall back to getBoundingRect (though this shouldn't happen for typical objects)
    if (!oCoords) {
      // Fallback to existing logic if oCoords are somehow undefined
      const objectBounds = activeObject.getBoundingRect();
      // Check left border
      if (Math.abs(objectBounds.left) <= margin) {
        activeObject.set('left', 0);
        guidelines.push({ x1: 0, y1: 0, x2: 0, y2: canvasHeight });
      }
      // Check right border
      if (Math.abs((objectBounds.left + objectBounds.width) - canvasWidth) <= margin) {
        activeObject.set('left', canvasWidth - objectBounds.width);
        guidelines.push({ x1: canvasWidth, y1: 0, x2: canvasWidth, y2: canvasHeight });
      }
      // Check top border
      if (Math.abs(objectBounds.top) <= margin) {
        activeObject.set('top', 0);
        guidelines.push({ x1: 0, y1: 0, x2: canvasWidth, y2: 0 });
      }
      // Check bottom border
      if (Math.abs((objectBounds.top + objectBounds.height) - canvasHeight) <= margin) {
        activeObject.set('top', canvasHeight - objectBounds.height);
        guidelines.push({ x1: 0, y1: canvasHeight, x2: canvasWidth, y2: canvasHeight });
      }
      // Horizontal center
      const objectCenterX = objectBounds.left + objectBounds.width / 2;
      const canvasCenterX = canvasWidth / 2;
      if (Math.abs(objectCenterX - canvasCenterX) <= margin) {
        activeObject.set('left', canvasCenterX - objectBounds.width / 2);
        guidelines.push({ x1: canvasCenterX, y1: 0, x2: canvasCenterX, y2: canvasHeight });
      }
      // Vertical center
      const objectCenterY = objectBounds.top + objectBounds.height / 2;
      const canvasCenterY = canvasHeight / 2;
      if (Math.abs(objectCenterY - canvasCenterY) <= margin) {
        activeObject.set('top', canvasCenterY - objectBounds.height / 2);
        guidelines.push({ x1: 0, y1: canvasCenterY, x2: canvasWidth, y2: canvasCenterY });
      }
      if (guidelines.length > 0) activeObject.setCoords();
      return;
    }

    const minX = Math.min(oCoords.tl.x, oCoords.tr.x, oCoords.br.x, oCoords.bl.x);
    const maxX = Math.max(oCoords.tl.x, oCoords.tr.x, oCoords.br.x, oCoords.bl.x);
    const minY = Math.min(oCoords.tl.y, oCoords.tr.y, oCoords.br.y, oCoords.bl.y);
    const maxY = Math.max(oCoords.tl.y, oCoords.tr.y, oCoords.br.y, oCoords.bl.y);

    // Check left border
    if (Math.abs(minX) <= margin) {
      activeObject.set('left', activeObject.left - minX);
      guidelines.push({ x1: 0, y1: 0, x2: 0, y2: canvasHeight });
    }

    // Check right border
    else if (Math.abs(maxX - canvasWidth) <= margin) {
      activeObject.set('left', activeObject.left + (canvasWidth - maxX));
      guidelines.push({ x1: canvasWidth, y1: 0, x2: canvasWidth, y2: canvasHeight });
    }

    // Check top border
    if (Math.abs(minY) <= margin) {
      activeObject.set('top', activeObject.top - minY);
      guidelines.push({ x1: 0, y1: 0, x2: canvasWidth, y2: 0 });
    }

    // Check bottom border
    else if (Math.abs(maxY - canvasHeight) <= margin) {
      activeObject.set('top', activeObject.top + (canvasHeight - maxY));
      guidelines.push({ x1: 0, y1: canvasHeight, x2: canvasWidth, y2: canvasHeight });
    }
    
    // Recalculate oCoords if any snap occurred for border checks before center checks
    if (guidelines.length > 0) {
      activeObject.setCoords();
      // Update min/max X/Y for center checks if border snap occurred
      const newOCoords = activeObject.oCoords;
      if (newOCoords) { // Check if newOCoords exist
        const newMinX = Math.min(newOCoords.tl.x, newOCoords.tr.x, newOCoords.br.x, newOCoords.bl.x);
        const newMaxX = Math.max(newOCoords.tl.x, newOCoords.tr.x, newOCoords.br.x, newOCoords.bl.x);
        const newMinY = Math.min(newOCoords.tl.y, newOCoords.tr.y, newOCoords.br.y, newOCoords.bl.y);
        const newMaxY = Math.max(newOCoords.tl.y, newOCoords.tr.y, newOCoords.br.y, newOCoords.bl.y);
        
        // Check horizontal center alignment
        const objectVisualCenterX = newMinX + (newMaxX - newMinX) / 2;
        const canvasCenterX = canvasWidth / 2;
        if (Math.abs(objectVisualCenterX - canvasCenterX) <= margin) {
          activeObject.set('left', activeObject.left + (canvasCenterX - objectVisualCenterX));
          guidelines.push({ x1: canvasCenterX, y1: 0, x2: canvasCenterX, y2: canvasHeight });
        }

        // Check vertical center alignment
        const objectVisualCenterY = newMinY + (newMaxY - newMinY) / 2;
        const canvasCenterY = canvasHeight / 2;
        if (Math.abs(objectVisualCenterY - canvasCenterY) <= margin) {
          activeObject.set('top', activeObject.top + (canvasCenterY - objectVisualCenterY));
          guidelines.push({ x1: 0, y1: canvasCenterY, x2: canvasWidth, y2: canvasCenterY });
        }
      }
    } else {
      // If no border snap occurred, check center with original oCoords derived values
      const objectVisualCenterX = minX + (maxX - minX) / 2;
      const canvasCenterX = canvasWidth / 2;
      if (Math.abs(objectVisualCenterX - canvasCenterX) <= margin) {
        activeObject.set('left', activeObject.left + (canvasCenterX - objectVisualCenterX));
        guidelines.push({ x1: canvasCenterX, y1: 0, x2: canvasCenterX, y2: canvasHeight });
      }

      const objectVisualCenterY = minY + (maxY - minY) / 2;
      const canvasCenterY = canvasHeight / 2;
      if (Math.abs(objectVisualCenterY - canvasCenterY) <= margin) {
        activeObject.set('top', activeObject.top + (canvasCenterY - objectVisualCenterY));
        guidelines.push({ x1: 0, y1: canvasCenterY, x2: canvasWidth, y2: canvasCenterY });
      }
    }

    // Final call to setCoords if any snapping happened
    if (guidelines.length > 0) {
      activeObject.setCoords();
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
