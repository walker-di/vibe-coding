import { json, error } from '@sveltejs/kit';
// Use the standard relative path for $types
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db'; // Import db instance
import { storyboards, storyboardFrames } from '$lib/server/db/schema'; // Import schemas
import { generateStoryboardFrames } from '$lib/server/aiService'; // Import AI service
import { randomUUID } from 'crypto'; // For generating IDs
import type { AIGeneratedFrame } from '$lib/types/storyboard';
import { eq, sql, max } from 'drizzle-orm'; // Import necessary Drizzle functions

// This endpoint adds AI-generated frames to a specific storyboard
export const POST: RequestHandler = async ({ request, params }) => {
  const storyboardId = params.storyboardId;
  if (!storyboardId) {
    throw error(400, 'Missing storyboardId parameter');
  }

  let requestData;
  try {
    requestData = await request.json();
    console.log(`Received data at /api/storyboard/${storyboardId}/add-frame:`, requestData);

    // Validate incoming data: expect 'storyPrompt' and optional 'title'
    if (!requestData.storyPrompt || typeof requestData.storyPrompt !== 'string') {
        throw error(400, 'Missing or invalid "storyPrompt" in request body');
    }
    const storyPrompt: string = requestData.storyPrompt;
    const title: string | null = requestData.title || null; // Get optional title for the first frame

    // --- Verify Storyboard Exists ---
    const storyboardExists = await db.select({ id: storyboards.id })
                                     .from(storyboards)
                                     .where(eq(storyboards.id, storyboardId))
                                     .limit(1);
    if (storyboardExists.length === 0) {
        throw error(404, `Storyboard with ID ${storyboardId} not found.`);
    }

    // --- Call AI Service ---
    console.log(`Calling AI service for storyboard ${storyboardId} with prompt: "${storyPrompt}"`);
    const generatedFrames: AIGeneratedFrame[] = await generateStoryboardFrames(storyPrompt);
    console.log(`AI service returned ${generatedFrames.length} frames.`);

    if (!generatedFrames || generatedFrames.length === 0) {
        throw error(500, 'AI failed to generate any storyboard frames.');
    }

    // --- Determine Starting Frame Order ---
    // Find the current maximum frameOrder for this storyboard
    const maxOrderResult = await db.select({ value: max(storyboardFrames.frameOrder) })
                                   .from(storyboardFrames)
                                   .where(eq(storyboardFrames.storyboardId, storyboardId));
    const currentMaxOrder = maxOrderResult[0]?.value ?? -1; // Start at 0 if no frames exist
    const startingOrder = currentMaxOrder + 1;

    // --- Prepare Data for Database Insert ---
    const framesToInsert = generatedFrames.map((aiFrame, index) => ({
      id: randomUUID(), // Generate a unique ID for each frame
      storyboardId: storyboardId, // Link to the parent storyboard
      frameOrder: startingOrder + index, // Assign sequential order
      // Use the provided title only for the first frame, or maybe add frame index?
      title: index === 0 ? title : (title ? `${title} - Frame ${index + 1}`: `Frame ${startingOrder + index + 1}`),
      // Map AI output to DB schema fields
      mainImagePrompt: aiFrame.mainImage,
      backgroundImagePrompt: aiFrame.backgroundImage,
      bgmPrompt: aiFrame.bgm,
      narration: aiFrame.narration,
      // Placeholders for actual URLs - these would be populated by separate image generation steps later
      mainImageUrl: null,
      backgroundImageUrl: null,
      bgmUrl: null,
      narrationAudioUrl: null, // Ensure this is included
      // createdAt will be set by the database default
    }));

    // --- Database Insert (Bulk) ---
    await db.insert(storyboardFrames).values(framesToInsert);
    console.log(`Inserted ${framesToInsert.length} frames into DB for storyboard ${storyboardId}.`);

    // --- Return Response ---
    // Optionally trigger asset generation for the new frames here, or let the frontend do it.
    // For now, just return success.
    return json({
        message: `Successfully generated and saved ${framesToInsert.length} storyboard frames for storyboard ${storyboardId}.`,
        frameCount: framesToInsert.length,
        // Optionally return IDs if needed by frontend
        createdFrameIds: framesToInsert.map(f => f.id)
    }, { status: 201 });

  } catch (err: any) {
    console.error(`Error in /api/storyboard/${storyboardId}/add-frame:`, err);

    // Handle potential JSON parsing errors from request
    if (err instanceof SyntaxError) {
      return error(400, 'Invalid JSON in request body');
    }
    // Handle errors thrown from AI service or validation
    if (err.status) {
        return error(err.status, err.body?.message || 'API Error');
    }
    // Generic internal server error
    return error(500, 'Internal Server Error adding frames');
  }
};
