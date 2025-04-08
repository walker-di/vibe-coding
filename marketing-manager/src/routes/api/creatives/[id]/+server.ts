import { db } from '$lib/server/db';
import {
	creatives,
	creativeText,
	creativeImage,
	creativeVideo, // Import other types later
	creativeLp,    // Import other types later
	creativeTypes
} from '$lib/server/db/schema';
import { json, error as kitError } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { z } from 'zod';

// --- Validation Schemas (Similar to POST, but partial for PUT) ---

const baseCreativeSchema = z.object({
	name: z.string().min(1).max(150).optional(),
	description: z.string().max(500).optional().nullable(),
	campaignId: z.number().int().positive().optional().nullable(),
	personaId: z.number().int().positive().optional().nullable(),
	themeId: z.number().int().positive().optional().nullable(),
	// Type cannot be changed via PUT
});

const textDataSchema = z.object({
	headline: z.string().max(200).optional().nullable(),
	body: z.string().min(1).optional(), // Optional for PUT if only changing headline/cta
	callToAction: z.string().max(100).optional().nullable()
}).partial(); // Allow partial updates

const imageDataSchema = z.object({
	imageUrl: z.string().url().min(1).optional(),
	altText: z.string().max(200).optional().nullable(),
	width: z.number().int().positive().optional().nullable(),
	height: z.number().int().positive().optional().nullable()
}).partial();

// TODO: Add videoDataSchema and lpDataSchema later

// We don't use discriminated union here as type isn't changing.
// We'll validate based on the existing creative's type.


// --- Helper Function ---
async function getCreativeAndType(id: number) {
	const creative = await db.query.creatives.findFirst({
		where: eq(creatives.id, id),
		columns: { id: true, type: true } // Only need id and type initially
	});
	return creative;
}


// --- Request Handlers ---

// GET /api/creatives/[id]
export const GET: RequestHandler = async ({ params }) => {
	const creativeId = parseInt(params.id, 10);
	if (isNaN(creativeId)) {
		return json({ message: 'Invalid creative ID' }, { status: 400 });
	}

	console.log(`API: Loading creative with ID: ${creativeId}`);
	try {
		// Fetch the main creative data along with its specific type data using relations
		const creative = await db.query.creatives.findFirst({
			where: eq(creatives.id, creativeId),
			with: {
				campaign: { columns: { id: true, name: true } },
				persona: { columns: { id: true, name: true } },
				theme: { columns: { id: true, title: true } },
				// Include relations for all possible types
				textData: true,
				imageData: true,
				videoData: true, // Add later
				lpData: true      // Add later
			}
		});

		if (!creative) {
			return json({ message: 'Creative not found' }, { status: 404 });
		}

		console.log(`API: Found creative: ${creative.name} (Type: ${creative.type})`);
		return json(creative);
	} catch (error) {
		console.error(`API: Failed to load creative ${creativeId}:`, error);
		kitError(500, 'Failed to load creative');
	}
};

