import { Line, Triangle, Group, Path, type Canvas } from "fabric";

// Function to add a simple arrow
export function addSimpleArrow(canvas: Canvas) {
    const objectCount = canvas.getObjects().length;
    const objectName = `Arrow ${objectCount + 1}`;

    // Calculate a position that ensures the arrow is fully within the canvas
    const arrowLength = 150;
    const maxLeft = Math.max(0, canvas.width - arrowLength);
    const maxTop = Math.max(0, canvas.height - 20);

    // Create the line part of the arrow
    const line = new Line([0, 0, arrowLength - 15, 0], {
        stroke: '#2c3e50',
        strokeWidth: 3
    });

    // Create the arrowhead
    const arrowhead = new Triangle({
        width: 15,
        height: 15,
        left: arrowLength - 7.5,
        top: 0,
        angle: 90,
        fill: '#2c3e50'
    });

    // Group the line and arrowhead
    const arrow = new Group([line, arrowhead], {
        left: Math.min(100, maxLeft),
        top: Math.min(100, maxTop),
        name: objectName
    });

    // Ensure the name is set using the set method
    arrow.set('name', objectName);
    canvas.add(arrow);
    canvas.setActiveObject(arrow);
}

// Function to add a double-sided arrow
export function addDoubleArrow(canvas: Canvas) {
    const objectCount = canvas.getObjects().length;
    const objectName = `Double Arrow ${objectCount + 1}`;

    // Calculate a position that ensures the arrow is fully within the canvas
    const arrowLength = 150;
    const maxLeft = Math.max(0, canvas.width - arrowLength);
    const maxTop = Math.max(0, canvas.height - 20);

    // Create the line part of the arrow
    const line = new Line([15, 0, arrowLength - 15, 0], {
        stroke: '#2c3e50',
        strokeWidth: 3
    });

    // Create the right arrowhead
    const rightArrowhead = new Triangle({
        width: 15,
        height: 15,
        left: arrowLength - 7.5,
        top: 0,
        angle: 90,
        fill: '#2c3e50'
    });

    // Create the left arrowhead
    const leftArrowhead = new Triangle({
        width: 15,
        height: 15,
        left: 7.5,
        top: 0,
        angle: -90,
        fill: '#2c3e50'
    });

    // Group the line and arrowheads
    const arrow = new Group([line, rightArrowhead, leftArrowhead], {
        left: Math.min(100, maxLeft),
        top: Math.min(100, maxTop),
        name: objectName
    });

    // Ensure the name is set using the set method
    arrow.set('name', objectName);
    canvas.add(arrow);
    canvas.setActiveObject(arrow);
}

// Function to add a thick arrow
export function addThickArrow(canvas: Canvas) {
    const objectCount = canvas.getObjects().length;
    const objectName = `Thick Arrow ${objectCount + 1}`;

    // Calculate a position that ensures the arrow is fully within the canvas
    const arrowLength = 150;
    const maxLeft = Math.max(0, canvas.width - arrowLength);
    const maxTop = Math.max(0, canvas.height - 30);

    // Create a thick arrow using a path
    const path = [
        'M', 0, 10,
        'L', arrowLength - 20, 10,
        'L', arrowLength - 20, 0,
        'L', arrowLength, 15,
        'L', arrowLength - 20, 30,
        'L', arrowLength - 20, 20,
        'L', 0, 20,
        'z'
    ].join(' ');

    // Create the arrow as a path
    const arrow = new Path(path, {
        left: Math.min(100, maxLeft),
        top: Math.min(100, maxTop),
        fill: '#2c3e50',
        stroke: '',
        name: objectName
    });

    // Ensure the name is set using the set method
    arrow.set('name', objectName);
    canvas.add(arrow);
    canvas.setActiveObject(arrow);
}
