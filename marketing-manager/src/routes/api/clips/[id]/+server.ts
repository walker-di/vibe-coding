import { json, error, type RequestEvent } from '@sveltejs/kit'; // Import error and RequestEvent
import { db } from '$lib/server/db';
import { clips } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET({ params }: RequestEvent) { // Add type
  try {
    if (!params.id) {
      throw error(400, 'Clip ID parameter is missing');
    }
    const clipId = parseInt(params.id);
    if (isNaN(clipId)) {
      throw error(400, 'Invalid clip ID format'); // Use error helper
    }

    const clip = await db.query.clips.findFirst({
      where: eq(clips.id, clipId)
    });

    if (!clip) {
      return json({ error: 'Clip not found' }, { status: 404 });
    }

    return json(clip);
  // Removed redundant catch block here
  } catch (err: any) { // This is the correct catch block location
    console.error('Error fetching clip:', err);
    // Check if it's an error thrown by SvelteKit's error() helper
    if (err.status && err.body) {
      throw err; // Re-throw SvelteKit errors
    }
    throw error(500, `Failed to fetch clip: ${err.message || 'Unknown error'}`); // Use error helper
  }
}

export async function PUT({ params, request }: RequestEvent) { // Add type
  try {
    if (!params.id) {
      throw error(400, 'Clip ID parameter is missing');
    }
    const clipId = parseInt(params.id);
    if (isNaN(clipId)) {
      throw error(400, 'Invalid clip ID format'); // Use error helper
    }

    const clipData = await request.json();

    // Build the update object dynamically based on provided fields
    const updateData: Partial<typeof clips.$inferInsert> = {
        updatedAt: new Date()
    };

    if (clipData.canvas !== undefined) {
        updateData.canvas = clipData.canvas;
    }
    if (clipData.narration !== undefined) {
        // Allow setting narration to null or empty string
        updateData.narration = clipData.narration;
    }
    if (clipData.orderIndex !== undefined && clipData.orderIndex !== null) {
         if (typeof clipData.orderIndex !== 'number' || clipData.orderIndex < 0) {
            throw error(400, 'Invalid order index format');
         }
        updateData.orderIndex = clipData.orderIndex;
    }
     if (clipData.imageUrl !== undefined) {
        // Allow setting imageUrl to null or a string
        if (clipData.imageUrl !== null && typeof clipData.imageUrl !== 'string') {
             throw error(400, 'Invalid imageUrl format');
        }
        updateData.imageUrl = clipData.imageUrl;
    }

    // Ensure at least one field is being updated besides updatedAt
    if (Object.keys(updateData).length <= 1) {
         throw error(400, 'No valid fields provided for update.');
    }

    // Perform the update with dynamically built data
    const [updatedClip] = await db.update(clips)
      .set(updateData)
      .where(eq(clips.id, clipId))
      .returning();

    if (!updatedClip) {
      console.error(`clips API: Clip ${clipId} not found for update`);
      throw error(404, 'Clip not found'); // Use error helper
    }

    return json(updatedClip);
  } catch (err: any) { // Add type
    console.error('Error updating clip:', err);
    // Check if it's an error thrown by SvelteKit's error() helper
    if (err.status && err.body) {
      throw err; // Re-throw SvelteKit errors
    }
    throw error(500, `Failed to update clip: ${err.message || 'Unknown error'}`); // Use error helper
  }
}

export async function DELETE({ params }: RequestEvent) { // Add type
  try {
    if (!params.id) {
      throw error(400, 'Clip ID parameter is missing');
    }
    const clipId = parseInt(params.id);
    if (isNaN(clipId)) {
      throw error(400, 'Invalid clip ID format'); // Use error helper
    }

    // Delete clip
    const [deletedClip] = await db.delete(clips)
      .where(eq(clips.id, clipId))
      .returning();

    if (!deletedClip) {
      throw error(404, 'Clip not found'); // Use error helper
    }

    return json({ success: true });
  } catch (err: any) { // Add type
    console.error('Error deleting clip:', err);
    // Check if it's an error thrown by SvelteKit's error() helper
    if (err.status && err.body) {
      throw err; // Re-throw SvelteKit errors
    }
    throw error(500, `Failed to delete clip: ${err.message || 'Unknown error'}`); // Use error helper
  }
}
