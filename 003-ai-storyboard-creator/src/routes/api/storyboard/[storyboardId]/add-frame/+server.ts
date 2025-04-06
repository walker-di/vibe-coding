import { json, error } from '@sveltejs/kit';
// Use the standard relative path for $types
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db'; // Import db instance
import { storyboards, storyboardFrames } from '$lib/server/db/schema'; // Import schemas
import { generateStoryboardFrames } from '$lib/server/aiService'; // Import AI service
import { randomUUID } from 'crypto'; // For generating IDs
import type { AIGeneratedFrame } from '$lib/types/storyboard';
// Import necessary Drizzle functions, including 'and', 'gt'
import { eq, sql, max, and, gt } from 'drizzle-orm';
// error is imported from @sveltejs/kit

// This endpoint adds AI-generated frames OR inserts a single blank frame
export const POST: RequestHandler = async ({ request, params }) => {
  const storyboardId = params.storyboardId;
  if (!storyboardId) {
    throw error(400, 'Missing storyboardId parameter');
  }

  let requestData;
  try {
    requestData = await request.json();
    console.log(`Received data at /api/storyboard/${storyboardId}/add-frame:`, requestData);

    // --- Verify Storyboard Exists --- (Moved up for both cases)
    const storyboardExists = await db.select({ id: storyboards.id })
                                     .from(storyboards)
                                     .where(eq(storyboards.id, storyboardId))
                                     .limit(1);
    if (storyboardExists.length === 0) {
        throw error(404, `Storyboard with ID ${storyboardId} not found.`);
    }

    // --- Check if inserting a single blank frame ---
    if (requestData.insertAfterFrameId && typeof requestData.insertAfterFrameId === 'string') {
        const insertAfterFrameId: string = requestData.insertAfterFrameId;
        console.log(`Request to insert blank frame after frame ID: ${insertAfterFrameId}`);

        try {
            const result = await db.transaction(async (tx) => {
                // 1. Find the frameOrder of the frame to insert after
                const previousFrame = await tx.select({ frameOrder: storyboardFrames.frameOrder })
                                              .from(storyboardFrames)
                                              .where(and(
                                                  eq(storyboardFrames.storyboardId, storyboardId),
                                                  eq(storyboardFrames.id, insertAfterFrameId)
                                              ))
                                              .limit(1);

                if (previousFrame.length === 0) {
                    throw error(404, `Frame with ID ${insertAfterFrameId} not found in storyboard ${storyboardId}.`);
                }
                const targetOrder = previousFrame[0].frameOrder;
                const newFrameOrder = targetOrder + 1;

                // 2. Increment the frameOrder of all subsequent frames
                await tx.update(storyboardFrames)
                        .set({ frameOrder: sql`${storyboardFrames.frameOrder} + 1` })
                        .where(and(
                            eq(storyboardFrames.storyboardId, storyboardId),
                            gt(storyboardFrames.frameOrder, targetOrder)
                        ));

                // 3. Insert the new blank frame
                const newFrameId = randomUUID();
                await tx.insert(storyboardFrames).values({
                    id: newFrameId,
                    storyboardId: storyboardId,
                    frameOrder: newFrameOrder,
                    title: `New Frame ${newFrameOrder + 1}`, // Default title
                    // Provide empty strings for NOT NULL text fields
                    narration: '',
                    mainImagePrompt: '',
                    backgroundImagePrompt: '',
                    bgmPrompt: '',
                    // Null is okay for nullable URL fields
                    mainImageUrl: null,
                    backgroundImageUrl: null,
                    bgmUrl: null,
                    narrationAudioUrl: null,
                    transitionTypeAfter: 'none', // Default transition
                    transitionDurationAfter: 1.0,
                });

                console.log(`Inserted new blank frame with ID ${newFrameId} at order ${newFrameOrder}`);
                return { newFrameId, newFrameOrder };
            });

            return json({
                message: `Successfully inserted blank frame after frame ${insertAfterFrameId}.`,
                newFrameId: result.newFrameId,
                newFrameOrder: result.newFrameOrder
            }, { status: 201 });

        } catch (err: any) {
            console.error(`Error inserting blank frame after ${insertAfterFrameId}:`, err);
            // Handle specific Drizzle/DB errors if needed, otherwise rethrow kit errors or generic 500
            if (err.status) { // Re-throw kit errors
                 throw err;
            }
            throw error(500, `Internal Server Error inserting blank frame: ${err.message || 'Unknown DB error'}`);
        }

    }
    // --- Otherwise, proceed with AI generation logic ---
    else if (requestData.storyPrompt && typeof requestData.storyPrompt === 'string') {
        const storyPrompt: string = requestData.storyPrompt;
        const title: string | null = requestData.title || null; // Get optional title for the first frame
        console.log(`Request to generate frames using AI prompt: "${storyPrompt}"`);

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
          transitionTypeAfter: 'none', // Default transition
          transitionDurationAfter: 1.0,
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

    }
    // --- Handle invalid request data ---
    else {
        throw error(400, 'Invalid request body. Must include either "storyPrompt" (string) or "insertAfterFrameId" (string).');
    }

  } catch (err: any) {
    // Ensure the error logging is outside the duplicated block
    console.error(`Error processing request in /api/storyboard/${storyboardId}/add-frame:`, err);
    // Handle potential JSON parsing errors
    if (err instanceof SyntaxError && err.message.includes('JSON')) {
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
