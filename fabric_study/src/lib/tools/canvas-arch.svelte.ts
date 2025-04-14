import { Path, type Canvas } from "fabric";

export function addArch(canvas: Canvas) {
    const objectCount = canvas.getObjects().length;
    const objectName = `Arch ${objectCount + 1}`;

    // Calculate a position that ensures the arch is fully within the canvas
    const archWidth = 100;
    const archHeight = 50;
    const maxLeft = Math.max(0, canvas.width - archWidth);
    const maxTop = Math.max(0, canvas.height - archHeight);

    // Create an arch path
    const path = new Path([
        'M', 0, archHeight,
        'Q', archWidth / 2, 0, archWidth, archHeight
    ].join(' '), {
        left: Math.min(100, maxLeft),
        top: Math.min(100, maxTop),
        fill: '',
        stroke: '#7f8c8d',
        strokeWidth: 4,
        name: objectName
    });
    
    // Ensure the name is set using the set method
    path.set('name', objectName);
    canvas.add(path);
    canvas.setActiveObject(path);
}
