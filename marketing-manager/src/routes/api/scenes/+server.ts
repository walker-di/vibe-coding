import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { scenes } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
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

  // Validate required fields
  validateRequiredFields(sceneData, ['storyId', 'orderIndex']);

  // Insert scene with proper error handling
  const [newScene] = await db.insert(scenes).values({
    storyId: sceneData.storyId,
    bgmUrl: sceneData.bgmUrl || null,
    bgmName: sceneData.bgmName || null,
    description: sceneData.description || null,
    orderIndex: sceneData.orderIndex,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning();

  return json(successResponse(newScene), { status: HttpStatus.CREATED });
});
