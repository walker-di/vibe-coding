import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parsePlaceholder } from '$lib/utils/placeholder-parser';
import { generateImage } from '$lib/server/aiService';
import path from 'path';
import fsPromises from 'fs/promises';

export const GET: RequestHandler = async () => {
  try {
    // Create a sample template with placeholder objects
    const sampleTemplate = {
      version: '5.3.0',
      objects: [
        {
          type: 'rect',
          version: '5.3.0',
          originX: 'left',
          originY: 'top',
          left: 0,
          top: 0,
          width: 800,
          height: 600,
          fill: '#f0f0f0',
          stroke: null,
          strokeWidth: 0,
          name: 'background'
        },
        {
          type: 'rect',
          version: '5.3.0',
          originX: 'left',
          originY: 'top',
          left: 100,
          top: 100,
          width: 300,
          height: 300,
          fill: '#cccccc',
          stroke: null,
          strokeWidth: 0,
          name: 'placeholder?name=main_image&ratio=1:1'
        },
        {
          type: 'rect',
          version: '5.3.0',
          originX: 'left',
          originY: 'top',
          left: 450,
          top: 100,
          width: 250,
          height: 150,
          fill: '#dddddd',
          stroke: null,
          strokeWidth: 0,
          name: 'placeholder?name=product&ratio=16:9'
        }
      ]
    };

    // Process the template
    console.log('Processing sample template with placeholders');
    
    // Ensure the uploads/gen directory exists
    const uploadDir = path.join('static', 'uploads', 'gen');
    try {
      await fsPromises.mkdir(uploadDir, { recursive: true });
    } catch (mkdirError: any) {
      console.error(`Failed to create image directory ${uploadDir}:`, mkdirError);
      return json({
        success: false,
        error: `Failed to create directory: ${mkdirError.message}`
      });
    }

    // Process each object in the template
    const updatedObjects = [];
    const testId = Date.now();

    for (const obj of sampleTemplate.objects) {
      // Check if this is a placeholder object
      if (obj && obj.name && typeof obj.name === 'string' && obj.name.startsWith('placeholder?')) {
        const placeholderParams = parsePlaceholder(obj.name);

        if (placeholderParams) {
          // Generate a prompt based on the placeholder parameters
          const prompt = `A professional marketing image for ${placeholderParams.name || 'product'}`;
          
          // Generate an image for the placeholder
          const aspectRatio = placeholderParams.ratio || '1:1';
          let imageUrl: string | null = null;
          
          try {
            imageUrl = await generateImage(prompt, testId, aspectRatio as '1:1' | '16:9' | '9:16');
          } catch (genError: any) {
            console.error(`Image generation failed for placeholder ${obj.name}: ${genError.message}`);
            updatedObjects.push(obj);
            continue;
          }

          if (imageUrl) {
            // Replace the placeholder with an image object
            const imageObj = {
              type: 'image',
              version: '5.3.0',
              originX: obj.originX || 'left',
              originY: obj.originY || 'top',
              left: obj.left || 0,
              top: obj.top || 0,
              width: obj.width || 100,
              height: obj.height || 100,
              fill: obj.fill || 'rgb(0,0,0)',
              stroke: obj.stroke || null,
              strokeWidth: obj.strokeWidth || 0,
              name: obj.name ? obj.name.replace('placeholder?', 'generated_') : `generated_image_${Date.now()}`,
              src: imageUrl,
              crossOrigin: 'anonymous',
              filters: []
            };
            
            updatedObjects.push(imageObj);
            console.log(`Replaced placeholder ${obj.name} with image: ${imageUrl}`);
          } else {
            console.warn(`Image generation returned null for placeholder ${obj.name}. Keeping original object.`);
            updatedObjects.push(obj);
          }
        } else {
          console.warn(`Failed to parse placeholder: ${obj.name}. Keeping original object.`);
          updatedObjects.push(obj);
        }
      } else {
        // Not a placeholder, keep the original object
        updatedObjects.push(obj);
      }
    }

    // Update the template with the processed objects
    const updatedTemplate = {
      ...sampleTemplate,
      objects: updatedObjects
    };

    return json({
      success: true,
      originalTemplate: sampleTemplate,
      updatedTemplate
    });
  } catch (error: any) {
    console.error('Error in test AI Fill endpoint:', error);
    return json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
};
