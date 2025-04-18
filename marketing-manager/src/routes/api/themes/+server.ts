import { db } from '$lib/server/db';
import { themes } from '$lib/server/db/schema';
import { json, error } from '@sveltejs/kit';
import { desc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// GET /api/themes - Fetch all themes
export const GET: RequestHandler = async () => {
	try {
		// Check if the themes table exists in the schema
		let themes;
		try {
			// Try to query the themes table
			themes = await db.query.themes.findMany({
				orderBy: (themes, { desc }) => [desc(themes.createdAt)]
			});
		} catch (err) {
			// If the table doesn't exist or has been removed, return an empty array
			console.warn('Themes table may not exist in the schema:', err);
			themes = [];
		}

		return json(themes);
	} catch (err) {
		console.error('Error fetching themes:', err);
		throw error(500, 'Failed to fetch themes');
	}
};
