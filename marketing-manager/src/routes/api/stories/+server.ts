import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { stories } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const allStories = await db.query.stories.findMany({
      with: {
        scenes: {
          with: {
            clips: true
          }
        }
      },
      orderBy: (stories, { desc }) => [desc(stories.createdAt)]
    });

    return json(allStories);
  } catch (error) {
    console.error('Error fetching stories:', error);
    return json({ error: 'Failed to fetch stories' }, { status: 500 });
  }
}

export async function POST({ request }) {
  try {
    const storyData = await request.json();

    // Validate required fields
    if (!storyData.creativeId) {
      return json({ error: 'Creative ID is required' }, { status: 400 });
    }
    if (!storyData.title) {
      return json({ error: 'Title is required' }, { status: 400 });
    }

    // Insert story using the schema field names
    const [newStory] = await db.insert(stories).values({
      creativeId: storyData.creativeId as any,
      title: storyData.title,
      description: storyData.description || null,
      createdAt: new Date(), // Use new Date() object
      updatedAt: new Date()  // Use new Date() object
    } as any).returning();

    return json(newStory, { status: 201 });
  } catch (error) {
    console.error('Error creating story:', error);
    return json({ error: 'Failed to create story' }, { status: 500 });
  }
}
