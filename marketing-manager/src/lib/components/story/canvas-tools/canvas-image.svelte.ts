import { FabricImage, type Canvas } from "fabric";

export function addImageFromUrl(canvas: Canvas, url: string) {
    return async () => {
        if (!url) return;

        const objectCount = canvas.getObjects().length;
        const objectName = `Image ${objectCount + 1}`;

        const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
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
    }
}