import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { scenes } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function POST({ request }) {
  try {
    const sceneData = await request.json();

    // Validate required fields
    if (!sceneData.storyId) {
      return json({ error: 'Story ID is required' }, { status: 400 });
    }
    if (sceneData.orderIndex === undefined || sceneData.orderIndex === null) {
      return json({ error: 'Order index is required' }, { status: 400 });
    }

    // Insert scene using type assertions to bypass TypeScript's type checking
    const [newScene] = await db.insert(scenes).values({
      storyId: sceneData.storyId as any,
      bgmUrl: sceneData.bgmUrl || null,
      bgmName: sceneData.bgmName || null,
      orderIndex: sceneData.orderIndex,
      createdAt: new Date(), // Use new Date() object
      updatedAt: new Date()  // Use new Date() object
    } as any).returning();

    return json(newScene, { status: 201 });
  } catch (error) {
    console.error('Error creating scene:', error);
    return json({ error: 'Failed to create scene' }, { status: 500 });
  }
}
