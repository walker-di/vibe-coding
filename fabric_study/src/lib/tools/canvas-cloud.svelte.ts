import { Path, type Canvas } from "fabric";

export function addCloud(canvas: Canvas) {
    const objectCount = canvas.getObjects().length;
    const objectName = `Cloud ${objectCount + 1}`;

    // Calculate a position that ensures the cloud is fully within the canvas
    const cloudWidth = 120;
    const cloudHeight = 80;
    const maxLeft = Math.max(0, canvas.width - cloudWidth);
    const maxTop = Math.max(0, canvas.height - cloudHeight);

    // Create a cloud path
    // This creates a cloud shape with multiple arcs
    const path = new Path([
        'M', 25, 60,
        'Q', 0, 60, 0, 40,
        'Q', 0, 20, 20, 20,
        'Q', 20, 0, 40, 0,
        'Q', 60, 0, 70, 20,
        'Q', 80, 0, 100, 0,
        'Q', 120, 0, 120, 20,
        'Q', 140, 20, 140, 40,
        'Q', 140, 60, 120, 60,
        'Q', 120, 80, 100, 80,
        'Q', 80, 80, 60, 60,
        'Q', 40, 80, 20, 60,
        'z'
    ].join(' '), {
        left: Math.min(100, maxLeft),
        top: Math.min(100, maxTop),
        fill: '#ecf0f1',
        stroke: '#bdc3c7',
        strokeWidth: 2,
        name: objectName,
        scaleX: 0.8,
        scaleY: 0.8
    });
    
    // Ensure the name is set using the set method
    path.set('name', objectName);
    canvas.add(path);
    canvas.setActiveObject(path);
}
