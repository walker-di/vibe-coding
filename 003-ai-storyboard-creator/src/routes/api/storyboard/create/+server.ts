import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db'; // Import db instance
import { storyboards } from '$lib/server/db/schema'; // Import storyboards schema
import { randomUUID } from 'crypto'; // For generating IDs

// This endpoint now creates a new storyboard entry, not frames.
export const POST: RequestHandler = async ({ request }) => {
  let requestData;
  try {
    requestData = await request.json();
    console.log('Received data at /api/storyboard/create:', requestData);

    // Validate incoming data: expect optional 'name'
    const name: string = (requestData.name && typeof requestData.name === 'string')
      ? requestData.name
      : 'Untitled Storyboard'; // Use default if name is missing or invalid

    // --- Prepare Data for Database Insert ---
    const newStoryboardId = randomUUID();
    const storyboardToInsert = {
      id: newStoryboardId,
      name: name,
      // createdAt will be set by the database default
    };

    // --- Database Insert ---
    await db.insert(storyboards).values(storyboardToInsert);
    console.log(`Inserted new storyboard with ID: ${newStoryboardId} and name: "${name}"`);

    // --- Return Response ---
    // Return the ID of the newly created storyboard
    return json({
        message: `Successfully created storyboard "${name}".`,
        storyboardId: newStoryboardId
    }, { status: 201 });

  } catch (err: any) {
    console.error('Error in /api/storyboard/create:', err);

    // Handle potential JSON parsing errors from request
    if (err instanceof SyntaxError) {
      return error(400, 'Invalid JSON in request body');
    }
    // Handle errors thrown during DB insert or validation
    if (err.status) { // Re-throw kit errors
        return error(err.status, err.body?.message || 'API Error');
    }
    // Generic internal server error
    return error(500, 'Internal Server Error creating storyboard');
  }
};
