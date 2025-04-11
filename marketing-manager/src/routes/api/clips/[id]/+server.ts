import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { clips } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import {
  successResponse,
  HttpStatus,
  validateId,
  handleNotFoundError,
  handleServerError,
  withErrorHandling
} from '$lib/server/utils/api-utils';

/**
 * GET handler for retrieving a clip by ID
 */
export const GET = withErrorHandling(async ({ params, url }: RequestEvent) => {
  // Validate and parse the ID parameter
  const clipId = validateId(params.id, 'clip ID');

  // Check if this is a retry request (for newly created clips)
  const retryCount = parseInt(url.searchParams.get('retry') || '0');
  const maxRetries = 3; // Maximum number of retries

  let clip = await db.query.clips.findFirst({
    where: eq(clips.id, clipId)
  });

  // If clip not found and we haven't exceeded max retries, wait and try again
  // This helps with race conditions when a clip was just created
  if (!clip && retryCount < maxRetries) {
    // Wait for a short time before retrying
    await new Promise(resolve => setTimeout(resolve, 300));

    // Try again
    clip = await db.query.clips.findFirst({
      where: eq(clips.id, clipId)
    });
  }

  if (!clip) {
    handleNotFoundError(`Clip with ID ${clipId} could not be found after ${retryCount} retries.`);
  }

  return json(successResponse(clip), { status: HttpStatus.OK });
});

/**
 * PUT handler for updating a clip by ID
 */
export const PUT = withErrorHandling(async ({ params, request }: RequestEvent) => {
  // Validate and parse the ID parameter
  const clipId = validateId(params.id, 'clip ID');

  const clipData = await request.json();

  // Build the update object dynamically based on provided fields
  const updateData: Partial<typeof clips.$inferInsert> = {
    updatedAt: new Date()
  };

  if (clipData.canvas !== undefined) {
    updateData.canvas = clipData.canvas;
  }
  if (clipData.narration !== undefined) {
    // Allow setting narration to null or empty string
    updateData.narration = clipData.narration;
  }
  if (clipData.narrationAudioUrl !== undefined) {
    // Allow setting narrationAudioUrl to null or a string
    if (clipData.narrationAudioUrl !== null && typeof clipData.narrationAudioUrl !== 'string') {
      handleServerError(null, 'Invalid narrationAudioUrl format');
    }
    updateData.narrationAudioUrl = clipData.narrationAudioUrl;
  }
  if (clipData.description !== undefined) {
    // Allow setting description to null or empty string
    updateData.description = clipData.description;
  }
  if (clipData.orderIndex !== undefined && clipData.orderIndex !== null) {
    if (typeof clipData.orderIndex !== 'number' || clipData.orderIndex < 0) {
      handleServerError(null, 'Invalid order index format');
    }
    updateData.orderIndex = clipData.orderIndex;
  }
  if (clipData.imageUrl !== undefined) {
    // Allow setting imageUrl to null or a string
    if (clipData.imageUrl !== null && typeof clipData.imageUrl !== 'string') {
      handleServerError(null, 'Invalid imageUrl format');
    }
    updateData.imageUrl = clipData.imageUrl;
  }
  if (clipData.duration !== undefined) {
    // Allow setting duration to null or a number
    if (clipData.duration !== null && typeof clipData.duration !== 'number') {
      handleServerError(null, 'Invalid duration format');
    }
    updateData.duration = clipData.duration;
  }

  // Ensure at least one field is being updated besides updatedAt
  if (Object.keys(updateData).length <= 1) {
    handleServerError(null, 'No valid fields provided for update.');
  }

  // Perform the update with dynamically built data
  const [updatedClip] = await db.update(clips)
    .set(updateData)
    .where(eq(clips.id, clipId))
    .returning();

  if (!updatedClip) {
    console.error(`clips API: Clip ${clipId} not found for update`);
    handleNotFoundError('Clip not found');
  }

  return json(successResponse(updatedClip), { status: HttpStatus.OK });
});

/**
 * DELETE handler for removing a clip by ID
 */
export const DELETE = withErrorHandling(async ({ params }: RequestEvent) => {
  // Validate and parse the ID parameter
  const clipId = validateId(params.id, 'clip ID');

  // Delete clip
  const [deletedClip] = await db.delete(clips)
    .where(eq(clips.id, clipId))
    .returning();

  if (!deletedClip) {
    handleNotFoundError('Clip not found');
  }

  return json(successResponse({ success: true }, 'Clip deleted successfully'), { status: HttpStatus.OK });
});
