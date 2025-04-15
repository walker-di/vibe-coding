import { Path, type Canvas } from "fabric";

export function addStar(canvas: Canvas) {
    const objectCount = canvas.getObjects().length;
    const objectName = `Star ${objectCount + 1}`;

    // Calculate a position that ensures the star is fully within the canvas
    const starSize = 100;
    const maxLeft = Math.max(0, canvas.width - starSize);
    const maxTop = Math.max(0, canvas.height - starSize);

    // Create a 5-pointed star using a path
    const pathData = createStarPath(5, starSize / 2, starSize / 4);

    const star = new Path(pathData, {
        left: Math.min(100, maxLeft),
        top: Math.min(100, maxTop),
        fill: '#f1c40f',
        stroke: '#f39c12',
        strokeWidth: 2,
        name: objectName
    });

    // Ensure the name is set using the set method
    star.set('name', objectName);
    canvas.add(star);
    canvas.setActiveObject(star);
}

// Helper function to create a star path
function createStarPath(spikes: number, outerRadius: number, innerRadius: number) {
    const path = [];
    const angleStep = Math.PI / spikes;
    const center = outerRadius; // Center point

    // Start the path
    path.push('M');

    for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = i * angleStep - Math.PI / 2; // Start from top
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);

        path.push(x, y);
    }

    // Close the path
    path.push('z');

    return path.join(' ');
}
