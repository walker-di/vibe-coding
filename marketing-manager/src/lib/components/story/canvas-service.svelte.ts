import '$lib/components/fabricjs/types.d.ts'
import { Canvas, type ImageFormat, Rect } from "fabric";
import { initCanvasBorderSnap } from "./canvas-border-snap";
import { CanvasHistory } from "./canvas-history.svelte";

export class CanvasService {
    canvas = $state<Canvas>(undefined as any);
    width = $state(1920);
    height = $state(1080);
    isDrawing = $state(false);
    history = $state<CanvasHistory>(undefined as any);

    constructor(target: any) {
        this.canvas = new Canvas(target, {
            width: this.width,
            height: this.height,
            allowTouchScrolling: false,
            defaultCursor: 'grab',
            selection: true,
            backgroundColor: '#f0f0f0',
            renderOnAddRemove: true,
            stateful: true,
            preserveObjectStacking: true, // Add this to prevent layer shuffling
            uniformScaling: false, // Allow non-uniform scaling
            centeredScaling: false, // Don't center scaling
            centeredRotation: true // Center rotation
        });
        // show canvas border
        this.canvas.clipPath = new Rect({
            left: 0,
            top: 0,
            width: this.canvas.width,
            height: this.canvas.height,
            absolutePositioned: true,
        });
		initCanvasBorderSnap(this.canvas, {
			margin: 4,
			width: 1,
			color: "rgb(255,0,0,0.9)",
		});
        // Initialize history service
        this.history = new CanvasHistory(this.canvas);

        this.centerCanvas();
        this.canvas.renderAll();
    }

    // Drawing mode toggle
    toggleDrawing() {
        this.isDrawing = !this.isDrawing;
        this.canvas.isDrawingMode = this.isDrawing;

        if (this.isDrawing && this.canvas.freeDrawingBrush) {
            this.canvas.freeDrawingBrush.color = 'black';
            this.canvas.freeDrawingBrush.width = 5;
        }
    }

    async export(format: ImageFormat = "png") {
        const hiddenCanvas = document.createElement("canvas");
        const fabricBuffer = new Canvas(hiddenCanvas, {
            width: this.canvas.getWidth(),
            height: this.canvas.getHeight(),
            selection: false,
        });
        const elements = this.canvas.toJSON();

        await fabricBuffer.loadFromJSON(elements);
        const dataURL = fabricBuffer.toDataURL({
            format,
            quality: 1,
            multiplier: 1,
        });
        return dataURL;
    }

    async download(format: ImageFormat = "png") {
        const dataURL = await this.export(format);
        const link = document.createElement("a");
        link.download = "canvas-export.png";
        link.href = dataURL;
        link.click();
    }

    resize(width: number, height: number, useMagicResize = false) {
		if (!this.canvas) return;

		if (useMagicResize) {
            const currentWidth = this.canvas.getWidth();
            const currentHeight = this.canvas.getHeight();
			const scaleX = width / currentWidth;
			const scaleY = height / currentHeight;

			for (const obj of this.canvas.getObjects()) {
				obj.scaleX = (obj.scaleX || 1) * scaleX;
				obj.scaleY = (obj.scaleY || 1) * scaleY;
				obj.left = (obj.left || 0) * scaleX;
				obj.top = (obj.top || 0) * scaleY;
				obj.setCoords();
			}
		}
        this.canvas.clipPath = new Rect({
            left: 0,
            top: 0,
            width,
            height,
            absolutePositioned: true,
        });
		this.canvas.setWidth(width);
		this.canvas.setHeight(height);
        this.centerCanvas();
		this.canvas.renderAll();
        this.width = width;
        this.height = height;
	}

    // Center the canvas in the viewport
    centerCanvas() {
        console.log('--- Starting centerCanvas() ---');

        // Get the canvas container dimensions
        const containerEl = this.canvas.wrapperEl?.parentElement;
        if (!containerEl) {
            console.error('Container element not found');
            return;
        }

        try {
            // Get container and canvas dimensions
            const containerRect = containerEl.getBoundingClientRect();

            // Get computed styles to account for padding/borders
            const containerStyle = window.getComputedStyle(containerEl);
            const paddingLeft = parseFloat(containerStyle.paddingLeft) || 0;
            const paddingRight = parseFloat(containerStyle.paddingRight) || 0;
            const paddingTop = parseFloat(containerStyle.paddingTop) || 0;
            const paddingBottom = parseFloat(containerStyle.paddingBottom) || 0;
            const borderLeft = parseFloat(containerStyle.borderLeftWidth) || 0;
            const borderRight = parseFloat(containerStyle.borderRightWidth) || 0;
            const borderTop = parseFloat(containerStyle.borderTopWidth) || 0;
            const borderBottom = parseFloat(containerStyle.borderBottomWidth) || 0;

            // Calculate the actual available space inside the container
            const containerWidth = containerRect.width - paddingLeft - paddingRight - borderLeft - borderRight;
            const containerHeight = containerRect.height - paddingTop - paddingBottom - borderTop - borderBottom;
            const canvasWidth = this.canvas.width || 1920;
            const canvasHeight = this.canvas.height || 1080;

            console.log('Container dimensions:', {
                rawWidth: containerRect.width,
                rawHeight: containerRect.height,
                adjustedWidth: containerWidth,
                adjustedHeight: containerHeight,
                padding: { left: paddingLeft, right: paddingRight, top: paddingTop, bottom: paddingBottom },
                border: { left: borderLeft, right: borderRight, top: borderTop, bottom: borderBottom }
            });
            console.log('Canvas dimensions:', { canvasWidth, canvasHeight });

            // First, reset the zoom and position to identity matrix
            this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

            // Calculate the scale to fit the canvas in the container
            const scaleX = containerWidth / canvasWidth;
            const scaleY = containerHeight / canvasHeight;
            const scale = Math.min(scaleX, scaleY);

            console.log('Scale factors:', { scaleX, scaleY, finalScale: scale });

            // Calculate the scaled dimensions
            const scaledWidth = canvasWidth * scale;
            const scaledHeight = canvasHeight * scale;

            console.log('Scaled dimensions:', { scaledWidth, scaledHeight });

            // Calculate the offsets to center the canvas, accounting for padding and borders
            const offsetX = ((containerWidth - scaledWidth) / 2) + paddingLeft + borderLeft;
            const offsetY = ((containerHeight - scaledHeight) / 2) + paddingTop + borderTop;

            console.log('Calculated offsets:', { offsetX, offsetY });

            // Create a new viewport transform with the calculated scale and offsets
            const newVpt = [scale, 0, 0, scale, offsetX, offsetY] as [number, number, number, number, number, number];

            console.log('New viewport transform:', newVpt);

            // Apply the new viewport transform
            this.canvas.setViewportTransform(newVpt);

            // Force a render
            this.canvas.requestRenderAll();

            console.log('--- Finished centerCanvas() successfully ---');
        } catch (error) {
            console.error('Error in centerCanvas():', error);
        }
    }
}