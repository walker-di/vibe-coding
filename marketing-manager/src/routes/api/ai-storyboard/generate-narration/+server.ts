import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateNarrationAudio } from '$lib/server/aiService';
import { db } from '$lib/server/db';
import { clips } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// Define the expected type for the request body
type GenerateNarrationRequestBody = {
  clipId: number;
  voiceName?: string;
  narrationSpeed?: number;
};

// This endpoint generates narration audio from the existing narration text in the clip
export const POST: RequestHandler = async ({ request }) => {
  try {
    // Parse the request body
    const body: GenerateNarrationRequestBody = await request.json();
    const { clipId, voiceName, narrationSpeed } = body;

    if (!clipId) {
      throw error(400, 'Missing clipId parameter');
    }

    // Fetch the clip to get the narration text
    const clip = await db.query.clips.findFirst({
      where: eq(clips.id, clipId)
    });

    if (!clip) {
      throw error(404, `Clip with ID ${clipId} not found`);
    }

    if (!clip.narration) {
      throw error(400, 'Clip does not have narration text. Please add narration text first.');
    }

    console.log(`Received request to generate audio for narration: ${clip.narration}`);

    // Generate audio from the existing narration text
    const narrationAudioUrl = await generateNarrationAudio(clip.narration, clipId, voiceName, narrationSpeed);

    if (!narrationAudioUrl) {
      throw error(500, 'Failed to generate narration audio');
    }

    // Update the clip with the new narrationAudioUrl and voiceName
    await db.update(clips)
      .set({
        narrationAudioUrl: narrationAudioUrl,
        voiceName: voiceName || 'pt-BR-FranciscaNeural', // Store the voice used
        updatedAt: new Date()
      })
      .where(eq(clips.id, clipId));

    // Return the narration text and audio URL
    return json({
      success: true,
      narration: clip.narration,
      narrationAudioUrl: narrationAudioUrl
    });
  } catch (err: any) {
    console.error('Error generating narration audio:', err);
    return json({
      success: false,
      message: err.message || 'An error occurred while generating the narration audio'
    }, { status: err.status || 500 });
  }
};
