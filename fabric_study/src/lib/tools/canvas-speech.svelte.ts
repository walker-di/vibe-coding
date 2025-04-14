import { Path, type Canvas } from "fabric";

export function addSpeechBubble(canvas: Canvas) {
    const objectCount = canvas.getObjects().length;
    const objectName = `Speech Bubble ${objectCount + 1}`;

    // Calculate a position that ensures the speech bubble is fully within the canvas
    const bubbleWidth = 120;
    const bubbleHeight = 80;
    const maxLeft = Math.max(0, canvas.width - bubbleWidth);
    const maxTop = Math.max(0, canvas.height - bubbleHeight);

    // Create a speech bubble path
    // This creates a rounded rectangle with a tail at the bottom left
    const path = new Path([
        'M', 20, 0,
        'Q', 0, 0, 0, 20,
        'L', 0, 60,
        'Q', 0, 80, 20, 80,
        'L', 80, 80,
        'L', 70, 100,
        'L', 90, 80,
        'L', 100, 80,
        'Q', 120, 80, 120, 60,
        'L', 120, 20,
        'Q', 120, 0, 100, 0,
        'z'
    ].join(' '), {
        left: Math.min(100, maxLeft),
        top: Math.min(100, maxTop),
        fill: '#ecf0f1',
        stroke: '#bdc3c7',
        strokeWidth: 2,
        name: objectName
    });
    
    // Ensure the name is set using the set method
    path.set('name', objectName);
    canvas.add(path);
    canvas.setActiveObject(path);
}
