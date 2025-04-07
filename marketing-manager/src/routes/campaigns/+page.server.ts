import { db } from '$lib/server/db'; // Assuming db instance is exported from here
import { campaigns } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';
import { desc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	console.log('Loading campaigns from database...');
	try {
		const allCampaigns = await db
            .select()
            .from(campaigns)
            .orderBy(desc(campaigns.createdAt)); // Order by creation date, newest first

		console.log(`Found ${allCampaigns.length} campaigns.`);
		return {
			campaigns: allCampaigns
		};
	} catch (error) {
		console.error('Failed to load campaigns:', error);
		// Optionally, return an error state to the page
		// For now, return empty array to avoid breaking the page
		return {
			campaigns: []
		};
	}
};
