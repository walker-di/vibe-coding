import { Path, type Canvas } from "fabric";

export function addHexagon(canvas: Canvas) {
    const objectCount = canvas.getObjects().length;
    const objectName = `Hexagon ${objectCount + 1}`;

    // Calculate a position that ensures the hexagon is fully within the canvas
    const hexagonSize = 100;
    const maxLeft = Math.max(0, canvas.width - hexagonSize);
    const maxTop = Math.max(0, canvas.height - hexagonSize);

    // Create a regular hexagon using a path
    const pathData = createRegularPolygonPath(6, hexagonSize / 2);

    const hexagon = new Path(pathData, {
        left: Math.min(100, maxLeft),
        top: Math.min(100, maxTop),
        fill: '#3498db',
        stroke: '#2980b9',
        strokeWidth: 2,
        name: objectName
    });

    // Ensure the name is set using the set method
    hexagon.set('name', objectName);
    canvas.add(hexagon);
    canvas.setActiveObject(hexagon);
}

// Helper function to create a regular polygon path
function createRegularPolygonPath(sides: number, radius: number) {
    const path = [];
    const angleStep = 2 * Math.PI / sides;
    const center = radius; // Center point

    // Start from the right (0 radians)
    const startAngle = 0;

    // Start the path
    path.push('M');

    for (let i = 0; i < sides; i++) {
        const angle = startAngle + i * angleStep;
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);

        if (i === 0) {
            path.push(x, y);
        } else {
            path.push('L', x, y);
        }
    }

    // Close the path
    path.push('z');

    return path.join(' ');
}
