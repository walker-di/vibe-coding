import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { clips, scenes, stories, creatives, personas, products, canvasTemplates } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { parsePlaceholder } from '$lib/utils/placeholder-parser';
import { generateImage } from '$lib/server/aiService'; // Assuming this service exists and is correctly implemented
import path from 'path';
import fs from 'fs/promises';

export const POST: RequestHandler = async ({ params, request }) => {
  const clipId = parseInt(params.clipId, 10);
  
  if (isNaN(clipId)) {
    throw error(400, 'Invalid clip ID');
  }
  
  try {
    // Get the clip data
    const clip = await db.query.clips.findFirst({
      where: eq(clips.id, clipId)
    });
    
    if (!clip) {
      throw error(404, 'Clip not found');
    }
    
    // Get the scene data
    const scene = await db.query.scenes.findFirst({
      where: eq(scenes.id, clip.sceneId)
    });
    
    if (!scene) {
      throw error(404, 'Scene not found');
    }
    
    // Get the story data
    const story = await db.query.stories.findFirst({
      where: eq(stories.id, scene.storyId)
    });
    
    if (!story) {
      throw error(404, 'Story not found');
    }
    
    // Get the creative data
    const creative = await db.query.creatives.findFirst({
      where: eq(creatives.id, story.creativeId)
    });
    
    if (!creative) {
      throw error(404, 'Creative not found');
    }
    
    // Get the persona data
    const persona = await db.query.personas.findFirst({
      where: eq(personas.id, creative.personaId)
    });
    
    if (!persona) {
      throw error(404, 'Persona not found');
    }
    
    // Get the product data
    const product = await db.query.products.findFirst({
      where: eq(products.id, persona.productId)
    });
    
    if (!product) {
      throw error(404, 'Product not found');
    }
    
    // Select a template based on context
    const template = await selectTemplateForClip(clip, story, creative, persona, product);
    
    if (!template) {
      throw error(500, 'Failed to select a template');
    }
    
    // Parse the template canvas data
    // Ensure template.canvasData is treated as a string before parsing
    const canvasData = JSON.parse(template.canvasData as string || '{}'); 
    
    // Process each object in the canvas
    const updatedObjects = await processCanvasObjects(canvasData.objects || [], clip, creative, persona, product);
    
    // Update the canvas data with the processed objects
    canvasData.objects = updatedObjects;
    
    // Update the clip with the new canvas data
    const [updatedClip] = await db
      .update(clips)
      .set({
        canvas: JSON.stringify(canvasData),
        updatedAt: new Date()
      })
      .where(eq(clips.id, clipId))
      .returning();
    
    return json({
      success: true,
      message: 'Clip updated successfully with AI-generated content',
      data: updatedClip
    });
  } catch (err: any) {
    console.error('Error in AI fill process:', err);
    // Check if it's an HTTP error from sveltekit and rethrow, otherwise wrap
    if (err.status && err.body) {
        throw err;
    }
    throw error(500, `Failed to process AI fill: ${err.message}`);
  }
};

// Function to select a template based on context
async function selectTemplateForClip(clip: any, story: any, creative: any, persona: any, product: any) {
  // For now, just select a random template that matches the aspect ratio
  const templates = await db.query.canvasTemplates.findMany({
    where: eq(canvasTemplates.aspectRatio, story.aspectRatio)
  });
  
  if (templates.length === 0) {
    // Use sveltekit error helper
    throw error(404, `No templates found for the story aspect ratio: ${story.aspectRatio}`);
  }
  
  // In a real implementation, we would use AI to select the best template
  // based on the context data
  return templates[Math.floor(Math.random() * templates.length)];
}

// Function to process canvas objects and generate images for placeholders
async function processCanvasObjects(objects: any[], clip: any, creative: any, persona: any, product: any) {
  // Ensure the uploads/gen directory exists
  const uploadDir = path.join('static', 'uploads', 'gen');
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch (err: any) {
    console.error('Error creating directory:', err);
    // Use sveltekit error helper
    throw error(500, `Failed to create upload directory: ${err.message}`);
  }
  
  // Process each object
  const updatedObjects = [];
  
  for (const obj of objects) {
    // Check if this is a placeholder object and has a name property
    if (obj && obj.name && typeof obj.name === 'string' && obj.name.startsWith('placeholder?')) {
      const placeholderParams = parsePlaceholder(obj.name);
      
      if (placeholderParams) {
        // Generate a prompt based on the placeholder parameters and context
        const prompt = generatePromptForPlaceholder(
          placeholderParams,
          clip,
          creative,
          persona,
          product
        );
        
        // Generate an image for the placeholder
        const aspectRatio = placeholderParams.ratio || '1:1';
        // Ensure generateImage exists and handles potential errors
        let imageUrl: string | null = null;
        try {
          // Assuming generateImage returns the URL or null/throws on error
          imageUrl = await generateImage(prompt, clip.id, aspectRatio as '1:1' | '16:9' | '9:16'); 
        } catch (genError: any) {
            console.error(`Image generation failed for placeholder ${obj.name}: ${genError.message}`);
            // Decide how to handle: skip, use default, or throw error
            // For now, we'll skip and keep the original object
            updatedObjects.push(obj); 
            continue; // Move to the next object
        }

        if (imageUrl) {
          // Replace the placeholder with an image object
          const imageObj = createImageObject(obj, imageUrl);
          updatedObjects.push(imageObj);
        } else {
          // If image generation fails or returns null, keep the original object
          console.warn(`Image generation returned null for placeholder ${obj.name}. Keeping original object.`);
          updatedObjects.push(obj);
        }
      } else {
        // If placeholder parsing fails, keep the original object
        console.warn(`Failed to parse placeholder: ${obj.name}. Keeping original object.`);
        updatedObjects.push(obj);
      }
    } else {
      // Not a placeholder or invalid object, keep the original object
      updatedObjects.push(obj);
    }
  }
  
  return updatedObjects;
}

