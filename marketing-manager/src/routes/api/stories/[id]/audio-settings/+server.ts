import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { stories } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import {
  successResponse,
  HttpStatus,
  validateId,
  handleNotFoundError,
  withErrorHandling
} from '$lib/server/utils/api-utils';

/**
 * PUT handler for updating a story's audio settings by ID
 */
export const PUT = withErrorHandling(async ({ params, request }: RequestEvent) => {
  // Validate and parse the ID parameter
  const storyId = validateId(params.id, 'story ID');

  const audioSettings = await request.json();

  // Build the update object with only audio settings
  const updateData = {
    updatedAt: new Date()
  };

  // Include audio settings if provided
  if (audioSettings.narrationVolume !== undefined) {
    updateData['narrationVolume'] = audioSettings.narrationVolume;
  }

  if (audioSettings.bgmVolume !== undefined) {
    updateData['bgmVolume'] = audioSettings.bgmVolume;
  }

  if (audioSettings.narrationSpeed !== undefined) {
    updateData['narrationSpeed'] = audioSettings.narrationSpeed;
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
