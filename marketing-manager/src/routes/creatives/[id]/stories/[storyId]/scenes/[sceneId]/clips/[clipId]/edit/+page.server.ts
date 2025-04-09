import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { clips } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const creativeId = parseInt(params.id);
  const storyId = parseInt(params.storyId);
  const sceneId = parseInt(params.sceneId);
  const clipId = parseInt(params.clipId);

  if (isNaN(creativeId) || isNaN(storyId) || isNaN(sceneId) || isNaN(clipId)) {
    throw error(400, 'Invalid ID parameters');
  }

  try {
    // Fetch directly from DB on server or use server-side fetch if API logic is complex
    // Using DB directly is often simpler here
    const clip = await db.query.clips.findFirst({
      where: eq(clips.id, clipId),
    });

    // Alternative using server-side fetch (less direct, might re-use API logic)
    // const response = await fetch(`/api/clips/${clipId}`); // fetch here is server-side fetch
    // if (!response.ok) {
    //   if (response.status === 404) throw error(404, 'Clip not found');
    //   throw error(response.status, `Failed to fetch clip: ${await response.text()}`);
    // }
    // const clip = await response.json();

    if (!clip) {
      throw error(404, 'Clip not found');
    }

    // Return necessary data to the page component
    return {
      clip,
      creativeId,
      storyId,
      sceneId,
      clipId // Pass IDs too if needed directly in the page script
    };
  } catch (err: any) {
    console.error('Error loading clip for edit:', err);
    // Handle potential errors thrown by the error helper
    if (err.status && err.body) {
        throw err;
    }
    // Throw a generic error for other cases
    throw error(500, `Failed to load clip data: ${err.message || 'Unknown error'}`);
  }
};
