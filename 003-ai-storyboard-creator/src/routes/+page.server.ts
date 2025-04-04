import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { storyboards } from '$lib/server/db/schema'; // Import the storyboards table schema
import { desc } from 'drizzle-orm';
// Remove unused StoryboardFrame type import
// import type { StoryboardFrame } from '$lib/types/storyboard';

export const load: PageServerLoad = async () => {
  try {
    // Fetch storyboards directly from the database on the server
    const storyboardList = await db.select({
        id: storyboards.id,
        name: storyboards.name,
        createdAt: storyboards.createdAt
      })
      .from(storyboards)
      .orderBy(desc(storyboards.createdAt));

    console.log(`Fetched ${storyboardList.length} storyboards from DB in +page.server.ts`);

    // Convert dates to ISO strings for consistent handling in the frontend component
    const storyboardsForPage = storyboardList.map(sb => ({
        ...sb,
        createdAt: sb.createdAt ? sb.createdAt.toISOString() : null
    }));


    return {
      storyboards: storyboardsForPage // Pass the fetched storyboards (with string dates) to the +page.svelte component
    };

  } catch (err: any) {
    console.error('Error fetching storyboards in +page.server.ts:', err);
    // Return an empty array or an error state to the page
    return {
        storyboards: [],
        error: 'Failed to load storyboards.'
    };
  }
};
