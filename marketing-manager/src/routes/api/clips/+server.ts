import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { clips } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import {
  successResponse,
  HttpStatus,
  validateRequiredFields,
  handleServerError,
  withErrorHandling
} from '$lib/server/utils/api-utils';

/**
 * POST handler for creating a new clip
 */
export const POST = withErrorHandling(async ({ request }: RequestEvent) => {
  const clipData = await request.json();

  // Validate required fields
  validateRequiredFields(clipData, ['sceneId', 'canvas', 'orderIndex']);

  // Insert clip with proper error handling
  const [newClip] = await db.insert(clips).values({
    sceneId: clipData.sceneId,
    canvas: clipData.canvas,
    imageUrl: clipData.imageUrl || null,
    narration: clipData.narration || null,
    narrationAudioUrl: clipData.narrationAudioUrl || null,
    voiceName: clipData.voiceName || null,
    description: clipData.description || null,
    duration: clipData.duration || null,
    orderIndex: clipData.orderIndex,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning();

  return json(successResponse(newClip), { status: HttpStatus.CREATED });
});
