import { db } from '$lib/server/db';
import { creatives } from '$lib/server/db/schema';
import { json, error as kitError } from '@sveltejs/kit';
import { desc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// GET /api/creatives
export const GET: RequestHandler = async ({ url }) => {
	console.log('API: Loading creatives from database...');
	try {
		// TODO: Add filtering based on query params (campaignId, personaId, themeId, type) later
		// const campaignId = url.searchParams.get('campaignId');
		// const personaId = url.searchParams.get('personaId');
		// const type = url.searchParams.get('type');

		const allCreatives = await db.query.creatives.findMany({
			orderBy: [desc(creatives.createdAt)],
			// Include basic related data for list display if needed
			with: {
				campaign: { columns: { id: true, name: true } },
				persona: { columns: { id: true, name: true } },
				theme: { columns: { id: true, title: true } }
				// Specific type data could be fetched on detail view or conditionally here
			}
			// Add where clause here for filtering later
		});

		console.log(`API: Found ${allCreatives.length} creatives.`);
		return json(allCreatives);
	} catch (error) {
		console.error('API: Failed to load creatives:', error);
		kitError(500, 'Failed to load creatives');
	}
};

// POST /api/creatives (To be implemented later)
// PUT /api/creatives/[id] (To be implemented later in [id]/+server.ts)
// DELETE /api/creatives/[id] (To be implemented later in [id]/+server.ts)
