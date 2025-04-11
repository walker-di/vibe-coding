import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateImage } from '$lib/server/aiService';

// Define the expected type for the request body
type GenerateImageRequestBody = {
  prompt: string;
  clipId: number;
  aspectRatio?: '1:1' | '16:9';
};

// This endpoint generates an image from a prompt
export const POST: RequestHandler = async ({ request }) => {
  try {
    // Parse the request body
    const body: GenerateImageRequestBody = await request.json();
    const { prompt, clipId, aspectRatio = '1:1' } = body;

    if (!prompt) {
      throw error(400, 'Missing prompt parameter');
    }

    if (!clipId) {
      throw error(400, 'Missing clipId parameter');
    }

    console.log(`Received request to generate image with prompt: ${prompt}`);

    // Call the image generation service
    const imageUrl = await generateImage(prompt, clipId, aspectRatio);

    if (!imageUrl) {
      throw error(500, 'Failed to generate image');
    }

    // Return the image URL
    return json({
      success: true,
      imageUrl
    });
  } catch (err: any) {
    console.error('Error generating image:', err);
    return json({
      success: false,
      message: err.message || 'An error occurred while generating the image'
    }, { status: err.status || 500 });
  }
};
