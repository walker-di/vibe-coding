import { db } from '$lib/server/db';
import { campaigns, campaignStatuses } from '$lib/server/db/schema';
import { json, error as kitError } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { z } from 'zod';

// Schema for updating a campaign (same as create, but all fields optional potentially)
// We can reuse the schema from the list endpoint, but refine validation if needed
const campaignSchema = z.object({
	name: z.string().min(1, { message: 'Campaign name is required.' }).max(100).optional(),
	goal: z.string().max(500).optional().nullable(),
	startDate: z.coerce.date().optional().nullable(),
	endDate: z.coerce.date().optional().nullable(),
	targetPlatforms: z.string().optional().nullable(),
	status: z.enum(campaignStatuses).optional()
}).partial(); // .partial() makes all fields optional for updates


// GET /api/campaigns/[id]
export const GET: RequestHandler = async ({ params }) => {
	const campaignId = parseInt(params.id, 10);
	if (isNaN(campaignId)) {
		return json({ message: 'Invalid campaign ID' }, { status: 400 });
	}

	console.log(`API: Loading campaign with ID: ${campaignId}`);
	try {
		const campaign = await db.query.campaigns.findFirst({
			where: eq(campaigns.id, campaignId)
			// Add relations here if needed later, e.g., with: { creatives: true }
		});

		if (!campaign) {
			return json({ message: 'Campaign not found' }, { status: 404 });
		}

		console.log(`API: Found campaign: ${campaign.name}`);
		return json(campaign);
	} catch (error) {
		console.error(`API: Failed to load campaign ${campaignId}:`, error);
		kitError(500, 'Failed to load campaign');
	}
};

// PUT /api/campaigns/[id]
export const PUT: RequestHandler = async ({ params, request }) => {
	const campaignId = parseInt(params.id, 10);
	if (isNaN(campaignId)) {
		return json({ message: 'Invalid campaign ID' }, { status: 400 });
	}

	let requestData;
	try {
		requestData = await request.json();
	} catch (e) {
		return json({ message: 'Invalid JSON body' }, { status: 400 });
	}

	// Validate that at least one field is being updated
	if (Object.keys(requestData).length === 0) {
		return json({ message: 'No fields provided for update' }, { status: 400 });
	}

	const validationResult = campaignSchema.safeParse(requestData);

	if (!validationResult.success) {
		const errors = validationResult.error.flatten().fieldErrors;
		return json({ message: 'Validation failed', errors }, { status: 400 });
	}

	const validatedData = validationResult.data;

	try {
		console.log(`API: Updating campaign with ID: ${campaignId}`);

		// Check if campaign exists before updating
		const existing = await db.query.campaigns.findFirst({
			where: eq(campaigns.id, campaignId),
			columns: { id: true } // Only need ID to check existence
		});

		if (!existing) {
			return json({ message: 'Campaign not found' }, { status: 404 });
		}

		// Manually set updatedAt timestamp
		const updateValues = {
			...validatedData,
			updatedAt: sql`(unixepoch('now') * 1000)` // Use Drizzle SQL helper
		};


		await db
			.update(campaigns)
			.set(updateValues)
			.where(eq(campaigns.id, campaignId));

		console.log(`API: Campaign ${campaignId} updated successfully.`);

		// Optionally fetch and return the updated campaign
		const updatedCampaign = await db.query.campaigns.findFirst({
			where: eq(campaigns.id, campaignId)
		});

		return json(updatedCampaign, { status: 200 });

	} catch (error) {
		console.error(`API: Failed to update campaign ${campaignId}:`, error);
		kitError(500, 'Failed to update campaign');
	}
};

// DELETE /api/campaigns/[id]
export const DELETE: RequestHandler = async ({ params }) => {
	const campaignId = parseInt(params.id, 10);
	if (isNaN(campaignId)) {
		return json({ message: 'Invalid campaign ID' }, { status: 400 });
	}

	console.log(`API: Deleting campaign with ID: ${campaignId}`);
	try {
		// Check if campaign exists before deleting
		const existing = await db.query.campaigns.findFirst({
			where: eq(campaigns.id, campaignId),
			columns: { id: true }
		});

		if (!existing) {
			return json({ message: 'Campaign not found' }, { status: 404 });
		}

		await db.delete(campaigns).where(eq(campaigns.id, campaignId));

		console.log(`API: Campaign ${campaignId} deleted successfully.`);
		return json({ message: 'Campaign deleted successfully' }, { status: 200 }); // Or 204 No Content

	} catch (error) {
		console.error(`API: Failed to delete campaign ${campaignId}:`, error);
		// Consider foreign key constraints if creatives are linked
		kitError(500, 'Failed to delete campaign');
	}
};
