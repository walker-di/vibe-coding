import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/projects/[projectId]/timeline - Load timeline state
export const GET: RequestHandler = async ({ params }) => {
	const projectId = params.projectId;

	if (!projectId) {
		throw error(400, 'Project ID is required');
	}

	try {
		const result = await db
			.select({ timeline: projects.timeline })
			.from(projects)
			.where(eq(projects.id, projectId))
			.limit(1);

		if (result.length === 0) {
			throw error(404, 'Project not found');
		}

		const timelineData = result[0].timeline;

		// If timeline data exists, parse it, otherwise return null or an empty object
		let parsedTimeline = null;
		if (timelineData) {
			try {
				parsedTimeline = JSON.parse(timelineData);
			} catch (parseError) {
				console.error(`Error parsing timeline JSON for project ${projectId}:`, parseError);
				// Decide how to handle corrupted data - return null, empty, or error?
				// Returning null for now, frontend can decide how to handle.
			}
		}

		return json({ timeline: parsedTimeline });

	} catch (err: any) {
		// Catch specific Drizzle errors if needed, otherwise rethrow generic error
		console.error(`Error loading timeline for project ${projectId}:`, err);
		if (err.status) { // Re-throw SvelteKit errors
			throw err;
		}
		throw error(500, 'Failed to load timeline state');
	}
};

// PUT /api/projects/[projectId]/timeline - Save timeline state
export const PUT: RequestHandler = async ({ params, request }) => {
	const projectId = params.projectId;

	if (!projectId) {
		throw error(400, 'Project ID is required');
	}

	let timelineData;
	try {
		timelineData = await request.json();
		if (!timelineData || typeof timelineData !== 'object') {
			throw new Error('Invalid timeline data format');
		}
	} catch (err) {
		throw error(400, 'Invalid request body: Expected JSON');
	}

	try {
		// Stringify the timeline data for storage
		const timelineString = JSON.stringify(timelineData);

		// Also update the updatedAt timestamp
		const currentTimestamp = new Date();

		const result = await db
			.update(projects)
			.set({
				timeline: timelineString,
				updatedAt: currentTimestamp
			 })
			.where(eq(projects.id, projectId))
			.returning({ updatedId: projects.id }); // Check if the update was successful

		if (result.length === 0) {
			throw error(404, 'Project not found or update failed');
		}

		return json({ success: true, message: 'Timeline saved successfully' });

	} catch (err: any) {
		console.error(`Error saving timeline for project ${projectId}:`, err);
		if (err.status) { // Re-throw SvelteKit errors
			throw err;
		}
		throw error(500, 'Failed to save timeline state');
	}
};
