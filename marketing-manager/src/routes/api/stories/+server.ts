import type { RequestEvent } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { stories } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import {
  successResponse,
  HttpStatus,
  validateRequiredFields,
  handleServerError,
  withErrorHandling
} from '$lib/server/utils/api-utils';

/**
 * GET handler for retrieving all stories with optional filtering
 */
export const GET = async ({ url }: RequestEvent) => {
  try {
    // Check if creativeId query parameter exists
    const creativeIdParam = url.searchParams.get('creativeId');
    let whereCondition = undefined;

    // If creativeId is provided, filter stories by that creative
    if (creativeIdParam) {
      const creativeId = parseInt(creativeIdParam);
      if (isNaN(creativeId)) {
        throw error(HttpStatus.BAD_REQUEST, 'Invalid creativeId parameter');
      }
      whereCondition = eq(stories.creativeId, creativeId);
    }

    const allStories = await db.query.stories.findMany({
      where: whereCondition,
      with: {
        scenes: {
          with: {
            clips: true
          },
          orderBy: (scenes, { asc }) => [asc(scenes.orderIndex)]
        }
      },
      orderBy: (stories, { desc }) => [desc(stories.createdAt)]
    });

    return json(allStories);
  } catch (err) {
    console.error('Error fetching stories:', err);
    // Check if it's an error thrown by SvelteKit's error() helper
    if (err.status && err.body) {
      throw err; // Re-throw SvelteKit errors
    }
    throw error(HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch stories');
  }
};

/**
 * POST handler for creating a new story
 */
export const POST = withErrorHandling(async ({ request }: RequestEvent) => {
  const storyData = await request.json();

  // Validate required fields
  validateRequiredFields(storyData, ['creativeId', 'title']);

  // Insert story with proper error handling
  const [newStory] = await db.insert(stories).values({
    creativeId: storyData.creativeId,
    title: storyData.title,
    description: storyData.description || null,
    aspectRatio: storyData.aspectRatio || '16:9', // Default to 16:9 if not provided
    resolution: storyData.resolution || null,
    narrationVolume: storyData.narrationVolume ?? 1.0, // Default to 100% if not provided
    bgmVolume: storyData.bgmVolume ?? 0.09, // Default to 9% if not provided
    narrationSpeed: storyData.narrationSpeed ?? 1.1, // Default to 1.1x speed if not provided
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning();

  return json(successResponse(newStory), { status: HttpStatus.CREATED });
});