// PUT /api/creatives/[id]
export const PUT: RequestHandler = async ({ params, request }) => {
	const creativeId = parseInt(params.id, 10);
	if (isNaN(creativeId)) {
		return json({ message: 'Invalid creative ID' }, { status: 400 });
	}

	let requestData;
	try {
		requestData = await request.json();
	} catch (e) {
		return json({ message: 'Invalid JSON body' }, { status: 400 });
	}

	// Separate base data and type-specific data
	const { textData, imageData, videoData, lpData, ...baseData } = requestData;

	// Validate base data
	const baseValidation = baseCreativeSchema.safeParse(baseData);
	if (!baseValidation.success) {
		return json({ message: 'Validation failed (base)', errors: baseValidation.error.flatten().fieldErrors }, { status: 400 });
	}
	const validatedBaseData = baseValidation.data;

	try {
		console.log(`API: Updating creative with ID: ${creativeId}`);

		// Get existing creative type
		const existingCreative = await getCreativeAndType(creativeId);
		if (!existingCreative) {
			return json({ message: 'Creative not found' }, { status: 404 });
		}
		const creativeType = existingCreative.type;

		// Validate type-specific data based on existing type
		let typeValidationResult: z.SafeParseReturnType<any, any> | null = null;
		let validatedTypeData: any = null;

		if (creativeType === 'text' && textData) {
			typeValidationResult = textDataSchema.safeParse(textData);
			if (typeValidationResult.success) validatedTypeData = typeValidationResult.data;
		} else if (creativeType === 'image' && imageData) {
			typeValidationResult = imageDataSchema.safeParse(imageData);
			if (typeValidationResult.success) validatedTypeData = typeValidationResult.data;
		}
		// TODO: Add validation for video/lp later

		if (typeValidationResult && !typeValidationResult.success) {
			return json({ message: `Validation failed (${creativeType} data)`, errors: typeValidationResult.error.flatten().fieldErrors }, { status: 400 });
		}

		// Use transaction to update base and specific tables
		const updatedCreativeResult = await db.transaction(async (tx) => {
			// 1. Update base creatives table (if data provided)
			if (Object.keys(validatedBaseData).length > 0) {
				await tx
					.update(creatives)
					.set({
						...validatedBaseData,
						updatedAt: sql`(unixepoch('now') * 1000)` // Manual update timestamp
					})
					.where(eq(creatives.id, creativeId));
				console.log(`API: Updated base data for creative ID: ${creativeId}`);
			}

			// 2. Update type-specific table (if data provided and valid)
			if (validatedTypeData && Object.keys(validatedTypeData).length > 0) {
				switch (creativeType) {
					case 'text':
						await tx.update(creativeText).set(validatedTypeData).where(eq(creativeText.creativeId, creativeId));
						console.log(`API: Updated text data for creative ID: ${creativeId}`);
						break;
					case 'image':
						await tx.update(creativeImage).set(validatedTypeData).where(eq(creativeImage.creativeId, creativeId));
						console.log(`API: Updated image data for creative ID: ${creativeId}`);
						break;
					// TODO: Add cases for video/lp later
				}
				// Also update the base table's updatedAt timestamp if only type-specific data changed
				if (Object.keys(validatedBaseData).length === 0) {
					await tx.update(creatives).set({ updatedAt: sql`(unixepoch('now') * 1000)` }).where(eq(creatives.id, creativeId));
				}
			}

			// 3. Fetch the fully updated creative to return
			return await tx.query.creatives.findFirst({
				where: eq(creatives.id, creativeId),
				with: {
					campaign: { columns: { id: true, name: true } },
					persona: { columns: { id: true, name: true } },
					theme: { columns: { id: true, title: true } },
					textData: true,
					imageData: true,
					videoData: true, // Add later
					lpData: true      // Add later
				}
			});
		});

		console.log(`API: Creative ${creativeId} updated successfully.`);
		return json(updatedCreativeResult, { status: 200 });

	} catch (error: any) {
		console.error(`API: Failed to update creative ${creativeId}:`, error);
		kitError(500, `Failed to update creative: ${error.message || 'Database error'}`);
	}
};


// DELETE /api/creatives/[id]
export const DELETE: RequestHandler = async ({ params }) => {
	const creativeId = parseInt(params.id, 10);
	if (isNaN(creativeId)) {
		return json({ message: 'Invalid creative ID' }, { status: 400 });
	}

	console.log(`API: Deleting creative with ID: ${creativeId}`);
	try {
		// Check if creative exists
		const existing = await getCreativeAndType(creativeId);
		if (!existing) {
			return json({ message: 'Creative not found' }, { status: 404 });
		}

		// Deleting from 'creatives' table should cascade to the specific type table
		// due to `onDelete: 'cascade'` in the schema definition.
		const result = await db.delete(creatives).where(eq(creatives.id, creativeId));

		// Drizzle's delete doesn't throw error if row not found, might return changes=0
		// We already checked existence, so assume success if no exception.

		console.log(`API: Creative ${creativeId} deleted successfully.`);
		return json({ message: 'Creative deleted successfully' }, { status: 200 }); // Or 204

	} catch (error: any) {
		console.error(`API: Failed to delete creative ${creativeId}:`, error);
		kitError(500, `Failed to delete creative: ${error.message || 'Database error'}`);
	}
};
