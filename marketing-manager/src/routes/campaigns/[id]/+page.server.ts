import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit'; // Added fail, redirect, RequestEvent
import { db } from '$lib/server/db';
import { campaigns } from '$lib/server/db/schema';
import type { PageServerLoad, Actions } from './$types'; // Added Actions
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
	const campaignId = parseInt(params.id, 10); // Get ID from route params

	if (isNaN(campaignId)) {
		error(400, 'Invalid campaign ID'); // Use SvelteKit's error helper
	}

	console.log(`Loading campaign with ID: ${campaignId}`);
	try {
		const [campaign] = await db
			.select()
			.from(campaigns)
			.where(eq(campaigns.id, campaignId))
			.limit(1);

		if (!campaign) {
			console.log(`Campaign with ID ${campaignId} not found.`);
			error(404, 'Campaign not found'); // Throw 404 if not found
		}

		console.log('Campaign found:', campaign.name);
		return {
			campaign // Pass the campaign data to the page
		};
	} catch (err) {
		console.error(`Failed to load campaign ${campaignId}:`, err);
		error(500, 'Failed to load campaign data'); // Throw 500 for other errors
	}
};

// Actions for this page (e.g., delete)
export const actions: Actions = {
	delete: async ({ params }: RequestEvent) => {
		const campaignId = parseInt(params.id ?? '', 10);
		if (isNaN(campaignId)) {
			return fail(400, { error: 'Invalid campaign ID' });
		}

		console.log(`Attempting to delete campaign with ID: ${campaignId}`);
		try {
			const result = await db
				.delete(campaigns)
				.where(eq(campaigns.id, campaignId))
				.returning({ deletedId: campaigns.id });

			if (result.length === 0) {
				console.warn(`Campaign with ID ${campaignId} not found for deletion.`);
				// Still redirect, maybe it was already deleted
			} else {
				console.log(`Campaign deleted successfully: ${result[0].deletedId}`);
			}

		} catch (err) {
			console.error(`Failed to delete campaign ${campaignId}:`, err);
			return fail(500, { error: 'Database error: Failed to delete campaign.' });
		}

		// Redirect to the campaign list after deletion attempt
		redirect(303, '/campaigns');
	}
};
