import type { RequestEvent } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { bgmFiles } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import {
  successResponse,
  HttpStatus,
  validateId,
  validateRequiredFields,
  handleNotFoundError,
  withErrorHandling
} from '$lib/server/utils/api-utils';

/**
 * GET handler for retrieving a BGM file by ID
 */
export const GET = withErrorHandling(async ({ params }: RequestEvent) => {
  // Validate and parse the ID parameter
  const bgmId = validateId(params.id, 'BGM ID');

  // Fetch the BGM file
  const bgmFile = await db.query.bgmFiles.findFirst({
    where: eq(bgmFiles.id, bgmId)
  });

  if (!bgmFile) {
    handleNotFoundError(`BGM file with ID ${bgmId} not found`);
  }

  return json(successResponse(bgmFile));
});

/**
 * PUT handler for updating a BGM file by ID
 */
export const PUT = withErrorHandling(async ({ params, request }: RequestEvent) => {
  // Validate and parse the ID parameter
  const bgmId = validateId(params.id, 'BGM ID');

  const bgmData = await request.json();

  // Update BGM file
  const [updatedBgmFile] = await db.update(bgmFiles)
    .set({
      name: bgmData.name !== undefined ? bgmData.name : undefined,
      description: bgmData.description !== undefined ? bgmData.description : undefined,
      audioUrl: bgmData.audioUrl !== undefined ? bgmData.audioUrl : undefined,
      duration: bgmData.duration !== undefined ? bgmData.duration : undefined,
      fileSize: bgmData.fileSize !== undefined ? bgmData.fileSize : undefined,
      updatedAt: new Date()
    })
    .where(eq(bgmFiles.id, bgmId))
    .returning();

  if (!updatedBgmFile) {
    handleNotFoundError(`BGM file with ID ${bgmId} not found`);
  }

  return json(successResponse(updatedBgmFile));
});

/**
 * DELETE handler for removing a BGM file by ID
 */
export const DELETE = withErrorHandling(async ({ params }: RequestEvent) => {
  // Validate and parse the ID parameter
  const bgmId = validateId(params.id, 'BGM ID');

  // Delete the BGM file
  const [deletedBgmFile] = await db.delete(bgmFiles)
    .where(eq(bgmFiles.id, bgmId))
    .returning();

  if (!deletedBgmFile) {
    handleNotFoundError(`BGM file with ID ${bgmId} not found`);
  }

  return json(successResponse(deletedBgmFile));
});
