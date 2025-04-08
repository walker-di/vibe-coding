import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { stories } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET({ params }) {
  try {
    const creativeId = parseInt(params.id);
    if (isNaN(creativeId)) {
      return json({ error: 'Invalid creative ID' }, { status: 400 });
    }

    const creativeStories = await db.query.stories.findMany({
      where: eq(stories.creativeId as any, creativeId),
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
  } catch (error) {
    console.error('Error fetching stories for creative:', error);
    return json({ error: 'Failed to fetch stories' }, { status: 500 });
  }
}
