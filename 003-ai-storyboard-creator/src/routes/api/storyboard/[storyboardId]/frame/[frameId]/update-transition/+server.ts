import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { storyboardFrames } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod'; // For input validation

// Define the expected input schema
const transitionUpdateSchema = z.object({
    transitionType: z.string().min(1), // Add more specific validation if needed (e.g., enum)
    transitionDuration: z.number().min(0.1).max(10), // Example range
});

export const POST: RequestHandler = async ({ request, params }) => {
    const { storyboardId, frameId } = params;

    // Validate input
    let updateData: { transitionType: string; transitionDuration: number };
    try {
        const body = await request.json();
        updateData = transitionUpdateSchema.parse(body);
    } catch (err) {
        if (err instanceof z.ZodError) {
            console.error('Invalid transition update request:', err.flatten());
            throw error(400, `Invalid request body: ${err.flatten().fieldErrors}`);
        }
        console.error('Error parsing request body:', err);
        throw error(400, 'Invalid request body.');
    }

    console.log(`Updating transition for frame ${frameId} in storyboard ${storyboardId}:`, updateData);

    try {
        // Update the specific frame in the database
        // Ensure the frame belongs to the correct storyboard for security/data integrity
        const result = await db.update(storyboardFrames)
            .set({
                transitionTypeAfter: updateData.transitionType,
                transitionDurationAfter: updateData.transitionDuration,
            })
            .where(and(
                eq(storyboardFrames.id, frameId),
                eq(storyboardFrames.storyboardId, storyboardId) // Important check
            ))
            .returning({ updatedId: storyboardFrames.id }); // Return something to confirm update

        if (result.length === 0) {
            // This means either the frameId or storyboardId didn't match, or the frame doesn't exist
            console.warn(`Frame ${frameId} not found or does not belong to storyboard ${storyboardId}.`);
            throw error(404, `Frame with ID ${frameId} not found in storyboard ${storyboardId}.`);
        }

        console.log(`Successfully updated transition for frame ${frameId}.`);
        return json({ success: true, updatedFrameId: result[0].updatedId });

    } catch (err: any) {
        // Handle potential database errors or not found errors
        console.error(`Failed to update transition for frame ${frameId}:`, err);
        // Re-throw SvelteKit errors
        if (err.status && typeof err.status === 'number') {
            throw err;
        }
        // Throw a generic server error for other issues
        throw error(500, `Failed to update transition settings: ${err.message}`);
    }
};
