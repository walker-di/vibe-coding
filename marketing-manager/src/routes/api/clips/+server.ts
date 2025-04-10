import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { clips } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function POST({ request }) {
  try {
    const clipData = await request.json();

    // Validate required fields
    if (!clipData.sceneId) {
      return json({ error: 'Scene ID is required' }, { status: 400 });
    }
    if (!clipData.canvas) {
      return json({ error: 'Canvas data is required' }, { status: 400 });
    }
    if (clipData.orderIndex === undefined || clipData.orderIndex === null) {
      return json({ error: 'Order index is required' }, { status: 400 });
    }

    // Insert clip using type assertions to bypass TypeScript's type checking
    const [newClip] = await db.insert(clips).values({
      sceneId: clipData.sceneId as any,
      canvas: clipData.canvas,
      narration: clipData.narration || null,
      description: clipData.description || null,
      duration: clipData.duration || null,
      orderIndex: clipData.orderIndex,
      createdAt: new Date(), // Use new Date() object
      updatedAt: new Date()  // Use new Date() object
    } as any).returning();

    return json(newClip, { status: 201 });
  } catch (error) {
    console.error('Error creating clip:', error);
    return json({ error: 'Failed to create clip' }, { status: 500 });
  }
}
