import { Circle, Rect, Textbox, type Canvas } from "fabric";

// Define the Constructor type
type Constructor<T> = new (...args: any[]) => T;

export class CanvasService {
    canvas = $state<Canvas>(undefined as any);
    constructor(lib: Constructor<Canvas>) {
        this.canvas = new lib('canvas', {
            width: 800,
            height: 600,
            backgroundColor: '#f0f0f0',
            renderOnAddRemove: true,
            stateful: true,
            preserveObjectStacking: true // Add this to prevent layer shuffling
        });
    }

    addRectangle() {
        // Get the current number of objects to create a unique name
        const objectCount = this.canvas.getObjects().length;
        const objectName = `Rectangle ${objectCount + 1}`;

        // Calculate a position that ensures the rectangle is fully within the canvas
        const rectWidth = 100;
        const rectHeight = 100;
        const maxLeft = Math.max(0, this.canvas.width - rectWidth);
        const maxTop = Math.max(0, this.canvas.height - rectHeight);
        const left = Math.min(100, maxLeft);
        const top = Math.min(100, maxTop);

        const r = new Rect({
            left: left,
            top: top,
            fill: '#3498db',
            width: rectWidth,
            height: rectHeight,
            strokeWidth: 2,
            stroke: '#2980b9',
            name: objectName
        });
        // Ensure the name is set using the set method
        r.set('name', objectName);
        this.canvas.add(r);
        this.canvas.setActiveObject(r);
        // Save canvas after adding object
        // saveCanvas();
    }

    addCircle() {
        const objectCount = this.canvas.getObjects().length;
        const objectName = `Circle ${objectCount + 1}`;

        // Calculate a position that ensures the circle is fully within the canvas
        const radius = 50;
        const maxLeft = Math.max(radius, this.canvas.width - radius);
        const maxTop = Math.max(radius, this.canvas.height - radius);
        const left = Math.min(100, maxLeft);
        const top = Math.min(100, maxTop);

        const c = new Circle({
          left: left,
          top: top,
          fill: '#e74c3c',
          radius: radius,
          strokeWidth: 2,
          stroke: '#c0392b',
          name: objectName
        });
        // Ensure the name is set using the set method
        c.set('name', objectName);
        this.canvas.add(c);
        this.canvas.setActiveObject(c);
      }

    addText() {
        if (!this.canvas) return;

        // Get the current number of objects to create a unique name
        const objectCount = this.canvas.getObjects().length;
        const objectName = `Text ${objectCount + 1}`;

        // Calculate a position that ensures the text is fully within the canvas
        const textWidth = 200;
        const textHeight = 50; // Approximate height for a text element
        const maxLeft = Math.max(0, this.canvas.width - textWidth);
        const maxTop = Math.max(0, this.canvas.height - textHeight);
        const left = Math.min(100, maxLeft);
        const top = Math.min(100, maxTop);

        const t = new Textbox('Text', {
            left: left,
            top: top,
            fill: '#2c3e50',
            fontSize: 24,
            width: textWidth,
            name: objectName // Add a name
        });
        // Ensure the name is set using the set method
        t.set('name', objectName);
        this.canvas.add(t);
        this.canvas.setActiveObject(t);
    }

    // Add image from URL
    addImageFromUrl(url: string) {
        if (!this.canvas || !url) return;

        // Get the current number of objects to create a unique name
        const objectCount = this.canvas.getObjects().length;
        const objectName = `Image ${objectCount + 1}`;

        // We need to use the fabric.Image.fromURL method, but we can't directly import it
        // So we'll use a workaround by accessing the fabric library through the canvas
        // This is a temporary solution until we can properly import the fabric library
        const fabricLib = this.canvas.constructor as any;

        if (fabricLib && fabricLib.Image && fabricLib.Image.fromURL) {
            fabricLib.Image.fromURL(url, (img: any) => {
                // Calculate maximum dimensions to fit within canvas
                const maxW = this.canvas.width * 0.8;
                const maxH = this.canvas.height * 0.8;
                if (img.width > maxW || img.height > maxH) {
                    const scale = Math.min(maxW / img.width, maxH / img.height);
                    img.scale(scale);
                }

                // Calculate position to ensure the image is centered and within canvas
                const imgWidth = img.width * img.scaleX;
                const imgHeight = img.height * img.scaleY;
                const left = (this.canvas.width - imgWidth) / 2;
                const top = (this.canvas.height - imgHeight) / 2;

                img.set({
                    left: left,
                    top: top,
                    name: objectName
                });

                // Ensure the name is set using the set method
                img.set('name', objectName);
                this.canvas.add(img);
                this.canvas.setActiveObject(img);
            }, { crossOrigin: 'anonymous' });
        } else {
            console.error('fabric.Image.fromURL is not available');
        }
    }

    // Method for showing image upload dialog
    addImage() {
        // This is just a placeholder - the actual implementation will be in the component
        // that uses this service, as it involves UI interaction
        console.log('Image upload dialog should be shown by the component');
    }
}