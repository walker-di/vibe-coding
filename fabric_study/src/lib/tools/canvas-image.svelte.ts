import { FabricImage, type Canvas } from "fabric";

/**
 * This file provides two functions for adding images to the canvas:
 *
 * 1. addImage (default export) - Adds an image with its original size
 * 2. addImageFromUrl - Adds an image and scales it to fit within 80% of the canvas
 *
 * The default function is recommended for most cases as it preserves the original image dimensions.
 */

// Add image with original size (default function)
export default function addImage(canvas: Canvas, url: string) {
    return async () => {
        if (!url) return;

        const objectCount = canvas.getObjects().length;
        const objectName = `Image ${objectCount + 1}`;

        // Create image from URL
        const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });

        // Center the image on canvas without scaling
        const left = (canvas.width - img.width) / 2;
        const top = (canvas.height - img.height) / 2;

        img.set({
            left: left,
            top: top,
            name: objectName
        });

        canvas.add(img);
        canvas.setActiveObject(img);
    }
}

// Legacy function that scales images to fit within canvas
export function addImageFromUrl(canvas: Canvas, url: string) {
    return async () => {
        if (!url) return;

        const objectCount = canvas.getObjects().length;
        const objectName = `Image ${objectCount + 1}`;

        // Create image from URL
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

        canvas.add(img);
        canvas.setActiveObject(img);
    }
}