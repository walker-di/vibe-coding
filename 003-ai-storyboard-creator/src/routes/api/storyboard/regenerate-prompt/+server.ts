import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { regeneratePrompt as aiRegeneratePrompt } from '$lib/server/aiService';
import { db } from '$lib/server/db'; // Import db
import { storyboardFrames } from '$lib/server/db/schema'; // Import schema
import { eq, asc } from 'drizzle-orm'; // Import eq and asc

// Input validation schema
const RegeneratePromptSchema = z.object({
    originalPrompt: z.string(), // Allow empty string for original prompt
    instructions: z.string(), // Allow empty string for instructions
    assetType: z.enum(['narration', 'mainImage', 'backgroundImage', 'bgm']), // Add narration and bgm
    storyboardId: z.string().uuid('Invalid Storyboard ID format'), // Add storyboardId
    frameId: z.string().uuid('Invalid Frame ID format'), // Add frameId (though not strictly needed for context fetching, good practice)
});

export const POST: RequestHandler = async ({ request }) => {
    let requestData;
    try {
        const rawData = await request.json();
        requestData = RegeneratePromptSchema.parse(rawData);
        console.log('Received prompt regeneration request:', requestData);
    } catch (e) {
        console.error("Invalid request body for prompt regeneration:", e);
        if (e instanceof z.ZodError) {
             throw error(400, `Invalid request body: ${e.errors.map(err => `${err.path.join('.')} - ${err.message}`).join(', ')}`);
        }
        throw error(400, 'Invalid request body');
    }

    try {
        // Fetch all frames for context
        const allFrames = await db.query.storyboardFrames.findMany({
            where: eq(storyboardFrames.storyboardId, requestData.storyboardId),
            orderBy: [asc(storyboardFrames.frameOrder)], // Use frameOrder
            columns: { // Only fetch necessary columns for context
                narration: true,
                // Potentially add other prompts later if needed and context allows
                // mainImagePrompt: true,
                // backgroundImagePrompt: true,
                // bgmPrompt: true,
            }
        });

        if (!allFrames || allFrames.length === 0) {
            // Should not happen if the frame exists, but good practice
            throw error(404, 'Storyboard not found or has no frames.');
        }

        // Format the context (start with narrations)
        const storyContext = allFrames
            .map((frame, index) => `Frame ${index + 1} Narration: ${frame.narration || '(No narration)'}`)
            .join('\n\n');

        console.log(`Using story context for regeneration (length: ${storyContext.length}):\n${storyContext.substring(0, 200)}...`);

        // Call the AI service function, now including context
        const newPrompt = await aiRegeneratePrompt(
            requestData.originalPrompt,
            requestData.instructions,
            storyContext // Pass the formatted context
            // requestData.assetType // Pass assetType if needed
        );

        if (!newPrompt) {
            throw new Error('AI service failed to return a new prompt.');
        }

        console.log('Successfully regenerated prompt:', newPrompt);
        return json({ newPrompt: newPrompt });

    } catch (err: any) {
        console.error('Error during prompt regeneration:', err);
        // Handle specific AI service errors if possible, otherwise generic error
        throw error(500, `Failed to regenerate prompt: ${err.message || 'Internal server error'}`);
    }
};
