import { db } from '$lib/server/db';
import { canvasTemplates } from '$lib/server/db/schema';
import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// GET /api/video-templates/[id] - Fetch a single template
// This is a compatibility endpoint that returns a canvas template in the format expected by the video-templates API
export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		throw error(400, 'Invalid template ID');
	}

	try {
		// Fetch the canvas template
		const templateData = await db
			.select()
			.from(canvasTemplates)
			.where(eq(canvasTemplates.id, id))
			.limit(1);

		if (!templateData || templateData.length === 0) {
			throw error(404, 'Video template not found');
		}

		// Map to video template format
		const template = {
			id: templateData[0].id,
			name: templateData[0].name,
			templateCode: templateData[0].name, // Use name as templateCode for compatibility
			durationSeconds: 30, // Default duration
			materialCount: 1, // Default material count
			aspectRatio: templateData[0].aspectRatio,
			sceneCount: 1, // Default scene count
			recommendedPlatforms: 'all', // Default platforms
			resolution: templateData[0].resolution,
			previewUrl: templateData[0].previewImageUrl,
			createdAt: templateData[0].createdAt,
			updatedAt: templateData[0].updatedAt
		};

		return json(template);
	} catch (err: any) {
		console.error(`Error fetching video template ${id} (compatibility endpoint):`, err);
		if (err.status) {
			throw err;
		}
		throw error(500, 'Failed to fetch video template');
	}
};
