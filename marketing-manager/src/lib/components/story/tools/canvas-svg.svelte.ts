import { type Canvas, util, Group, loadSVGFromString } from "fabric";

/**
 * This file provides functionality for importing SVG files to the canvas.
 * It allows users to import SVG files and edit them as vector objects.
 *
 * The SVG is imported as a group of fabric objects, maintaining the structure
 * of the original SVG while allowing individual elements to be edited.
 */

// Add SVG to canvas from string content
export default function addSVG(canvas: Canvas, svgString: string) {
    return async () => {
        if (!svgString) return;

        try {
            // Parse SVG string and create fabric objects
            const result = await loadSVGFromString(svgString);
            const objects = result.objects;
            const options = result.options;
            if(!objects || objects.length === 0) {
                console.error('No objects found in SVG string');
                return null;
            }

            // Group SVG elements to maintain their structure
            const svgObject = util.groupSVGElements(objects, options);

            // Generate a name for the SVG object
            const objectCount = canvas.getObjects().length;
            const objectName = `SVG ${objectCount + 1}`;

            // Set object properties
            svgObject.set({
                'name': objectName,
                'data': {
                    isSvg: true,
                    source: 'svg-import'
                }
            });

            // Center the SVG on canvas
            const canvasWidth = canvas.getWidth();
            const canvasHeight = canvas.getHeight();
            svgObject.set({
                left: canvasWidth / 2,
                top: canvasHeight / 2,
                originX: 'center',
                originY: 'center'
            });

            // Make sure all child objects are selectable and editable
            if (svgObject instanceof Group) {
                svgObject.getObjects().forEach(obj => {
                    obj.set({
                        selectable: true,
                        evented: true,
                        // Give each object a name based on its type
                        'name': `${obj.get('type')} ${Math.floor(Math.random() * 1000)}`
                    });
                });
            }

            // Add to canvas and make it the active object
            canvas.add(svgObject);
            canvas.setActiveObject(svgObject);
            canvas.renderAll();

            console.log('SVG imported successfully:', svgObject);
            return svgObject;
        } catch (error) {
            console.error('Error importing SVG:', error);
            return null;
        }
    };
}

// Utility function to check if an object is an SVG group
export function isSVGGroup(obj: any): boolean {
    // Check for the data.isSvg property first (new method)
    if (obj && obj.data && obj.data.isSvg === true) {
        console.log('SVG detected via data.isSvg property');
        return true;
    }

    // Fallback to the old method (name-based detection)
    return obj instanceof Group && obj.get('name')?.toString().startsWith('SVG ');
}
