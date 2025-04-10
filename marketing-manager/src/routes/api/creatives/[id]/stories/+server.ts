import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { stories, creatives } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// GET /api/creatives/[id]/stories
export const GET: RequestHandler = async ({ params }) => {
  try {
    const creativeId = parseInt(params.id);
    if (isNaN(creativeId)) {
      throw error(400, 'Invalid creative ID');
    }

    // Check if creative exists
    const creative = await db.query.creatives.findFirst({
      where: eq(creatives.id, creativeId),
      columns: { id: true }
    });

    if (!creative) {
      throw error(404, 'Creative not found');
    }

    const creativeStories = await db.query.stories.findMany({
      where: eq(stories.creativeId, creativeId),
      with: {
        scenes: {
          with: {
            clips: true
          },
          orderBy: (scenes, { asc }) => [asc(scenes.orderIndex)]
        }
      },
      orderBy: (stories, { desc }) => [desc(stories.createdAt)]
    });

    return json(creativeStories);
  } catch (err) {
    console.error('Error fetching stories for creative:', err);
    // Check if it's an error thrown by SvelteKit's error() helper
    if (err.status && err.body) {
      throw err; // Re-throw SvelteKit errors
    }
    throw error(500, 'Failed to fetch stories');
  }
};
