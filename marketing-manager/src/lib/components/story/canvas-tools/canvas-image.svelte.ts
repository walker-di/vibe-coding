import { FabricImage, Group, loadSVGFromURL, type Canvas } from "fabric";

/**
 * Determines if a URL is an SVG file
 */
function isSvgUrl(url: string): boolean {
    return url.toLowerCase().endsWith('.svg');
}

/**
 * Adds an image from a URL to the canvas
 * Handles both raster images and SVG files
 */
export function addImageFromUrl(canvas: Canvas, url: string) {
    return async () => {
        if (!url) return;

        const objectCount = canvas.getObjects().length;
        const objectName = `Image ${objectCount + 1}`;

        try {
            // Check if the URL is an SVG file
            if (isSvgUrl(url)) {
                // Handle SVG using the modern Promise-based approach
                const svgResult = await loadSVGFromURL(url);

                // Create a group from the loaded objects with enhanced properties for editing
                const svgGroup = new Group(svgResult.objects, {
                    ...svgResult.opts,
                    name: objectName,
                    subTargetCheck: false, // Disable sub-target selection by default
                    interactive: false,     // Disable interactive by default
                    selectable: true,       // Make sure the group is selectable
                    lockMovementX: false,   // Allow horizontal movement
                    lockMovementY: false,   // Allow vertical movement
                });

                // Explicitly set the data property to mark this as an SVG
                // This is important for the SvgEditMenu to recognize it
                svgGroup.set('data', {
                    isSvg: true,
                    originalSvgUrl: url,
                    preventUngroup: true    // Prevent automatic ungrouping
                });

                // Make all child objects non-selectable to ensure the group is selected
                svgGroup.getObjects().forEach(obj => {
                    obj.set({
                        selectable: false,
                        evented: false
                    });
                });

                // Calculate position to center the SVG
                const groupWidth = svgGroup.width * svgGroup.scaleX;
                const groupHeight = svgGroup.height * svgGroup.scaleY;
                const left = (canvas.width - groupWidth) / 2;
                const top = (canvas.height - groupHeight) / 2;

                svgGroup.set({
                    left,
                    top,
                    name: objectName
                });

                canvas.add(svgGroup);
                canvas.setActiveObject(svgGroup);
            } else {
                // Handle regular images as before
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
        } catch (error) {
            console.error('Error adding image to canvas:', error);
            // Fallback to regular image loading if SVG loading fails
            try {
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

                canvas.add(img);
                canvas.setActiveObject(img);
            } catch (fallbackError) {
                console.error('Fallback image loading also failed:', fallbackError);
            }
        }
    }
}