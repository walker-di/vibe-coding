import type { RequestEvent } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { scenes } from '$lib/server/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import {
  successResponse,
  HttpStatus,
  validateRequiredFields,
  handleServerError,
  withErrorHandling
} from '$lib/server/utils/api-utils';

/**
 * POST handler for creating a new scene
 */
export const POST = withErrorHandling(async ({ request }: RequestEvent) => {
  const sceneData = await request.json();
  console.log('Received sceneData:', JSON.stringify(sceneData)); // Log received data

  // Validate required fields (removed orderIndex)
  validateRequiredFields(sceneData, ['storyId']);

  const storyId = sceneData.storyId;

  // If orderIndex is provided, use it; otherwise, calculate the next available index
  let newOrderIndex;
  if (sceneData.orderIndex !== undefined) {
    newOrderIndex = sceneData.orderIndex;
  } else {
    // Find the current maximum orderIndex for this story
    const maxOrderResult = await db
      .select({ maxOrder: sql<number>`max(${scenes.orderIndex})`.mapWith(Number) })
      .from(scenes)
      .where(eq(scenes.storyId, storyId));

    const maxOrderIndex = maxOrderResult[0]?.maxOrder ?? -1; // Default to -1 if no scenes exist
    newOrderIndex = maxOrderIndex + 1;
  }

  let newScene;
  try {
    // Insert scene with server-calculated orderIndex
    [newScene] = await db.insert(scenes).values({
      storyId: storyId,
      bgmUrl: sceneData.bgmUrl || null,
      bgmName: sceneData.bgmName || null,
      description: sceneData.description || null,
      orderIndex: newOrderIndex, // Use server-calculated index
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    if (!newScene) {
      throw error(HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to create scene: Insert operation returned no result.');
    }
  } catch (dbError: any) {
    // Check for unique constraint violation (error code might vary by DB)
    // Example for PostgreSQL: '23505'
    if (dbError.code === '23505' || (dbError.message && dbError.message.includes('UNIQUE constraint failed'))) {
      // Log the specific error for debugging
      console.error(`Database unique constraint violation: storyId=${storyId}, orderIndex=${newOrderIndex}`, dbError);
      throw error(HttpStatus.CONFLICT, `Scene with orderIndex ${newOrderIndex} already exists for this story. Please try again.`);
    }
    // Re-throw other database errors to be handled by withErrorHandling
    console.error('Database error during scene insert:', dbError);
    throw dbError; // Let withErrorHandling convert it to 500
  }

  return json(successResponse(newScene), { status: HttpStatus.CREATED });
});
