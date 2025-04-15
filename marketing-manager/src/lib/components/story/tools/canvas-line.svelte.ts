import { Line, type Canvas } from "fabric";

// Function to add a solid line
export function addSolidLine(canvas: Canvas) {
    const objectCount = canvas.getObjects().length;
    const objectName = `Solid Line ${objectCount + 1}`;

    // Calculate a position that ensures the line is fully within the canvas
    const lineLength = 150;
    const maxLeft = Math.max(0, canvas.width - lineLength);
    const maxTop = Math.max(0, canvas.height - 10);

    const line = new Line([0, 0, lineLength, 0], {
        left: Math.min(100, maxLeft),
        top: Math.min(100, maxTop),
        stroke: '#2c3e50',
        strokeWidth: 3,
        name: objectName
    });
    
    // Ensure the name is set using the set method
    line.set('name', objectName);
    canvas.add(line);
    canvas.setActiveObject(line);
}

// Function to add a dashed line
export function addDashedLine(canvas: Canvas) {
    const objectCount = canvas.getObjects().length;
    const objectName = `Dashed Line ${objectCount + 1}`;

    // Calculate a position that ensures the line is fully within the canvas
    const lineLength = 150;
    const maxLeft = Math.max(0, canvas.width - lineLength);
    const maxTop = Math.max(0, canvas.height - 10);

    const line = new Line([0, 0, lineLength, 0], {
        left: Math.min(100, maxLeft),
        top: Math.min(100, maxTop),
        stroke: '#2c3e50',
        strokeWidth: 3,
        strokeDashArray: [10, 5], // 10px dash, 5px gap
        name: objectName
    });
    
    // Ensure the name is set using the set method
    line.set('name', objectName);
    canvas.add(line);
    canvas.setActiveObject(line);
}

// Function to add a dotted line
export function addDottedLine(canvas: Canvas) {
    const objectCount = canvas.getObjects().length;
    const objectName = `Dotted Line ${objectCount + 1}`;

    // Calculate a position that ensures the line is fully within the canvas
    const lineLength = 150;
    const maxLeft = Math.max(0, canvas.width - lineLength);
    const maxTop = Math.max(0, canvas.height - 10);

    const line = new Line([0, 0, lineLength, 0], {
        left: Math.min(100, maxLeft),
        top: Math.min(100, maxTop),
        stroke: '#2c3e50',
        strokeWidth: 3,
        strokeDashArray: [2, 4], // 2px dash, 4px gap
        name: objectName
    });
    
    // Ensure the name is set using the set method
    line.set('name', objectName);
    canvas.add(line);
    canvas.setActiveObject(line);
}
