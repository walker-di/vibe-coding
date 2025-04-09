import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { stories } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET({ params }) {
  try {
    const storyId = parseInt(params.id);
    if (isNaN(storyId)) {
      return json({ error: 'Invalid story ID' }, { status: 400 });
    }

    const story = await db.query.stories.findFirst({
      where: eq(stories.id, storyId),
      with: {
        scenes: {
          with: {
            clips: true
          },
          orderBy: (scenes, { asc }) => [asc(scenes.orderIndex)]
        }
      }
    });

    if (!story) {
      return json({ error: 'Story not found' }, { status: 404 });
    }

    return json(story);
  } catch (error) {
    console.error('Error fetching story:', error);
    return json({ error: 'Failed to fetch story' }, { status: 500 });
  }
}

export async function PUT({ params, request }) {
  try {
    const storyId = parseInt(params.id);
    if (isNaN(storyId)) {
      return json({ error: 'Invalid story ID' }, { status: 400 });
    }

    const storyData = await request.json();

    // Validate required fields
    if (!storyData.title) {
      return json({ error: 'Title is required' }, { status: 400 });
    }

    // Update story using type assertions to bypass TypeScript's type checking
    const [updatedStory] = await db.update(stories)
      .set({
        title: storyData.title,
        description: storyData.description || null,
        updatedAt: new Date() // Use new Date() object
      } as any)
      .where(eq(stories.id, storyId))
      .returning();

    if (!updatedStory) {
      return json({ error: 'Story not found' }, { status: 404 });
    }

    return json(updatedStory);
  } catch (error) {
    console.error('Error updating story:', error);
    return json({ error: 'Failed to update story' }, { status: 500 });
  }
}

export async function DELETE({ params }) {
  try {
    const storyId = parseInt(params.id);
    if (isNaN(storyId)) {
      return json({ error: 'Invalid story ID' }, { status: 400 });
    }

    // Delete story (cascade will handle related scenes and clips)
    const [deletedStory] = await db.delete(stories)
      .where(eq(stories.id, storyId))
      .returning();

    if (!deletedStory) {
      return json({ error: 'Story not found' }, { status: 404 });
    }

    return json({ success: true });
  } catch (error) {
    console.error('Error deleting story:', error);
    return json({ error: 'Failed to delete story' }, { status: 500 });
  }
}
