import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateImage } from '$lib/server/aiService';

export const GET: RequestHandler = async () => {
  try {
    // Generate a test image
    const prompt = 'A professional marketing image of a product on a white background';
    const testId = Date.now();
    const aspectRatio = '1:1';

    console.log(`Generating test image with prompt: ${prompt}`);
    
    try {
      const imageUrl = await generateImage(prompt, testId, aspectRatio);
      
      if (!imageUrl) {
        console.error('Image generation returned null');
        return json({
          success: false,
          error: 'Image generation returned null'
        });
      }
      
      console.log(`Image generated successfully: ${imageUrl}`);
      
      return json({
        success: true,
        imageUrl,
        message: 'Image generated successfully'
      });
    } catch (genError: any) {
      console.error('Error generating image:', genError);
      return json({
        success: false,
        error: `Error generating image: ${genError.message || 'Unknown error'}`
      });
    }
  } catch (error: any) {
    console.error('Error in test image generation endpoint:', error);
    return json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
};
