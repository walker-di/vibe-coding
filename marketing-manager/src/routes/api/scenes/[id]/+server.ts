import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { scenes } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import {
  successResponse,
  HttpStatus,
  validateId,
  validateRequiredFields,
  handleNotFoundError,
  handleServerError,
  withErrorHandling
} from '$lib/server/utils/api-utils';

/**
 * GET handler for retrieving a scene by ID
 */
export const GET = withErrorHandling(async ({ params }: RequestEvent) => {
  // Validate and parse the ID parameter
  const sceneId = validateId(params.id, 'scene ID');

  const scene = await db.query.scenes.findFirst({
    where: eq(scenes.id, sceneId),
    with: {
      clips: {
        orderBy: (clips, { asc }) => [asc(clips.orderIndex)]
      }
    }
  });

  if (!scene) {
    handleNotFoundError(`Scene with ID ${sceneId} not found`);
  }

  return json(successResponse(scene), { status: HttpStatus.OK });
});

/**
 * PUT handler for updating a scene by ID
 */
export const PUT = withErrorHandling(async ({ params, request }: RequestEvent) => {
  // Validate and parse the ID parameter
  const sceneId = validateId(params.id, 'scene ID');

  const sceneData = await request.json();

  // Validate required fields
  validateRequiredFields(sceneData, ['orderIndex']);

  // Update scene
  const [updatedScene] = await db.update(scenes)
    .set({
      bgmUrl: sceneData.bgmUrl || null,
      bgmName: sceneData.bgmName || null,
      description: sceneData.description || null,
      orderIndex: sceneData.orderIndex,
      updatedAt: new Date()
    })
    .where(eq(scenes.id, sceneId))
    .returning();

  if (!updatedScene) {
    handleNotFoundError(`Scene with ID ${sceneId} not found`);
  }

  return json(successResponse(updatedScene), { status: HttpStatus.OK });
});

/**
 * DELETE handler for removing a scene by ID
 */
export const DELETE = withErrorHandling(async ({ params }: RequestEvent) => {
  // Validate and parse the ID parameter
  const sceneId = validateId(params.id, 'scene ID');

  // Delete scene (cascade will handle related clips)
  const [deletedScene] = await db.delete(scenes)
    .where(eq(scenes.id, sceneId))
    .returning();

  if (!deletedScene) {
    handleNotFoundError(`Scene with ID ${sceneId} not found`);
  }

  return json(successResponse({ success: true }, 'Scene deleted successfully'), { status: HttpStatus.OK });
});
