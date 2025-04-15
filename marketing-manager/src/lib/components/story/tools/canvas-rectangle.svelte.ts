import { Rect, type Canvas } from "fabric";

export function addRectangle(canvas: Canvas) {
        // Get the current number of objects to create a unique name
        const objectCount = canvas.getObjects().length;
        const objectName = `Rectangle ${objectCount + 1}`;

        // Calculate a position that ensures the rectangle is fully within the canvas
        const rectWidth = 100;
        const rectHeight = 100;
        const maxLeft = Math.max(0, canvas.width - rectWidth);
        const maxTop = Math.max(0, canvas.height - rectHeight);

        const r = new Rect({
            left: Math.min(100, maxLeft),
            top: Math.min(100, maxTop),
            fill: '#3498db',
            width: rectWidth,
            height: rectHeight,
            strokeWidth: 2,
            stroke: '#2980b9',
            name: objectName
        });
        // Ensure the name is set using the set method
        r.set('name', objectName);
        canvas.add(r);
        canvas.setActiveObject(r);
}