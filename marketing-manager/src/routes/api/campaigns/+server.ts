import { db } from '$lib/server/db';
import { campaigns } from '$lib/server/db/schema';
import { json } from '@sveltejs/kit';
import { desc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	console.log('API: Loading campaigns from database...');
	try {
		const allCampaigns = await db
			.select()
			.from(campaigns)
			.orderBy(desc(campaigns.createdAt)); // Order by creation date, newest first

		console.log(`API: Found ${allCampaigns.length} campaigns.`);
		return json(allCampaigns); // Return campaigns as JSON
	} catch (error) {
		console.error('API: Failed to load campaigns:', error);
		// Return a server error response
		return json({ message: 'Failed to load campaigns' }, { status: 500 });
	}
};
