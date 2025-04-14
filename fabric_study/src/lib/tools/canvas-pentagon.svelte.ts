import { Path, type Canvas } from "fabric";

export function addPentagon(canvas: Canvas) {
    const objectCount = canvas.getObjects().length;
    const objectName = `Pentagon ${objectCount + 1}`;

    // Calculate a position that ensures the pentagon is fully within the canvas
    const pentagonSize = 100;
    const maxLeft = Math.max(0, canvas.width - pentagonSize);
    const maxTop = Math.max(0, canvas.height - pentagonSize);

    // Create a regular pentagon using a path
    const pathData = createRegularPolygonPath(5, pentagonSize / 2);

    const pentagon = new Path(pathData, {
        left: Math.min(100, maxLeft),
        top: Math.min(100, maxTop),
        fill: '#1abc9c',
        stroke: '#16a085',
        strokeWidth: 2,
        name: objectName
    });

    // Ensure the name is set using the set method
    pentagon.set('name', objectName);
    canvas.add(pentagon);
    canvas.setActiveObject(pentagon);
}

// Helper function to create a regular polygon path
function createRegularPolygonPath(sides: number, radius: number) {
    const path = [];
    const angleStep = 2 * Math.PI / sides;
    const center = radius; // Center point

    // Start from the top (270 degrees or 3π/2 in radians)
    const startAngle = -Math.PI / 2;

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
