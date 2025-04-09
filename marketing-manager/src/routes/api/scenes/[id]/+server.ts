import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { scenes } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET({ params }) {
  try {
    const sceneId = parseInt(params.id);
    if (isNaN(sceneId)) {
      return json({ error: 'Invalid scene ID' }, { status: 400 });
    }

    const scene = await db.query.scenes.findFirst({
      where: eq(scenes.id, sceneId),
      with: {
        clips: {
          orderBy: (clips, { asc }) => [asc(clips.orderIndex)]
        }
      }
    });

    if (!scene) {
      return json({ error: 'Scene not found' }, { status: 404 });
    }

    return json(scene);
  } catch (error) {
    console.error('Error fetching scene:', error);
    return json({ error: 'Failed to fetch scene' }, { status: 500 });
  }
}

export async function PUT({ params, request }) {
  try {
    const sceneId = parseInt(params.id);
    if (isNaN(sceneId)) {
      return json({ error: 'Invalid scene ID' }, { status: 400 });
    }

    const sceneData = await request.json();

    // Validate required fields
    if (sceneData.orderIndex === undefined || sceneData.orderIndex === null) {
      return json({ error: 'Order index is required' }, { status: 400 });
    }

    // Update scene using type assertions to bypass TypeScript's type checking
    const [updatedScene] = await db.update(scenes)
      .set({
        bgmUrl: sceneData.bgmUrl || null,
        bgmName: sceneData.bgmName || null,
        orderIndex: sceneData.orderIndex,
        updatedAt: new Date() // Use new Date() object
      } as any)
      .where(eq(scenes.id, sceneId))
      .returning();

    if (!updatedScene) {
      return json({ error: 'Scene not found' }, { status: 404 });
    }

    return json(updatedScene);
  } catch (error) {
    console.error('Error updating scene:', error);
    return json({ error: 'Failed to update scene' }, { status: 500 });
  }
}

export async function DELETE({ params }) {
  try {
    const sceneId = parseInt(params.id);
    if (isNaN(sceneId)) {
      return json({ error: 'Invalid scene ID' }, { status: 400 });
    }

    // Delete scene (cascade will handle related clips)
    const [deletedScene] = await db.delete(scenes)
      .where(eq(scenes.id, sceneId))
      .returning();

    if (!deletedScene) {
      return json({ error: 'Scene not found' }, { status: 404 });
    }

    return json({ success: true });
  } catch (error) {
    console.error('Error deleting scene:', error);
    return json({ error: 'Failed to delete scene' }, { status: 500 });
  }
}