// Function to generate a prompt for a placeholder
function generatePromptForPlaceholder(placeholderParams: ReturnType<typeof parsePlaceholder>, clip: any, creative: any, persona: any, product: any): string {
  if (!placeholderParams) return `Generic marketing image for ${product.name}`; // Fallback prompt

  // Use the clip description or narration if available
  const textSource = clip.narration || clip.description;
  if (textSource) {
    return `${textSource}. High quality, professional image for marketing. Style: ${creative.style || 'modern'}. Target Audience: ${persona.personaTitle || 'general customer'}. Product: ${product.name}.`;
  }
  
  // Otherwise, generate a prompt based on the placeholder name and context
  const name = placeholderParams.name || 'image';
  
  let prompt = `A professional marketing image for ${product.name}`;
  
  if (name === 'main_image') {
    prompt += ` featuring the main product prominently`;
  } else if (name === 'background') {
    prompt += ` with a suitable background that matches the brand style: ${creative.style || 'clean and modern'}`;
  } else if (name.includes('person')) {
    prompt += ` showing a person that matches the target audience: ${persona.personaTitle || 'customer'}`;
  } else {
    prompt += ` related to the concept: ${creative.concept || 'general marketing'}`;
  }
  
  prompt += `. Style: ${creative.style || 'modern'}. Target Audience: ${persona.personaTitle || 'general customer'}.`;
  
  return prompt;
}

// Function to create an image object from a placeholder
function createImageObject(placeholderObj: any, imageUrl: string) {
  // Calculate the visual dimensions of the placeholder
  const placeholderWidth = placeholderObj.width || 200;
  const placeholderHeight = placeholderObj.height || 200;
  const placeholderScaleX = placeholderObj.scaleX || 1;
  const placeholderScaleY = placeholderObj.scaleY || 1;
  const targetWidth = placeholderWidth * placeholderScaleX;
  const targetHeight = placeholderHeight * placeholderScaleY;

  // Create a new image object based on the placeholder's properties
  // Ensure placeholderObj has expected properties or provide defaults
  return {
    type: 'image',
    version: '5.3.0', // Consider using a constant or dynamic version
    originX: placeholderObj.originX || 'left',
    originY: placeholderObj.originY || 'top',
    left: placeholderObj.left || 0, // Keep position
    top: placeholderObj.top || 0,   // Keep position
    // Set width and height to the placeholder's visual bounds
    // Fabric.js will scale the loaded image to fit these dimensions
    // while preserving aspect ratio by default.
    width: targetWidth,
    height: targetHeight,
    fill: placeholderObj.fill || 'rgb(0,0,0)', // Keep placeholder fill? Or default?
    stroke: placeholderObj.stroke || null,
    strokeWidth: placeholderObj.strokeWidth || 0,
    strokeDashArray: placeholderObj.strokeDashArray || null,
    strokeLineCap: placeholderObj.strokeLineCap || 'butt',
    strokeDashOffset: placeholderObj.strokeDashOffset || 0,
    strokeLineJoin: placeholderObj.strokeLineJoin || 'miter',
    strokeUniform: placeholderObj.strokeUniform || false,
    strokeMiterLimit: placeholderObj.strokeMiterLimit || 4,
    // Reset scale to 1, as width/height now define the target size
    scaleX: 1,
    scaleY: 1,
    angle: placeholderObj.angle || 0, // Keep angle
    flipX: placeholderObj.flipX || false,
    flipY: placeholderObj.flipY || false,
    opacity: placeholderObj.opacity || 1,
    shadow: placeholderObj.shadow || null,
    visible: placeholderObj.visible !== undefined ? placeholderObj.visible : true,
    backgroundColor: placeholderObj.backgroundColor || '',
    fillRule: placeholderObj.fillRule || 'nonzero',
    paintFirst: placeholderObj.paintFirst || 'fill',
    globalCompositeOperation: placeholderObj.globalCompositeOperation || 'source-over',
    skewX: placeholderObj.skewX || 0,
    skewY: placeholderObj.skewY || 0,
    cropX: 0, // Reset crop for new image
    cropY: 0, // Reset crop for new image
    // Generate a more descriptive name if possible
    name: placeholderObj.name ? placeholderObj.name.replace('placeholder?', 'generated_') : `generated_image_${Date.now()}`, 
    src: imageUrl, // The generated image URL
    crossOrigin: 'anonymous', // Important for canvas operations
    filters: [] // Apply filters later if needed
  };
}
