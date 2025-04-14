import { Path, type Canvas } from "fabric";

export function addCross(canvas: Canvas) {
    const objectCount = canvas.getObjects().length;
    const objectName = `Cross ${objectCount + 1}`;

    // Calculate a position that ensures the cross is fully within the canvas
    const crossSize = 100;
    const maxLeft = Math.max(0, canvas.width - crossSize);
    const maxTop = Math.max(0, canvas.height - crossSize);

    // Create a plus/cross shape
    // The cross has equal arms with rounded ends
    const armWidth = crossSize / 3;
    const path = new Path([
        'M', crossSize / 2 - armWidth / 2, 0,
        'L', crossSize / 2 + armWidth / 2, 0,
        'L', crossSize / 2 + armWidth / 2, crossSize / 2 - armWidth / 2,
        'L', crossSize, crossSize / 2 - armWidth / 2,
        'L', crossSize, crossSize / 2 + armWidth / 2,
        'L', crossSize / 2 + armWidth / 2, crossSize / 2 + armWidth / 2,
        'L', crossSize / 2 + armWidth / 2, crossSize,
        'L', crossSize / 2 - armWidth / 2, crossSize,
        'L', crossSize / 2 - armWidth / 2, crossSize / 2 + armWidth / 2,
        'L', 0, crossSize / 2 + armWidth / 2,
        'L', 0, crossSize / 2 - armWidth / 2,
        'L', crossSize / 2 - armWidth / 2, crossSize / 2 - armWidth / 2,
        'z'
    ].join(' '), {
        left: Math.min(100, maxLeft),
        top: Math.min(100, maxTop),
        fill: '#e74c3c',
        stroke: '#c0392b',
        strokeWidth: 2,
        name: objectName
    });
    
    // Ensure the name is set using the set method
    path.set('name', objectName);
    canvas.add(path);
    canvas.setActiveObject(path);
}
