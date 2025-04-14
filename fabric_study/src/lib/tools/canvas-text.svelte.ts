import { Textbox, type Canvas } from "fabric";

export function addText(canvas: Canvas) {
    const objectCount = canvas.getObjects().length;
    const objectName = `Text ${objectCount + 1}`;

    // Calculate a position that ensures the text is fully within the canvas
    const textWidth = 200;
    const textHeight = 50;
    const maxLeft = Math.max(0, canvas.width - textWidth);
    const maxTop = Math.max(0, canvas.height - textHeight);

    const t = new Textbox('Text', {
        left: Math.min(100, maxLeft),
        top: Math.min(100, maxTop),
        fill: '#2c3e50',
        fontSize: 24,
        width: textWidth,
        name: objectName // Add a name
    });
    // Ensure the name is set using the set method
    t.set('name', objectName);
    canvas.add(t);
    canvas.setActiveObject(t);
}

