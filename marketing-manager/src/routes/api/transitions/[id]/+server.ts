import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { sceneTransitions } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import {
  successResponse,
  HttpStatus,
  validateId,
  handleNotFoundError,
  withErrorHandling
} from '$lib/server/utils/api-utils';

/**
 * GET handler for retrieving a transition by ID
 */
export const GET = withErrorHandling(async ({ params }: RequestEvent) => {
  // Validate and parse the ID parameter
  const transitionId = validateId(params.id, 'transition ID');

  const transition = await db.query.sceneTransitions.findFirst({
    where: eq(sceneTransitions.id, transitionId)
  });

  if (!transition) {
    handleNotFoundError(`Transition with ID ${transitionId} not found`);
  }

  return json(successResponse(transition), { status: HttpStatus.OK });
});

/**
 * PUT handler for updating a transition by ID
 */
export const PUT = withErrorHandling(async ({ params, request }: RequestEvent) => {
  // Validate and parse the ID parameter
  const transitionId = validateId(params.id, 'transition ID');

  const transitionData = await request.json();

  // Update transition
  const [updatedTransition] = await db.update(sceneTransitions)
    .set({
      type: transitionData.type || undefined,
      duration: transitionData.duration || undefined,
      updatedAt: new Date()
    })
    .where(eq(sceneTransitions.id, transitionId))
    .returning();

  if (!updatedTransition) {
    handleNotFoundError(`Transition with ID ${transitionId} not found`);
  }

  return json(successResponse(updatedTransition), { status: HttpStatus.OK });
});

/**
 * DELETE handler for removing a transition by ID
 */
export const DELETE = withErrorHandling(async ({ params }: RequestEvent) => {
  // Validate and parse the ID parameter
  const transitionId = validateId(params.id, 'transition ID');

  // Delete transition
  const [deletedTransition] = await db.delete(sceneTransitions)
    .where(eq(sceneTransitions.id, transitionId))
    .returning();

  if (!deletedTransition) {
    handleNotFoundError(`Transition with ID ${transitionId} not found`);
  }

  return json(successResponse({ success: true }, 'Transition deleted successfully'), { status: HttpStatus.OK });
});
