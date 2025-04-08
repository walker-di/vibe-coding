import { db } from '$lib/server/db';
import { campaigns, campaignStatuses } from '$lib/server/db/schema';
import { json, error as kitError } from '@sveltejs/kit';
import { desc, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { z } from 'zod'; // For validation

// Schema for creating/updating a campaign (Phase 1 + Phase 3 fields)
const campaignSchema = z.object({
	name: z.string().min(1, { message: 'Campaign name is required.' }).max(100),
	goal: z.string().max(500).optional().nullable(),
	startDate: z.coerce.date().optional().nullable(), // Coerce string/number to Date
	endDate: z.coerce.date().optional().nullable(),
	targetPlatforms: z.string().optional().nullable(), // Simple text for now
	status: z.enum(campaignStatuses).default('Draft').optional()
});


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

export const POST: RequestHandler = async ({ request }) => {
	let requestData;
	try {
		requestData = await request.json();
	} catch (e) {
		return json({ message: 'Invalid JSON body' }, { status: 400 });
	}

	const validationResult = campaignSchema.safeParse(requestData);

	if (!validationResult.success) {
		const errors = validationResult.error.flatten().fieldErrors;
		return json({ message: 'Validation failed', errors }, { status: 400 });
	}

	const validatedData = validationResult.data;

	try {
		console.log('API: Inserting new campaign:', validatedData.name);
		const [newCampaign] = await db
			.insert(campaigns)
			.values({
				name: validatedData.name,
				goal: validatedData.goal,
				startDate: validatedData.startDate,
				endDate: validatedData.endDate,
				targetPlatforms: validatedData.targetPlatforms,
				status: validatedData.status,
				// createdAt is handled by default, updatedAt needs manual handling on update
			})
			.returning({ id: campaigns.id }); // Get the ID back

		console.log('API: New campaign created with ID:', newCampaign.id);

		// Return the newly created campaign ID and name with a 201 status
		return json({ id: newCampaign.id, name: validatedData.name }, { status: 201 });

	} catch (error) {
		console.error('API: Failed to create campaign:', error);
		// Use SvelteKit's error helper for internal errors
		kitError(500, 'Failed to create campaign. Please try again.');
	}
};
