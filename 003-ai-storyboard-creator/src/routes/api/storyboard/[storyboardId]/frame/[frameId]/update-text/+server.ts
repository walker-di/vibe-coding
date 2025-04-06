import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { storyboardFrames } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Input validation schema
const UpdateTextSchema = z.object({
    narration: z.string().optional(),
    mainImagePrompt: z.string().optional(),
    backgroundImagePrompt: z.string().optional(),
    bgmPrompt: z.string().optional(),
});

export const POST: RequestHandler = async ({ request, params }) => {
    const { storyboardId, frameId } = params;

    if (!storyboardId || !frameId) {
        throw error(400, 'Missing storyboardId or frameId');
    }

    let requestData;
    try {
        const rawData = await request.json();
        requestData = UpdateTextSchema.parse(rawData);
        console.log(`Received update request for frame ${frameId} in storyboard ${storyboardId}:`, requestData);
    } catch (e) {
        console.error("Invalid request body:", e);
        throw error(400, 'Invalid request body');
    }

    try {
        // Construct the update object dynamically based on provided fields
        // Also handle setting URLs to null when prompts are cleared (set to "")
        const updateObject: Partial<typeof storyboardFrames.$inferInsert> = {};

        if (requestData.narration !== undefined) {
            updateObject.narration = requestData.narration;
        }
        if (requestData.mainImagePrompt !== undefined) {
            updateObject.mainImagePrompt = requestData.mainImagePrompt;
            // If prompt is cleared, also clear the URL
            if (requestData.mainImagePrompt === "") {
                updateObject.mainImageUrl = null;
            }
        }
        if (requestData.backgroundImagePrompt !== undefined) {
            updateObject.backgroundImagePrompt = requestData.backgroundImagePrompt;
            // If prompt is cleared, also clear the URL
            if (requestData.backgroundImagePrompt === "") {
                updateObject.backgroundImageUrl = null;
            }
        }
        if (requestData.bgmPrompt !== undefined) {
            updateObject.bgmPrompt = requestData.bgmPrompt;
            // If prompt is cleared, also clear the URL
            if (requestData.bgmPrompt === "") {
                updateObject.bgmUrl = null;
            }
        }


        // Check if there's anything to update
        if (Object.keys(updateObject).length === 0) {
            // Optionally return the current frame data or just a success message
             const currentFrame = await db.query.storyboardFrames.findFirst({
                where: eq(storyboardFrames.id, frameId),
             });
             if (!currentFrame) {
                 throw error(404, 'Frame not found');
             }
             console.log(`No changes detected for frame ${frameId}. Returning current data.`);
             return json({ message: 'No changes detected', updatedFrame: currentFrame });
        }

        console.log(`Updating frame ${frameId} with:`, updateObject);

        // Perform the update
        const updatedFrames = await db.update(storyboardFrames)
            .set(updateObject)
            .where(and(
                eq(storyboardFrames.id, frameId)
                // Optional: Add eq(storyboardFrames.storyboardId, storyboardId) if storyboardId is part of the frame schema
                // Currently, frameId is globally unique (UUID), so storyboardId check might be redundant but good for safety if schema changes
            ))
            .returning(); // Return the updated record(s)

        if (updatedFrames.length === 0) {
            throw error(404, 'Frame not found or update failed');
        }

        console.log(`Successfully updated frame ${frameId}.`);
        // Return the updated frame data
        return json({ message: 'Frame updated successfully', updatedFrame: updatedFrames[0] });

    } catch (err: any) {
        console.error(`Error updating frame ${frameId}:`, err);
        // Drizzle or other DB errors might occur here
        if (err.status) { // Re-throw SvelteKit errors
             throw err;
        }
        throw error(500, `Failed to update frame: ${err.message || 'Internal server error'}`);
    }
};
