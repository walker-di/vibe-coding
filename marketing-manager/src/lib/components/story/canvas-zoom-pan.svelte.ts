import type { Canvas } from "fabric";
import { Point } from "fabric";

export class CanvasZoomPan {
  isPanMode: boolean = $state(false); 
  private canvas: Canvas;
  private lastPosX: number = 0;
  private lastPosY: number = 0;
  private pinchCenter: { x: number, y: number } | null = null;
  private initialDistance: number = 0;
  private isDragging: boolean = false;
  private minZoom: number = 0.1;
  private maxZoom: number = 10;

  constructor(canvas: Canvas) {
    this.canvas = canvas;
    this.initialize();
  }

  private initialize(): void {
    // Mouse events for dragging and zooming
    this.canvas.on("mouse:down", this.dragCanvasStart.bind(this));
    this.canvas.on("mouse:move", this.dragCanvas.bind(this));
    this.canvas.on("mouse:up", () => { this.isDragging = false; });
    this.canvas.on("mouse:wheel", this.zoomCanvasMouseWheel.bind(this));

    // Touch events for pinch-zoom
    if (this.canvas.wrapperEl) {
      this.canvas.wrapperEl.addEventListener('touchstart', this.handleTouchStart.bind(this));
      this.canvas.wrapperEl.addEventListener('touchmove', this.handleTouchMove.bind(this));
      this.canvas.wrapperEl.addEventListener('touchend', () => { this.isDragging = false; });
    }

    // Set initial mode to pan mode
    this.setToSelectMode();
  }

  private dragCanvasStart(event: any): void {
    // If not in pan mode, don't handle dragging
    if (!this.isPanMode) return;

    const evt = event.e || event; // fabricJS event or regular event

    // Only start dragging with left mouse button
    if (evt.button === 1 || evt.button === 2) {
      return;
    }

    this.isDragging = true;

    // Save the position you started dragging from
    this.lastPosX = evt.clientX;
    this.lastPosY = evt.clientY;

    // Change cursor to indicate dragging
    this.canvas.defaultCursor = 'grabbing';
  }


  private dragCanvas(event: any): void {
    // If not in pan mode or not dragging, don't handle dragging
    if (!this.isPanMode || !this.isDragging) return;

    const evt = event.e || event; // fabricJS event or regular event

    // Left mouse button is pressed if not a touch event
    if (evt.buttons !== undefined && evt.buttons !== 1 && !(evt instanceof Touch)) {
      this.isDragging = false;
      this.canvas.defaultCursor = 'grab';
      return;
    }

    this.redrawCanvas(evt);
  }

  private redrawCanvas(event: any): void {
    const vpt = this.canvas.viewportTransform;
    if (!vpt) return;

    let offsetX = vpt[4] + event.clientX - (this.lastPosX || 0);
    let offsetY = vpt[5] + event.clientY - (this.lastPosY || 0);

    vpt[4] = offsetX;
    vpt[5] = offsetY;

    this.lastPosX = event.clientX;
    this.lastPosY = event.clientY;

    this.canvas.setViewportTransform(vpt);
    this.canvas.requestRenderAll();
  }

  private zoomCanvasMouseWheel(event: any): void {
    const delta = event.e.deltaY;
    let zoom = this.canvas.getZoom();

    // Adjust zoom factor based on delta
    zoom *= 0.999 ** delta;

    // Limit zoom to reasonable values
    zoom = Math.min(Math.max(zoom, this.minZoom), this.maxZoom);

    const point = { x: event.e.offsetX, y: event.e.offsetY };

    this.zoomCanvas(zoom, point);

    // Prevent default browser behavior
    event.e.preventDefault();
    event.e.stopPropagation();
  }

  private zoomCanvas(zoom: number, point: { x: number, y: number }): void {
    // Convert to Fabric.js Point object
    const fabricPoint = new Point(point.x, point.y);
    this.canvas.zoomToPoint(fabricPoint, zoom);
    this.canvas.requestRenderAll();
  }

