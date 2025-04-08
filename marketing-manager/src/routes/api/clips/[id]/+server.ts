import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { clips } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET({ params }) {
  try {
    const clipId = parseInt(params.id);
    if (isNaN(clipId)) {
      return json({ error: 'Invalid clip ID' }, { status: 400 });
    }

    const clip = await db.query.clips.findFirst({
      where: eq(clips.id, clipId)
    });

    if (!clip) {
      return json({ error: 'Clip not found' }, { status: 404 });
    }

    return json(clip);
  } catch (error) {
    console.error('Error fetching clip:', error);
    return json({ error: 'Failed to fetch clip' }, { status: 500 });
  }
}

export async function PUT({ params, request }) {
  try {
    const clipId = parseInt(params.id);
    if (isNaN(clipId)) {
      return json({ error: 'Invalid clip ID' }, { status: 400 });
    }

    const clipData = await request.json();

    // Validate required fields
    if (!clipData.canvas) {
      return json({ error: 'Canvas data is required' }, { status: 400 });
    }
    if (clipData.orderIndex === undefined || clipData.orderIndex === null) {
      return json({ error: 'Order index is required' }, { status: 400 });
    }

    // Update clip using type assertions to bypass TypeScript's type checking
    const [updatedClip] = await db.update(clips)
      .set({
        canvas: clipData.canvas,
        narration: clipData.narration || null,
        orderIndex: clipData.orderIndex,
        updatedAt: Date.now()
      } as any)
      .where(eq(clips.id, clipId))
      .returning();

    if (!updatedClip) {
      return json({ error: 'Clip not found' }, { status: 404 });
    }

    return json(updatedClip);
  } catch (error) {
    console.error('Error updating clip:', error);
    return json({ error: 'Failed to update clip' }, { status: 500 });
  }
}

export async function DELETE({ params }) {
  try {
    const clipId = parseInt(params.id);
    if (isNaN(clipId)) {
      return json({ error: 'Invalid clip ID' }, { status: 400 });
    }

    // Delete clip
    const [deletedClip] = await db.delete(clips)
      .where(eq(clips.id, clipId))
      .returning();

    if (!deletedClip) {
      return json({ error: 'Clip not found' }, { status: 404 });
    }

    return json({ success: true });
  } catch (error) {
    console.error('Error deleting clip:', error);
    return json({ error: 'Failed to delete clip' }, { status: 500 });
  }
}
