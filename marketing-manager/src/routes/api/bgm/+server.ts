import type { RequestEvent } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { bgmFiles } from '$lib/server/db/schema';
import { desc, sql } from 'drizzle-orm';
import {
  successResponse,
  HttpStatus,
  validateRequiredFields,
  handleServerError,
  withErrorHandling
} from '$lib/server/utils/api-utils';

/**
 * GET handler for listing all BGM files
 */
export const GET = withErrorHandling(async ({ url }: RequestEvent) => {
  // Get query parameters for pagination
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  // Fetch BGM files with pagination
  const items = await db.select()
    .from(bgmFiles)
    .orderBy(desc(bgmFiles.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count
  const [{ count }] = await db.select({
    count: sql<number>`count(*)`
  }).from(bgmFiles);

  return json(successResponse({
    items,
    pagination: {
      total: count,
      limit,
      offset
    }
  }));
});

/**
 * POST handler for creating a new BGM file
 */
export const POST = withErrorHandling(async ({ request }: RequestEvent) => {
  const bgmData = await request.json();

  // Validate required fields
  validateRequiredFields(bgmData, ['name', 'audioUrl']);

  // Insert BGM file
  const [newBgmFile] = await db.insert(bgmFiles).values({
    name: bgmData.name,
    description: bgmData.description || null,
    audioUrl: bgmData.audioUrl,
    duration: bgmData.duration || null,
    fileSize: bgmData.fileSize || null,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning();

  return json(successResponse(newBgmFile), { status: HttpStatus.CREATED });
});
