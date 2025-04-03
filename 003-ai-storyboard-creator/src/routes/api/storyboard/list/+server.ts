import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { storyboardFrames } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';

export const GET: RequestHandler = async () => {
  try {
    // Fetch all storyboard frames from the database, ordered by creation date descending
    const frames = await db.select().from(storyboardFrames).orderBy(desc(storyboardFrames.createdAt));

    console.log(`Fetched ${frames.length} frames from DB.`);

    // Ensure dates are sent in a JSON-compatible format (ISO string)
    const framesForJson = frames.map(frame => ({
        ...frame,
        createdAt: frame.createdAt ? frame.createdAt.toISOString() : null // Handle potential null dates if schema changes
    }));


    return json(framesForJson);

  } catch (err: any) {
    console.error('Error fetching storyboard frames:', err);
    return error(500, 'Internal Server Error');
  }
};
