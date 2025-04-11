import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateImage } from '$lib/server/aiService';

// Define the expected type for the request body
type GenerateImageTestRequestBody = {
  prompt: string;
  aspectRatio?: '1:1' | '16:9';
};

// This endpoint generates an image from a prompt for testing purposes,
// without requiring a real clipId.
export const POST: RequestHandler = async ({ request }) => {
  try {
    // Parse the request body
    const body: GenerateImageTestRequestBody = await request.json();
    const { prompt, aspectRatio = '1:1' } = body;

    if (!prompt) {
      throw error(400, 'Missing prompt parameter');
    }

    // Generate a unique numeric ID for the test image filename
    const testId = Date.now(); // Use timestamp as a unique number

    console.log(`Received TEST request to generate image with prompt: ${prompt}`);

    // Call the image generation service with the numeric test ID
    // The service uses this ID for the filename (e.g., clip-1678886400000.png)
    const imageUrl = await generateImage(prompt, testId, aspectRatio);

    if (!imageUrl) {
      throw error(500, 'Failed to generate image during test');
    }

    // Return the image URL
    return json({
      success: true,
      imageUrl // e.g., /clip-previews/clip-1678886400000.png
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
