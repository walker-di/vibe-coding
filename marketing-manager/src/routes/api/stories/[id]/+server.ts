import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { stories } from '$lib/server/db/schema';
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
 * GET handler for retrieving a story by ID
 */
export const GET = withErrorHandling(async ({ params }: RequestEvent) => {
  // Validate and parse the ID parameter
  const storyId = validateId(params.id, 'story ID');

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
    handleNotFoundError(`Story with ID ${storyId} not found`);
  }

  return json(successResponse(story), { status: HttpStatus.OK });
});

/**
 * PUT handler for updating a story by ID
 */
export const PUT = withErrorHandling(async ({ params, request }: RequestEvent) => {
  // Validate and parse the ID parameter
  const storyId = validateId(params.id, 'story ID');

  const storyData = await request.json();

  // Validate required fields
  validateRequiredFields(storyData, ['title']);

  // Build the update object
  const updateData = {
    title: storyData.title,
    description: storyData.description || null,
    updatedAt: new Date()
  };

  // Only include optional fields if they are provided
  if (storyData.aspectRatio !== undefined) {
    updateData['aspectRatio'] = storyData.aspectRatio;
  }

  if (storyData.resolution !== undefined) {
    updateData['resolution'] = storyData.resolution;
  }

  // Update story
  const [updatedStory] = await db.update(stories)
    .set(updateData)
    .where(eq(stories.id, storyId))
    .returning();

  if (!updatedStory) {
    handleNotFoundError(`Story with ID ${storyId} not found`);
  }

  return json(successResponse(updatedStory), { status: HttpStatus.OK });
});

/**
 * DELETE handler for removing a story by ID
 */
export const DELETE = withErrorHandling(async ({ params }: RequestEvent) => {
  // Validate and parse the ID parameter
  const storyId = validateId(params.id, 'story ID');

  // Delete story (cascade will handle related scenes and clips)
  const [deletedStory] = await db.delete(stories)
    .where(eq(stories.id, storyId))
    .returning();

  if (!deletedStory) {
    handleNotFoundError(`Story with ID ${storyId} not found`);
  }

  return json(successResponse({ success: true }, 'Story deleted successfully'), { status: HttpStatus.OK });
});
