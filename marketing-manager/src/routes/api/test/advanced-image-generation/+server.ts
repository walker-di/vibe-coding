import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateImage } from '$lib/server/aiService';

// Define the expected type for the request body
type AdvancedImageGenerationRequestBody = {
  prompt: string;
  aspectRatio?: '1:1' | '16:9' | '9:16';
  additionalParams?: {
    quality?: number;
    safetyTolerance?: number;
    promptUpsampling?: boolean;
  };
};

// This endpoint generates an image from a prompt with advanced options
export const POST: RequestHandler = async ({ request }) => {
  try {
    // Parse the request body
    const body: AdvancedImageGenerationRequestBody = await request.json();
    const { prompt, aspectRatio = '1:1', additionalParams = {} } = body;

    if (!prompt) {
      throw error(400, 'Missing prompt parameter');
    }

    // Generate a unique numeric ID for the test image filename
    const testId = Date.now(); // Use timestamp as a unique number

    console.log(`Received ADVANCED TEST request to generate image with prompt: ${prompt}`);
    console.log(`Aspect ratio: ${aspectRatio}, Additional params:`, additionalParams);

    // Call the image generation service with the numeric test ID
    // The service uses this ID for the filename
    const imageUrl = await generateImage(prompt, testId, aspectRatio);

    if (!imageUrl) {
      throw error(500, 'Failed to generate image during test');
    }

    // Return the image URL and metadata
    return json({
      success: true,
      imageUrl,
      metadata: {
        prompt,
        aspectRatio,
        timestamp: new Date().toISOString(),
        additionalParams
      }
    });
  } catch (err: any) {
    console.error('Error generating test image:', err);
    // Ensure we return a JSON response even for thrown errors
    const status = err.status || 500;
    const message = err.body?.message || err.message || 'An error occurred while generating the test image';
    return json({
      success: false,
      message: message
    }, { status });
  }
};
