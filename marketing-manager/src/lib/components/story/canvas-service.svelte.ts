import { Rect, type Canvas } from "fabric";

// Define the Constructor type
type Constructor<T> = new (...args: any[]) => T;

export class CanvasService {
    canvas = $state<Canvas>(undefined as any);
    constructor(lib: Constructor<Canvas>) {
        this.canvas = new lib('canvas', {
            width: 800,
            height: 600,
            backgroundColor: '#f0f0f0',
            renderOnAddRemove: true,
            stateful: true,
            preserveObjectStacking: true // Add this to prevent layer shuffling
        });
    }

    addRectangle() {
        // Get the current number of objects to create a unique name
        const objectCount = this.canvas.getObjects().length;
        const objectName = `Rectangle ${objectCount + 1}`;

        // Calculate a position that ensures the rectangle is fully within the canvas
        const rectWidth = 100;
        const rectHeight = 100;
        const maxLeft = Math.max(0, this.canvas.width - rectWidth);
        const maxTop = Math.max(0, this.canvas.height - rectHeight);
        const left = Math.min(100, maxLeft);
        const top = Math.min(100, maxTop);

        const r = new Rect({
            left: left,
            top: top,
            fill: '#3498db',
            width: rectWidth,
            height: rectHeight,
            strokeWidth: 2,
            stroke: '#2980b9',
            name: objectName
        });
        // Ensure the name is set using the set method
        r.set('name', objectName);
        this.canvas.add(r);
        this.canvas.setActiveObject(r);
        // Save canvas after adding object
        // saveCanvas();
    }
}