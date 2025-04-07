import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { campaigns } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';
import { eq, sql } from 'drizzle-orm';
import type { RequestEvent } from '@sveltejs/kit';

// Define schema for validation (same as 'new' page)
const campaignSchema = z.object({
	name: z.string().min(1, 'Campaign name is required').max(100),
	goal: z.string().max(500).optional()
});

// Load function to fetch the campaign data for the form
export const load: PageServerLoad = async ({ params }) => {
	const campaignId = parseInt(params.id, 10);
	if (isNaN(campaignId)) {
		error(400, 'Invalid campaign ID');
	}

	try {
		const [campaign] = await db
			.select()
			.from(campaigns)
			.where(eq(campaigns.id, campaignId))
			.limit(1);

		if (!campaign) {
			error(404, 'Campaign not found');
		}
		return {
			campaign // Pass the campaign data to the page
		};
	} catch (err) {
		console.error(`Failed to load campaign ${campaignId} for editing:`, err);
		error(500, 'Failed to load campaign data');
	}
};

// Action to handle the form submission for updating
export const actions: Actions = {
	default: async ({ request, params }: RequestEvent) => {
		const campaignId = parseInt(params.id ?? '', 10);
		const formData = await request.formData(); // Get formData early to return values on early fail
		const name = formData.get('name') as string;
		const goal = formData.get('goal') as string | null;

		if (isNaN(campaignId)) {
			// Return consistent shape
			return fail(400, { error: 'Invalid campaign ID', errors: {}, name, goal });
		}

		const validationResult = campaignSchema.safeParse({ name, goal });

		if (!validationResult.success) {
			const errors = validationResult.error.flatten().fieldErrors;
			return fail(400, {
				error: 'Validation failed',
				errors: {
					name: errors.name?.[0],
					goal: errors.goal?.[0]
				},
				name, // Return submitted values
				goal
			});
		}

		const data = validationResult.data;

		try {
			// Manually set updatedAt timestamp
			const result = await db
				.update(campaigns)
				.set({
					name: data.name,
					goal: data.goal ?? null,
					updatedAt: sql`(unixepoch('now') * 1000)` // Set updatedAt timestamp
				})
				.where(eq(campaigns.id, campaignId))
				.returning({ updatedId: campaigns.id });

			if (result.length === 0) {
				// Return consistent shape
				return fail(404, { error: 'Campaign not found for update.', errors: {}, name: data.name, goal: data.goal });
			}

			console.log('Campaign updated successfully:', result[0].updatedId);

		} catch (err) {
			console.error(`Failed to update campaign ${campaignId}:`, err);
			// Return consistent shape
			return fail(500, {
				error: 'Database error: Failed to update campaign.',
				errors: {}, // Add empty errors object
				name: data.name,
				goal: data.goal
			});
		}

		// Redirect back to the campaign detail page after successful update
		redirect(303, `/campaigns/${campaignId}`);
	}
};
