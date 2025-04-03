import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { storyboardFrames } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import type { StoryboardFrame } from '$lib/types/storyboard';

export const load: PageServerLoad = async () => {
  try {
    // Fetch frames directly from the database on the server
    const framesFromDb = await db.select().from(storyboardFrames).orderBy(desc(storyboardFrames.createdAt));

    console.log(`Fetched ${framesFromDb.length} frames from DB in +page.server.ts`);

    // Ensure dates are serializable (though they should be Date objects from Drizzle)
    // Map to the StoryboardFrame type for type safety, converting date if needed
    const frames: StoryboardFrame[] = framesFromDb.map(frame => ({
        ...frame,
        // Drizzle returns Date objects for timestamp_ms, no conversion needed for passing to page
        // createdAt: frame.createdAt ? frame.createdAt.toISOString() : undefined
    }));

    return {
      frames // Pass the fetched frames to the +page.svelte component
    };

  } catch (err: any) {
    console.error('Error fetching storyboard frames in +page.server.ts:', err);
    // Return an empty array or an error state to the page
    return {
        frames: [],
        error: 'Failed to load storyboard frames.'
    };
  }
};
