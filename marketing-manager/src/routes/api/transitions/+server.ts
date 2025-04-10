import type { RequestEvent } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { sceneTransitions, scenes } from '$lib/server/db/schema';
import { eq, and, or, inArray } from 'drizzle-orm';
import {
  successResponse,
  HttpStatus,
  validateRequiredFields,
  handleServerError,
  withErrorHandling
} from '$lib/server/utils/api-utils';

/**
 * GET handler for retrieving all transitions
 */
export const GET = withErrorHandling(async ({ url }: RequestEvent) => {
  // Check if we're filtering by fromSceneId, toSceneId, or storyId
  const fromSceneId = url.searchParams.get('fromSceneId');
  const toSceneId = url.searchParams.get('toSceneId');
  const storyId = url.searchParams.get('storyId');

  let query = db.select().from(sceneTransitions);

  if (fromSceneId && toSceneId) {
    // Get a specific transition between two scenes
    query = query.where(
      and(
        eq(sceneTransitions.fromSceneId, parseInt(fromSceneId)),
        eq(sceneTransitions.toSceneId, parseInt(toSceneId))
      )
    );
  } else if (fromSceneId) {
    // Get all transitions from a specific scene
    query = query.where(eq(sceneTransitions.fromSceneId, parseInt(fromSceneId)));
  } else if (toSceneId) {
    // Get all transitions to a specific scene
    query = query.where(eq(sceneTransitions.toSceneId, parseInt(toSceneId)));
  } else if (storyId) {
    // Get all transitions for a specific story
    // We need to find transitions where either fromSceneId or toSceneId belongs to the story
    const parsedStoryId = parseInt(storyId);

    // First, get all scenes for this story
    const storyScenes = await db.select({ id: scenes.id })
      .from(scenes)
      .where(eq(scenes.storyId, parsedStoryId));

    // Extract scene IDs
    const sceneIds = storyScenes.map(scene => scene.id);

    if (sceneIds.length === 0) {
      // No scenes in this story, return empty array
      return json(successResponse([]), { status: HttpStatus.OK });
    }

    // Find all transitions where either fromSceneId or toSceneId is in the list of scene IDs
    query = db.select()
      .from(sceneTransitions)
      .where(
        or(
          inArray(sceneTransitions.fromSceneId, sceneIds),
          inArray(sceneTransitions.toSceneId, sceneIds)
        )
      );
  }

  const transitions = await query;
  return json(successResponse(transitions), { status: HttpStatus.OK });
});

/**
 * POST handler for creating a new transition
 */
export const POST = withErrorHandling(async ({ request }: RequestEvent) => {
  const transitionData = await request.json();

  // Validate required fields
  validateRequiredFields(transitionData, ['fromSceneId', 'toSceneId', 'type', 'duration']);

  // Validate that both scenes exist
  const fromScene = await db.query.scenes.findFirst({
    where: eq(scenes.id, transitionData.fromSceneId)
  });

  const toScene = await db.query.scenes.findFirst({
    where: eq(scenes.id, transitionData.toSceneId)
  });

  if (!fromScene || !toScene) {
    throw error(HttpStatus.BAD_REQUEST, 'One or both scenes do not exist');
  }

  // Check if a transition already exists between these scenes
  const existingTransition = await db.query.sceneTransitions.findFirst({
    where: and(
      eq(sceneTransitions.fromSceneId, transitionData.fromSceneId),
      eq(sceneTransitions.toSceneId, transitionData.toSceneId)
    )
  });

  let newTransition;

  if (existingTransition) {
    // Update the existing transition
    [newTransition] = await db.update(sceneTransitions)
      .set({
        type: transitionData.type,
        duration: transitionData.duration,
        updatedAt: new Date()
      })
      .where(eq(sceneTransitions.id, existingTransition.id))
      .returning();
  } else {
    // Create a new transition
    [newTransition] = await db.insert(sceneTransitions)
      .values({
        fromSceneId: transitionData.fromSceneId,
        toSceneId: transitionData.toSceneId,
        type: transitionData.type,
        duration: transitionData.duration,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
  }

  return json(successResponse(newTransition), { status: HttpStatus.CREATED });
});
