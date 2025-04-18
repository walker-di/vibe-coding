import { db } from '$lib/server/db';
import { themes } from '$lib/server/db/schema';
import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// GET /api/themes/[id] - Fetch a single theme
export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		throw error(400, 'Invalid theme ID');
	}

	try {
		// Check if the themes table exists in the schema
		let theme;
		try {
			// Try to query the themes table
			theme = await db.query.themes.findFirst({
				where: eq(themes.id, id)
			});
		} catch (err) {
			// If the table doesn't exist or has been removed, return a 404
			console.warn(`Themes table may not exist in the schema or theme ${id} not found:`, err);
			throw error(404, 'Theme not found');
		}

		if (!theme) {
			throw error(404, 'Theme not found');
		}

		return json(theme);
	} catch (err: any) {
		console.error(`Error fetching theme ${id}:`, err);
		if (err.status) {
			throw err;
		}
		throw error(500, 'Failed to fetch theme');
	}
};
