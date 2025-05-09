import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { clips, scenes, stories, creatives, personas, products, canvasTemplates } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { parsePlaceholder } from '$lib/utils/placeholder-parser';
import { generateImage, generateNarrationText } from '$lib/server/aiService';
import path from 'path';
import fs from 'fs/promises';
import ky from 'ky';
import sizeOf from 'image-size';

export const POST: RequestHandler = async ({ params, request }) => {
  const clipId = parseInt(params.clipId, 10);

  if (isNaN(clipId)) {
    throw error(400, 'Invalid clip ID');
  }

  // Parse request body to get aspect ratio and resolution parameters
  let requestBody = {};
  try {
    requestBody = await request.json();
    console.log('AI Fill request body:', requestBody);
  } catch (err) {
    console.log('No request body or invalid JSON');
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

    // Get aspect ratio and resolution from request body or use story values
    const requestAspectRatio = requestBody.aspectRatio;
    const requestResolution = requestBody.resolution;
    const requestWidth = requestBody.width;
    const requestHeight = requestBody.height;

    // Use request values if provided, otherwise use story values
    const aspectRatioToUse = requestAspectRatio || story.aspectRatio;
    const resolutionToUse = requestResolution || story.resolution;

    console.log(`Using aspect ratio: ${aspectRatioToUse}, resolution: ${resolutionToUse}`);
    console.log(`Requested dimensions: ${requestWidth}x${requestHeight}`);

    // Select a template based on context and the specified aspect ratio
    const template = await selectTemplateForClip(clip, { ...story, aspectRatio: aspectRatioToUse }, creative, persona, product);

    if (!template) {
      throw error(500, 'Failed to select a template');
    }

    // Log template information for debugging
    console.log(`Selected template: ${template.name}, AspectRatio: ${template.aspectRatio}, Resolution: ${template.resolution}`);


    // Parse the template canvas data
    // Ensure template.canvasData is treated as a string before parsing
    const canvasData = JSON.parse(template.canvasData as string || '{}');

    // Log initial canvas dimensions for debugging
    console.log(`Initial canvas dimensions: width=${canvasData.width || 'not set'}, height=${canvasData.height || 'not set'}`);

    // Process each object in the canvas
    console.log(`Processing ${canvasData.objects?.length || 0} objects in template`);
    const updatedObjects = await processCanvasObjects(canvasData.objects || [], clip, creative, persona, product);
    console.log(`Processed ${updatedObjects.length} objects, including replacements`);

    // Update the canvas data with the processed objects
    canvasData.objects = updatedObjects;

    // Set the canvas dimensions based on the request parameters first, then template
    if (requestWidth && requestHeight) {
      // Use the dimensions provided in the request
      console.log(`Setting canvas dimensions from request: ${requestWidth}x${requestHeight}`);
      canvasData.width = requestWidth;
      canvasData.height = requestHeight;
    } else if (resolutionToUse) {
      // Use the resolution from the request or story
      const dimensions = calculateDimensions(resolutionToUse);
      console.log(`Setting canvas dimensions from resolution: ${dimensions.width}x${dimensions.height}`);
      canvasData.width = dimensions.width;
      canvasData.height = dimensions.height;
    } else if (template.resolution) {
      // Fall back to template resolution
      const dimensions = calculateDimensions(template.resolution);
      console.log(`Setting canvas dimensions from template resolution: ${dimensions.width}x${dimensions.height}`);
      canvasData.width = dimensions.width;
      canvasData.height = dimensions.height;
    } else if (aspectRatioToUse || template.aspectRatio) {
      // If no resolution but we have aspect ratio, calculate dimensions based on a default width
      const defaultWidth = 1920; // Use a high-quality default width
      let height;
      const ratioToUse = aspectRatioToUse || template.aspectRatio;

      // Calculate height based on aspect ratio
      if (ratioToUse === '16:9') {
        height = Math.round(defaultWidth * (9/16));
      } else if (ratioToUse === '9:16') {
        height = Math.round(defaultWidth * (16/9));
      } else if (ratioToUse === '1:1') {
        height = defaultWidth;
      } else if (ratioToUse === '4:5') {
        height = Math.round(defaultWidth * (5/4));
      } else if (ratioToUse === '1.91:1') {
        height = Math.round(defaultWidth / 1.91);
      } else {
        // Default to 16:9 if aspect ratio is not recognized
        height = Math.round(defaultWidth * (9/16));
      }

      console.log(`Using calculated dimensions from aspect ratio ${ratioToUse}: ${defaultWidth}x${height}`);
      canvasData.width = defaultWidth;
      canvasData.height = height;
    } else {
      console.log('No dimensions, resolution, or aspect ratio available, using default dimensions');
    }

    // Log final canvas dimensions for debugging
    console.log(`Final canvas dimensions: width=${canvasData.width || 'not set'}, height=${canvasData.height || 'not set'}`);


    // Generate narration text if the clip doesn't have one
    let narration = clip.narration;
    if (!narration) {
      try {
        // Generate narration based on clip description or template context
        const narrationSource = clip.description || `A marketing clip for ${product.name} targeting ${persona.personaTitle || 'customers'}`;
        console.log(`Generating narration text from source: ${narrationSource}`);
        narration = await generateNarrationText(narrationSource);
        console.log(`Generated narration text: ${narration}`);
      } catch (narrationErr) {
        console.error('Error generating narration text:', narrationErr);
        // Continue without narration if generation fails
      }
    }

    // Update the clip with the new canvas data and narration
    const canvasJson = JSON.stringify(canvasData);
    console.log(`Canvas JSON length: ${canvasJson.length}`);

    const [updatedClip] = await db
      .update(clips)
      .set({
        canvas: canvasJson,
        narration: narration, // Include the narration in the update
        updatedAt: new Date()
      })
      .where(eq(clips.id, clipId))
      .returning();

    console.log(`Clip ${clipId} updated successfully with new canvas data`);

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
  console.log(`Selecting template for aspect ratio: ${story.aspectRatio}`);

  // For now, just select a random template that matches the aspect ratio
  const templates = await db.query.canvasTemplates.findMany({
    where: eq(canvasTemplates.aspectRatio, story.aspectRatio)
  });

  if (templates.length === 0) {
    console.log(`No templates found for aspect ratio: ${story.aspectRatio}, trying to find any template`);

    // If no templates match the exact aspect ratio, try to find any template
    const allTemplates = await db.query.canvasTemplates.findMany();

    if (allTemplates.length === 0) {
      // Use sveltekit error helper
      throw error(404, `No templates found at all. Please create at least one template.`);
    }

    console.log(`Found ${allTemplates.length} templates with various aspect ratios`);
    return allTemplates[Math.floor(Math.random() * allTemplates.length)];
  }

  console.log(`Found ${templates.length} templates with aspect ratio: ${story.aspectRatio}`);
  // In a real implementation, we would use AI to select the best template
  // based on the context data
  return templates[Math.floor(Math.random() * templates.length)];
}

// Function to process canvas objects and generate images for placeholders
async function processCanvasObjects(objects: any[], clip: any, creative: any, persona: any, product: any) {
  console.log(`Starting to process ${objects.length} canvas objects`);

  // Ensure the uploads/gen directory exists
  const uploadDir = path.join('static', 'uploads', 'gen');
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    console.log(`Upload directory ${uploadDir} created or already exists`);
  } catch (err: any) {
    console.error('Error creating directory:', err);
    // Use sveltekit error helper
    throw error(500, `Failed to create upload directory: ${err.message}`);
  }

  // Process each object
  const updatedObjects = [];
  let placeholderCount = 0;
  let replacedCount = 0;

  for (const obj of objects) {
    // Check if this is a placeholder object and has a name property
    if (obj && obj.name && typeof obj.name === 'string' && obj.name.startsWith('placeholder?')) {
      placeholderCount++;
      console.log(`Found placeholder object: ${obj.name}`);
      console.log(`Placeholder dimensions: ${obj.width}x${obj.height}, position: ${obj.left},${obj.top}`);

      const placeholderParams = parsePlaceholder(obj.name);

      if (placeholderParams) {
        console.log(`Parsed placeholder parameters: ${JSON.stringify(placeholderParams)}`);

        // Generate a prompt based on the placeholder parameters and context
        const prompt = generatePromptForPlaceholder(
          placeholderParams,
          clip,
          creative,
          persona,
          product
        );
        console.log(`Generated prompt: ${prompt}`);

        // Generate an image for the placeholder
        const aspectRatio = placeholderParams.ratio || '1:1';
        console.log(`Using aspect ratio: ${aspectRatio}`);

        // Ensure generateImage exists and handles potential errors
        let imageUrl: string | null = null;
        try {
          // Assuming generateImage returns the URL or null/throws on error
          console.log(`Calling generateImage with prompt: ${prompt.substring(0, 50)}...`);
          imageUrl = await generateImage(prompt, clip.id, aspectRatio as '1:1' | '16:9' | '9:16');
          console.log(`Image generated successfully: ${imageUrl}`);
        } catch (genError: any) {
            console.error(`Image generation failed for placeholder ${obj.name}: ${genError.message}`);
            // Decide how to handle: skip, use default, or throw error
            // For now, we'll skip and keep the original object
            updatedObjects.push(obj);
            continue; // Move to the next object
        }

        if (imageUrl) {
          // Replace the placeholder with an image object
          console.log(`Creating image object from placeholder: ${obj.name}`);
          const imageObj = await createImageObject(obj, imageUrl);
          updatedObjects.push(imageObj);
          replacedCount++;
          console.log(`Placeholder ${obj.name} replaced with image object`);
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

  console.log(`Processing complete: Found ${placeholderCount} placeholders, replaced ${replacedCount} with images`);
  console.log(`Returning ${updatedObjects.length} objects total`);

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
async function createImageObject(placeholderObj: any, imageUrl: string) {
  placeholderObj.src = imageUrl;
  console.log(`Creating image object from placeholder: ${JSON.stringify(placeholderObj)}`);
  const response = await ky.get(`http://localhost:5173` + imageUrl);
  const imageArrayBuffer = await response.arrayBuffer();
  const imageBuffer = Buffer.from(imageArrayBuffer);
  const dimensions = sizeOf(imageBuffer);

  const currentWidth =
  placeholderObj.width * (placeholderObj.scaleX || 1);
  const currentHeight =
  placeholderObj.height * (placeholderObj.scaleY || 1);
  const newScaleX = currentWidth / dimensions.width;
  const newScaleY = currentHeight / dimensions.height;
  placeholderObj = {
    ...placeholderObj,
    width: dimensions.width,
    height: dimensions.height,
    scaleX: newScaleX,
    scaleY: newScaleY,
  }

  return placeholderObj;
}

// Note: The createImageObject function now preserves the width and height from the placeholder
// This ensures that generated images maintain the template's size constraints
// Previously, width and height were omitted, causing images to be displayed at their intrinsic size
// rather than respecting the template's dimensions

// Helper function to parse resolution string (e.g., "1920x1080 (...)" or "800x600")
function calculateDimensions(resolutionString: string | null): { width: number; height: number } {
  const defaultDims = { width: 800, height: 600 }; // Default fallback
  if (!resolutionString || typeof resolutionString !== 'string') {
    console.warn(`Invalid resolution string: ${resolutionString}. Defaulting to ${defaultDims.width}x${defaultDims.height}.`);
    return defaultDims;
  }

  // Regex to extract WxH from the start of the string
  const match = resolutionString.match(/^(\d+)\s*x\s*(\d+)/i);

  if (match && match[1] && match[2]) {
    const width = parseInt(match[1], 10);
    const height = parseInt(match[2], 10);

    if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
      return { width, height };
    }
  }

  console.warn(`Could not parse resolution: "${resolutionString}". Defaulting to ${defaultDims.width}x${defaultDims.height}.`);
  return defaultDims;
}