  private handleTouchStart(event: TouchEvent): void {
    // If not in pan mode, don't handle touch events for panning
    if (!this.isPanMode) return;

    // Handle single touch for dragging
    if (event.touches.length === 1) {
      this.dragCanvasStart(event.touches[0]);
    }

    // Handle pinch start
    if (event.touches.length === 2) {
      this.pinchCanvasStart(event);
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    // If not in pan mode, don't handle touch events for panning
    if (!this.isPanMode) return;

    // Prevent default to disable browser's native touch behaviors
    event.preventDefault();

    // Handle single touch for dragging
    if (event.touches.length === 1) {
      this.dragCanvas(event.touches[0]);
    }

    // Handle pinch
    if (event.touches.length === 2) {
      this.pinchCanvas(event);
    }
  }

  private pinchCanvasStart(event: TouchEvent): void {
    if (event.touches.length !== 2) {
      return;
    }

    this.initialDistance = this.getPinchDistance(event.touches[0], event.touches[1]);
  }

  private pinchCanvas(event: TouchEvent): void {
    if (event.touches.length !== 2) {
      return;
    }

    this.setPinchCenter(event.touches[0], event.touches[1]);

    if (!this.pinchCenter) return;

    const currentDistance = this.getPinchDistance(event.touches[0], event.touches[1]);
    let scale = parseFloat((currentDistance / this.initialDistance).toFixed(2));

    // Slow down scale from pinch
    scale = 1 + (scale - 1) / 20;

    // Calculate new zoom level
    const zoom = scale * this.canvas.getZoom();

    // Limit zoom to reasonable values
    const limitedZoom = Math.min(Math.max(zoom, this.minZoom), this.maxZoom);

    this.zoomCanvas(limitedZoom, this.pinchCenter);
  }

  private getPinchDistance(touch1: Touch, touch2: Touch): number {
    const coord = this.getPinchCoordinates(touch1, touch2);
    return Math.sqrt(Math.pow(coord.x2 - coord.x1, 2) + Math.pow(coord.y2 - coord.y1, 2));
  }

  private getPinchCoordinates(touch1: Touch, touch2: Touch): { x1: number, y1: number, x2: number, y2: number } {
    return {
      x1: touch1.clientX,
      y1: touch1.clientY,
      x2: touch2.clientX,
      y2: touch2.clientY,
    };
  }

  private setPinchCenter(touch1: Touch, touch2: Touch): void {
    const coord = this.getPinchCoordinates(touch1, touch2);

    const currentX = (coord.x1 + coord.x2) / 2;
    const currentY = (coord.y1 + coord.y2) / 2;

    this.pinchCenter = {
      x: currentX,
      y: currentY,
    };
  }

  public resetZoom(): void {
    // Get canvas center
    const center = {
      x: this.canvas.width! / 2,
      y: this.canvas.height! / 2
    };

    // Reset zoom to 1
    this.zoomCanvas(1, center);

    // Reset pan position
    const vpt = this.canvas.viewportTransform;
    if (vpt) {
      vpt[4] = 0;
      vpt[5] = 0;
      this.canvas.setViewportTransform(vpt);
      this.canvas.requestRenderAll();
    }
  }


  public togglePanMode(): boolean {
    this.isPanMode = !this.isPanMode;

    if (this.isPanMode) {
      this.setToPanMode();
    } else {
      this.setToSelectMode();
    }

    return this.isPanMode;
  }

  private setToPanMode(): void {
    // Disable selection and object movement
    this.canvas.selection = false;
    this.canvas.skipTargetFind = true;

    // Set cursor to indicate pan mode
    this.canvas.defaultCursor = 'grab';

    // Deselect any active objects
    this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();
  }

  private setToSelectMode(): void {
    // Enable selection and object movement
    this.canvas.selection = true;
    this.canvas.skipTargetFind = false;

    // Set cursor to default
    this.canvas.defaultCursor = 'default';

    this.canvas.requestRenderAll();
  }

  public isPanModeActive(): boolean {
    return this.isPanMode;
  }

  /**
   * Get the canvas instance
   */
  public getCanvas(): Canvas {
    return this.canvas;
  }

  /**
   * Set zoom to a specific level
   * @param zoomFactor Zoom factor (1.0 = 100%)
   * @param center Center point for zoom
   */
  public zoomToLevel(zoomFactor: number, center: { x: number, y: number }): void {
    // Limit zoom to reasonable values
    const limitedZoom = Math.min(Math.max(zoomFactor, this.minZoom), this.maxZoom);

    // Convert to Fabric.js Point object
    const fabricPoint = new Point(center.x, center.y);

    // Apply zoom
    this.canvas.zoomToPoint(fabricPoint, limitedZoom);
    this.canvas.requestRenderAll();
  }

  /**
   * Zoom to fit the entire canvas in the viewport
   */
  public zoomToFit(): void {
    if (!this.canvas.wrapperEl) return;

    // Get container dimensions
    const containerRect = this.canvas.wrapperEl.parentElement?.getBoundingClientRect();
    if (!containerRect) return;

    // Get canvas dimensions
    const canvasWidth = this.canvas.width || 1920;
    const canvasHeight = this.canvas.height || 1080;

    // Calculate the scale to fit the canvas in the container
    const scaleX = (containerRect.width - 40) / canvasWidth; // Add some padding
    const scaleY = (containerRect.height - 40) / canvasHeight; // Add some padding
    const scale = Math.min(scaleX, scaleY);

    // Limit zoom to reasonable values
    const limitedZoom = Math.min(Math.max(scale, this.minZoom), this.maxZoom);

    // Get canvas center
    const center = {
      x: canvasWidth / 2,
      y: canvasHeight / 2
    };

    // Apply zoom
    this.zoomToLevel(limitedZoom, center);

    // Center the canvas
    this.centerCanvas();
  }
  private getFittingContainer(): HTMLElement | null {
    // Option 1: Parent element (Your original - MIGHT BE WRONG if parent has fixed size)
    // return this.canvas.wrapperEl?.parentElement ?? null;

    // Option 2: Grandparent element (Often more likely to be the layout container)
     return this.canvas.wrapperEl?.parentElement?.parentElement ?? null;

    // Option 3: A specific element by ID
    // return document.getElementById('my-canvas-container-id');

    // Option 4: The wrapper itself (If the wrapper is the one that resizes)
    // return this.canvas.wrapperEl;
}
  /**
   * Zoom to fit the canvas width in the viewport
   */
  public zoomToFitWidth(): void {
    const fittingContainer = this.getFittingContainer(); // Use the helper
    if (!fittingContainer) {
        console.error("ZoomToFitWidth: Fitting container not found.");
        return;
    }

    const containerWidth = fittingContainer.clientWidth;
    console.log('ZoomToFitWidth: Container clientWidth:', containerWidth);
    if (containerWidth <= 0) return;

    const canvasWidth = this.canvas.width ?? 1; // Use 1 to avoid division by zero
    console.log('ZoomToFitWidth: Canvas Logical Width:', canvasWidth);
    if (canvasWidth <= 0) return;

    // Calculate scale based on width ONLY
    // Subtract desired padding *from the container width* here if needed
    const padding = 20; // Example: 10px padding on each side
    const targetWidth = containerWidth - padding;
    console.log('ZoomToFitWidth: Target Width for Canvas:', targetWidth);
    if (targetWidth <= 0) return;


    const scale = targetWidth / canvasWidth;
    console.log('ZoomToFitWidth: Calculated Scale:', scale);

    const limitedZoom = Math.min(Math.max(scale, this.minZoom), this.maxZoom);
    console.log('ZoomToFitWidth: Limited Zoom:', limitedZoom);

    // Zoom relative to the canvas center
    const center = this.canvas.getCenterPoint();
    console.log('ZoomToFitWidth: Zoom Center Point (Canvas Coords):', center);
    this.zoomToLevel(limitedZoom, center); // Use zoomToLevel which uses zoomToPoint

    // Center the canvas after zooming
    this.centerCanvas();
  }

  public zoomToFit(): void {
    const fittingContainer = this.getFittingContainer();
    if (!fittingContainer) return;

    const containerWidth = fittingContainer.clientWidth;
    const containerHeight = fittingContainer.clientHeight;
    if (containerWidth <= 0 || containerHeight <= 0) return;

    const canvasWidth = this.canvas.width ?? 1; // Use 1 to avoid division by zero
    const canvasHeight = this.canvas.height ?? 1;
    if (canvasWidth <= 0 || canvasHeight <= 0) return;

    // Calculate scale to fit both width and height
    // Subtract desired padding *from the container size* here if needed
    const padding = 20; // Example: 10px padding on each side/top/bottom
    const availableWidth = containerWidth - padding;
    const availableHeight = containerHeight - padding;

    const scaleX = availableWidth / canvasWidth;
    const scaleY = availableHeight / canvasHeight;
    const scale = Math.min(scaleX, scaleY); // Use the smaller scale to fit entirely

    const limitedZoom = Math.min(Math.max(scale, this.minZoom), this.maxZoom);

    // Zoom relative to the canvas center
    const center = this.canvas.getCenterPoint();
    this.zoomToLevel(limitedZoom, center); // Use zoomToLevel

    // Center the canvas after zooming
    this.centerCanvas();
  }

  /**
   * Center the canvas in the viewport
   */
  private centerCanvas(): void {
    if (!this.canvas.wrapperEl) return;

    const vpt = this.canvas.viewportTransform;
    if (!vpt) return;

    // Get container dimensions
    const containerRect = this.canvas.wrapperEl.parentElement?.getBoundingClientRect();
    if (!containerRect) return;

    // Get canvas dimensions
    const canvasWidth = this.canvas.width || 1920;
    const canvasHeight = this.canvas.height || 1080;

    // Calculate the current zoom level
    const zoom = this.canvas.getZoom();

    // Calculate the scaled dimensions
    const scaledWidth = canvasWidth * zoom;
    const scaledHeight = canvasHeight * zoom;

    // Calculate the center position
    const offsetX = (containerRect.width - scaledWidth) / 2;
    const offsetY = (containerRect.height - scaledHeight) / 2;

    // Update the viewport transform
    vpt[4] = offsetX;
    vpt[5] = offsetY;

    this.canvas.setViewportTransform(vpt);
    this.canvas.requestRenderAll();
  }
}
