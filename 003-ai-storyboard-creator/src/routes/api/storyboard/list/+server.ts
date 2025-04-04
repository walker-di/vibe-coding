import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { storyboards } from '$lib/server/db/schema'; // Import the storyboards table schema
import { desc } from 'drizzle-orm';

export const GET: RequestHandler = async () => {
  try {
    // Fetch all storyboards from the database, ordered by creation date descending
    const storyboardList = await db.select({
        id: storyboards.id,
        name: storyboards.name,
        createdAt: storyboards.createdAt // Keep createdAt for potential sorting/display
      })
      .from(storyboards)
      .orderBy(desc(storyboards.createdAt));

    console.log(`Fetched ${storyboardList.length} storyboards from DB.`);

    // Ensure dates are sent in a JSON-compatible format (ISO string) if needed by frontend
    // For just listing, maybe not needed, but good practice if date is shown
    const storyboardsForJson = storyboardList.map(sb => ({
        ...sb,
        createdAt: sb.createdAt ? sb.createdAt.toISOString() : null
    }));

    return json(storyboardsForJson);

  } catch (err: any) {
    console.error('Error fetching storyboards:', err);
    return error(500, 'Internal Server Error');
  }
};
