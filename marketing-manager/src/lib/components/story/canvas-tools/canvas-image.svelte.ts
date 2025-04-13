import { FabricImage, type Canvas } from "fabric";

export function addImageFromUrl(canvas: Canvas, url: string) {
    return async () => {
        if (!url) return;

        const objectCount = canvas.getObjects().length;
        const objectName = `Image ${objectCount + 1}`;

        // We need to use the fabric.Image.fromURL method, but we can't directly import it
        // So we'll use a workaround by accessing the fabric library through the canvas
        // This is a temporary solution until we can properly import the fabric library
        const fabricLib = canvas.constructor as any;

        if (fabricLib && fabricLib.Image && fabricLib.Image.fromURL) {
            const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
            // Calculate maximum dimensions to fit within canvas
            const maxW = canvas.width * 0.8;
            const maxH = canvas.height * 0.8;
            if (img.width > maxW || img.height > maxH) {
                const scale = Math.min(maxW / img.width, maxH / img.height);
                img.scale(scale);
            }

            // Calculate position to ensure the image is centered and within canvas
            const imgWidth = img.width * img.scaleX;
            const imgHeight = img.height * img.scaleY;
            const left = (canvas.width - imgWidth) / 2;
            const top = (canvas.height - imgHeight) / 2;

            img.set({
                left: left,
                top: top,
                name: objectName
            });

            // Ensure the name is set using the set method
            img.set('name', objectName);
            canvas.add(img);
            canvas.setActiveObject(img);
        } else {
            console.error('fabric.Image.fromURL is not available');
        }
    }
}