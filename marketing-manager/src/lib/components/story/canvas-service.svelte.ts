import { Circle, Rect, type Canvas } from "fabric";

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

    addCircle() {
        const objectCount = this.canvas.getObjects().length;
        const objectName = `Circle ${objectCount + 1}`;
    
        // Calculate a position that ensures the circle is fully within the canvas
        const radius = 50;
        const maxLeft = Math.max(radius, this.canvas.width - radius);
        const maxTop = Math.max(radius, this.canvas.height - radius);
        const left = Math.min(100, maxLeft);
        const top = Math.min(100, maxTop);
    
        const c = new Circle({
          left: left,
          top: top,
          fill: '#e74c3c',
          radius: radius,
          strokeWidth: 2,
          stroke: '#c0392b',
          name: objectName
        });
        // Ensure the name is set using the set method
        c.set('name', objectName);
        this.canvas.add(c);
        this.canvas.setActiveObject(c);
      }
}