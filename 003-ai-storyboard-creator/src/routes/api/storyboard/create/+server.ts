import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db'; // Import db instance
import { storyboardFrames } from '$lib/server/db/schema'; // Import schema
import { generateStoryboardFrames } from '$lib/server/aiService'; // Import AI service
import { randomUUID } from 'crypto'; // For generating IDs
import type { AIGeneratedFrame } from '$lib/types/storyboard';

export const POST: RequestHandler = async ({ request }) => {
  let requestData;
  try {
    requestData = await request.json();
    console.log('Received data at /api/storyboard/create:', requestData);

    // Validate incoming data: expect 'storyPrompt' and optional 'title'
    if (!requestData.storyPrompt || typeof requestData.storyPrompt !== 'string') {
        throw error(400, 'Missing or invalid "storyPrompt" in request body');
    }
    const storyPrompt: string = requestData.storyPrompt;
    const title: string | null = requestData.title || null; // Get optional title

    // --- Call AI Service ---
    console.log(`Calling AI service with prompt: "${storyPrompt}"`);
    const generatedFrames: AIGeneratedFrame[] = await generateStoryboardFrames(storyPrompt);
    console.log(`AI service returned ${generatedFrames.length} frames.`);

    if (!generatedFrames || generatedFrames.length === 0) {
        throw error(500, 'AI failed to generate any storyboard frames.');
    }

    // --- Prepare Data for Database Insert ---
    const framesToInsert = generatedFrames.map((aiFrame, index) => ({
      id: randomUUID(), // Generate a unique ID for each frame
      // Use the provided title only for the first frame, or maybe add frame index?
      title: index === 0 ? title : (title ? `${title} - Frame ${index + 1}`: `Frame ${index + 1}`),
      // Map AI output to DB schema fields
      mainImagePrompt: aiFrame.mainImage,
      backgroundImagePrompt: aiFrame.backgroundImage,
      bgmPrompt: aiFrame.bgm,
      narration: aiFrame.narration,
      // Placeholders for actual URLs - these would be populated by separate image generation steps later
      mainImageUrl: null,
      backgroundImageUrl: null,
      bgmUrl: null,
      // createdAt will be set by the database default
    }));

    // --- Database Insert (Bulk) ---
    // Note: better-sqlite3 driver in Drizzle might not support returning() clause well.
    // We insert and assume success for now.
    await db.insert(storyboardFrames).values(framesToInsert);
    console.log(`Inserted ${framesToInsert.length} frames into DB.`);

    // --- Return Response ---
    // Return the number of frames created, or maybe the first frame?
    // Returning all frames might be too large. Let's return a success message.
    return json({
        message: `Successfully generated and saved ${framesToInsert.length} storyboard frames.`,
        frameCount: framesToInsert.length,
        // Optionally return IDs if needed by frontend for immediate update without full refresh
        // createdIds: framesToInsert.map(f => f.id)
    }, { status: 201 });

  } catch (err: any) {
    console.error('Error in /api/storyboard/create:', err);

    // Handle potential JSON parsing errors from request
    if (err instanceof SyntaxError) {
      return error(400, 'Invalid JSON in request body');
    }
    // Handle errors thrown from AI service or validation
    if (err.status) {
        return error(err.status, err.body?.message || 'API Error');
    }
    // Generic internal server error
    return error(500, 'Internal Server Error');
  }
};
