import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateBackgroundMusic, generateMusicPrompt } from '$lib/server/aiService';
import { db } from '$lib/server/db';
import { bgmFiles } from '$lib/server/db/schema';
import { successResponse, HttpStatus, withErrorHandling } from '$lib/server/utils/api-utils';

// Define the expected type for the request body
type GenerateBgmRequestBody = {
  description?: string;
  prompt?: string;
  name?: string;
  duration?: number;
};

// This endpoint generates background music from a description or prompt
export const POST: RequestHandler = withErrorHandling(async ({ request }) => {
  // Parse the request body
  const body: GenerateBgmRequestBody = await request.json();
  const { description, prompt, name, duration } = body;

  // Validate duration (default to 30 seconds if not provided or invalid)
  const validDuration = duration && duration > 0 && duration <= 120 ? duration : 30;

  // We need either a description or a prompt
  if (!description && !prompt) {
    throw error(400, 'Missing required parameters: either description or prompt must be provided');
  }

  // Generate a unique identifier for this BGM
  const bgmId = Date.now().toString();

  try {
    // If we have a description but no prompt, generate a prompt first
    let musicPrompt = prompt;
    if (!musicPrompt && description) {
      console.log(`Generating music prompt from description: "${description.substring(0, 50)}..."`);
      try {
        musicPrompt = await generateMusicPrompt(description);

        if (!musicPrompt) {
          console.warn('Music prompt generation returned null, using description as fallback');
          musicPrompt = `${description} - jazz style, upbeat tempo, suitable for marketing video`;
        }
      } catch (promptErr) {
        console.error('Error generating music prompt:', promptErr);
        // Use the description as a fallback with some generic music terms
        musicPrompt = `${description} - jazz style, upbeat tempo, suitable for marketing video`;
      }
    }

    console.log(`Using music prompt: "${musicPrompt!.substring(0, 50)}..."`);

    // Generate the background music
    console.log(`Attempting to generate background music with prompt: "${musicPrompt!.substring(0, 50)}..." (Duration: ${validDuration}s)`);
    const audioUrl = await generateBackgroundMusic(musicPrompt!, bgmId, validDuration);

    if (!audioUrl) {
      console.error(`Background music generation failed for bgmId ${bgmId}`);
      throw error(500, 'Failed to generate background music. Please try again with a different description or check server logs.');
    }

    console.log(`Successfully generated background music: ${audioUrl}`);


    // Create a name for the BGM if not provided
    const bgmName = name || `Generated BGM ${new Date().toLocaleString()}`;

    // Save the BGM to the database
    const [newBgmFile] = await db.insert(bgmFiles).values({
      name: bgmName,
      description: description || musicPrompt || null,
      audioUrl: audioUrl,
      // Duration and fileSize will be updated later when the file is loaded
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    // Return the BGM information
    return json(successResponse({
      id: newBgmFile.id,
      name: newBgmFile.name,
      description: newBgmFile.description,
      audioUrl: newBgmFile.audioUrl,
      prompt: musicPrompt
    }), { status: HttpStatus.CREATED });
  } catch (err: any) {
    console.error('Error generating background music:', err);
    throw error(500, `Failed to generate background music: ${err.message || 'Unknown error'}`);
  }
});
