import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateNarrationAudio } from '$lib/server/aiService';

// Define the expected type for the request body
type GenerateNarrationTestRequestBody = {
  text: string;
  voiceName?: string;
};

// This endpoint generates narration audio from provided text for testing purposes,
// without requiring a real clipId or fetching text from the DB.
export const POST: RequestHandler = async ({ request }) => {
  try {
    // Parse the request body
    const body: GenerateNarrationTestRequestBody = await request.json();
    const { text, voiceName } = body; // voiceName is optional

    if (!text) {
      throw error(400, 'Missing text parameter');
    }

    // Generate a unique numeric ID for the test audio filename
    const testId = Date.now(); // Use timestamp as a unique number

    console.log(`Received TEST request to generate audio for text: "${text.substring(0, 50)}..."`);

    // Call the narration audio generation service with the provided text and test ID
    // The service uses this ID for the filename (e.g., clip-1678886400000-1678886401000.mp3)
    const narrationAudioUrl = await generateNarrationAudio(text, testId, voiceName);

    if (!narrationAudioUrl) {
      throw error(500, 'Failed to generate narration audio during test');
    }

    // Return the audio URL
    return json({
      success: true,
      narrationAudioUrl // e.g., /narration/clip-1678886400000-1678886401000.mp3
    });
  } catch (err: any) {
    console.error('Error generating test narration audio:', err);
    // Ensure we return a JSON response even for thrown errors
    const status = err.status || 500;
    const message = err.body?.message || err.message || 'An error occurred while generating the test narration audio';
    return json({
      success: false,
      message: message
    }, { status });
  }
};
