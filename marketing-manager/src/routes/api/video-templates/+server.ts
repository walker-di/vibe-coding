import { db } from '$lib/server/db';
import { canvasTemplates } from '$lib/server/db/schema';
import { json, error } from '@sveltejs/kit';
import { desc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// GET /api/video-templates - Fetch all templates (basic info)
// This is a compatibility endpoint that returns canvas templates in the format expected by the video-templates API
export const GET: RequestHandler = async () => {
	try {
		// Fetch all canvas templates
		const canvasTemplatesData = await db
			.select()
			.from(canvasTemplates)
			.orderBy(desc(canvasTemplates.createdAt));

		// Map canvas templates to video templates format
		const templates = canvasTemplatesData.map(template => ({
			id: template.id,
			name: template.name,
			templateCode: template.name, // Use name as templateCode for compatibility
			durationSeconds: 30, // Default duration
			materialCount: 1, // Default material count
			aspectRatio: template.aspectRatio,
			sceneCount: 1, // Default scene count
			recommendedPlatforms: 'all', // Default platforms
			resolution: template.resolution,
			previewUrl: template.previewImageUrl,
			createdAt: template.createdAt,
			updatedAt: template.updatedAt
		}));

		return json(templates);
	} catch (err) {
		console.error('Error fetching video templates (compatibility endpoint):', err);
		throw error(500, 'Failed to fetch video templates');
	}
};
