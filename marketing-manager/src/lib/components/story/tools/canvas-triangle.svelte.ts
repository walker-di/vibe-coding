import { Triangle, type Canvas } from "fabric";

export function addTriangle(canvas: Canvas) {
    const objectCount = canvas.getObjects().length;
    const objectName = `Triangle ${objectCount + 1}`;

    // Calculate a position that ensures the triangle is fully within the canvas
    const triangleWidth = 100;
    const triangleHeight = 100;
    const maxLeft = Math.max(0, canvas.width - triangleWidth);
    const maxTop = Math.max(0, canvas.height - triangleHeight);

    const t = new Triangle({
        left: Math.min(100, maxLeft),
        top: Math.min(100, maxTop),
        fill: '#9b59b6',
        width: triangleWidth,
        height: triangleHeight,
        strokeWidth: 2,
        stroke: '#8e44ad',
        name: objectName
    });
    
    // Ensure the name is set using the set method
    t.set('name', objectName);
    canvas.add(t);
    canvas.setActiveObject(t);
}
