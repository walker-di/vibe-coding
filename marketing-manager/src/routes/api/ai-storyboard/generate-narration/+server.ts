import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateNarration } from '$lib/server/aiService';

// Define the expected type for the request body
type GenerateNarrationRequestBody = {
  description: string;
  clipId: number;
  voiceName?: string;
};

// This endpoint generates narration text and audio from a description
export const POST: RequestHandler = async ({ request }) => {
  try {
    // Parse the request body
    const body: GenerateNarrationRequestBody = await request.json();
    const { description, clipId, voiceName } = body;

    if (!description) {
      throw error(400, 'Missing description parameter');
    }

    if (!clipId) {
      throw error(400, 'Missing clipId parameter');
    }

    console.log(`Received request to generate narration for description: ${description}`);

    // Call the narration generation service
    const result = await generateNarration(description, clipId, voiceName);

    if (!result.narrationText) {
      throw error(500, 'Failed to generate narration text');
    }

    // Return the narration text and audio URL
    return json({
      success: true,
      narration: result.narrationText,
      narrationAudioUrl: result.narrationAudioUrl
    });
  } catch (err: any) {
    console.error('Error generating narration:', err);
    return json({
      success: false,
      message: err.message || 'An error occurred while generating the narration'
    }, { status: err.status || 500 });
  }
};
