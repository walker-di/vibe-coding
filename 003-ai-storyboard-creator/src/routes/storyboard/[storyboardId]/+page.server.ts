import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { storyboards, storyboardFrames } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import { error } from '@sveltejs/kit'; // Import error helper

export const load: PageServerLoad = async ({ params, depends }) => { // Add depends here
  const storyboardId = params.storyboardId;

  // Declare dependency on a custom identifier for this storyboard's frames
  depends(`app:storyboard-frames:${storyboardId}`);

  if (!storyboardId) {
    throw error(400, 'Storyboard ID parameter is missing.');
  }

  try {
    // Fetch the specific storyboard details
    const storyboardResult = await db.select()
                                     .from(storyboards)
                                     .where(eq(storyboards.id, storyboardId))
                                     .limit(1);

    const storyboard = storyboardResult[0];

    if (!storyboard) {
      throw error(404, `Storyboard with ID ${storyboardId} not found.`);
    }

    // Fetch the frames associated with this storyboard, ordered by frameOrder
    const frames = await db.select()
                           .from(storyboardFrames)
                           .where(eq(storyboardFrames.storyboardId, storyboardId))
                           .orderBy(asc(storyboardFrames.frameOrder)); // Order by frameOrder

    console.log(`Fetched storyboard ${storyboardId} and ${frames.length} frames in +page.server.ts`);

    // Dates are Date objects, SvelteKit handles serialization

    return {
      storyboard: storyboard, // Pass the specific storyboard data
      frames: frames          // Pass the associated frames
    };

  } catch (err: any) {
    console.error(`Error fetching data for storyboard ${storyboardId} in +page.server.ts:`, err);

    // Re-throw kit errors, otherwise return a generic error state
    if (err.status) {
        throw err;
    }

    // Return an error state to the page
    return {
        storyboard: null,
        frames: [],
        error: `Failed to load storyboard data for ID ${storyboardId}.`
    };
  }
};
