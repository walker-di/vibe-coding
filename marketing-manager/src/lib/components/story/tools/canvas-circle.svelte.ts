import { Circle, type Canvas } from "fabric";

export function addCircle(canvas: Canvas) {
    const objectCount = canvas.getObjects().length;
    const objectName = `Circle ${objectCount + 1}`;

    // Calculate a position that ensures the circle is fully within the canvas
    const radius = 50;
    const maxLeft = Math.max(radius, canvas.width - radius);
    const maxTop = Math.max(radius, canvas.height - radius);

    const c = new Circle({
        left: Math.min(100, maxLeft),
        top: Math.min(100, maxTop),
        fill: '#e74c3c',
        radius: radius,
        strokeWidth: 2,
        stroke: '#c0392b',
        name: objectName
    });
    // Ensure the name is set using the set method
    c.set('name', objectName);
    canvas.add(c);
    canvas.setActiveObject(c);
}