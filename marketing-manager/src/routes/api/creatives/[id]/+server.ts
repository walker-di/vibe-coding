import { db } from '$lib/server/db';
import {
	creatives,
	creativeText,
	creativeImage,
	creativeVideo,
	creativeLp
} from '$lib/server/db/schema';
// Import constants from the correct path
import { creativeTypes, videoPlatforms, videoFormats, videoEmotions } from '$lib/components/constants';
import { json, error } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { z } from 'zod';

// --- Validation Schemas (Similar to POST, but partial for PUT) ---

const baseCreativeSchema = z.object({
	name: z.string().min(1).max(150).optional(),
	description: z.string().max(500).optional().nullable(),
	campaignId: z.number().int().positive().optional().nullable(),
	personaId: z.number().int().positive().optional(), // Keep optional for PUT, but ensure non-null if provided
	themeId: z.number().int().positive().optional().nullable(),
	// Type cannot be changed via PUT
});

const textDataSchema = z.object({
	headline: z.string().max(200).optional().nullable(),
	body: z.string().min(1).optional(), // Optional for PUT if only changing headline/cta
	callToAction: z.string().max(100).optional().nullable(),
	appealFeature: z.string().max(255).optional().nullable(), // Added
	emotion: z.string().max(100).optional().nullable(), // Added
	platformNotes: z.string().max(500).optional().nullable() // Added
}).partial(); // Allow partial updates

const imageDataSchema = z.object({
	imageUrl: z.union([
		z.string().url('Invalid Image URL.'),
		z.string().max(0), // Allow empty string
		z.null() // Allow null
	]).optional(), // Made optional
	altText: z.string().max(200).optional().nullable(),
	width: z.number().int().positive().optional().nullable(),
	height: z.number().int().positive().optional().nullable(),
	appealFeature: z.string().max(255).optional().nullable(), // Added
	emotion: z.string().max(100).optional().nullable(), // Added
	platformNotes: z.string().max(500).optional().nullable() // Added
}).partial();

// --- Add Start ---
const videoDataSchema = z.object({
	videoUrl: z.string().url('Invalid Video URL.').optional().nullable(),
	platform: z.enum(videoPlatforms).optional().nullable(),
	format: z.enum(videoFormats).optional().nullable(),
	duration: z.number().int().positive('Duration must be a positive integer.').optional().nullable(),
	appealFeature: z.string().max(255).optional().nullable(),
	emotion: z.enum(videoEmotions).optional().nullable(),
	templateId: z.number().int().positive().optional().nullable()
}).partial(); // Allow partial updates

const lpDataSchema = z.object({
	pageUrl: z.string().url('Invalid Page URL.').optional(), // Optional for PUT
	headline: z.string().max(200).optional().nullable(),
	keySections: z.array(z.object({ title: z.string() })).optional().nullable(),
	appealFeature: z.string().max(255).optional().nullable(), // Added
	emotion: z.string().max(100).optional().nullable(), // Added
	platformNotes: z.string().max(500).optional().nullable() // Added
}).partial(); // Allow partial updates
// --- Add End ---


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
		throw error(400, 'Invalid creative ID');
	}

	console.log(`API: Loading creative with ID: ${creativeId}`);
	try {
		// Fetch the main creative data along with its specific type data using relations
		const creative = await db.query.creatives.findFirst({
			where: eq(creatives.id, creativeId),
			with: {
				campaign: { columns: { id: true, name: true } },
				persona: { columns: { id: true, name: true } },
				// theme relation is causing issues, removed for now
				// Include relations for all possible types
				textData: true,
				imageData: true,
				videoData: true,
				lpData: true
			}
		});

		if (!creative) {
			throw error(404, 'Creative not found');
		}

		console.log(`API: Found creative: ${creative.name} (Type: ${creative.type})`);
		return json(creative);
	} catch (err) {
		console.error(`API: Failed to load creative ${creativeId}:`, err);
		// Check if it's an error thrown by SvelteKit's error() helper
		if (err.status && err.body) {
			throw err; // Re-throw SvelteKit errors
		}
		throw error(500, 'Failed to load creative');
	}
};

// PUT /api/creatives/[id]
export const PUT: RequestHandler = async ({ params, request }) => {
	const creativeId = parseInt(params.id, 10);
	if (isNaN(creativeId)) {
		throw error(400, 'Invalid creative ID');
	}

	let requestData;
	try {
		requestData = await request.json();
	} catch (e) {
		throw error(400, 'Invalid JSON body');
	}

	// Separate base data and type-specific data
	const { textData, imageData, videoData, lpData, ...baseData } = requestData;

	// Validate base data
	const baseValidation = baseCreativeSchema.safeParse(baseData);
	if (!baseValidation.success) {
		throw error(400, { message: 'Validation failed (base)', errors: baseValidation.error.flatten().fieldErrors });
	}
	const validatedBaseData = baseValidation.data;

	try {
		console.log(`API: Updating creative with ID: ${creativeId}`);

		// Get existing creative type
		const existingCreative = await getCreativeAndType(creativeId);
		if (!existingCreative) {
			throw error(404, 'Creative not found');
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
		} else if (creativeType === 'video' && videoData) {
			typeValidationResult = videoDataSchema.safeParse(videoData);
			if (typeValidationResult.success) validatedTypeData = typeValidationResult.data;
		} else if (creativeType === 'lp' && lpData) {
			typeValidationResult = lpDataSchema.safeParse(lpData);
			if (typeValidationResult.success) validatedTypeData = typeValidationResult.data;
		}

		if (typeValidationResult && !typeValidationResult.success) {
			throw error(400, { message: `Validation failed (${creativeType} data)`, errors: typeValidationResult.error.flatten().fieldErrors });
		}

		// Use transaction to update base and specific tables
		const updatedCreativeResult = await db.transaction(async (tx) => {
			// 1. Update base creatives table (if data provided)
			const baseUpdateData: Partial<typeof validatedBaseData & { updatedAt: any }> = { ...validatedBaseData };
			// Explicitly remove personaId if it's null or undefined to avoid type error with non-nullable DB column
			if (baseUpdateData.personaId === null || baseUpdateData.personaId === undefined) {
				delete baseUpdateData.personaId;
			}

			let baseDataUpdated = false;
			if (Object.keys(baseUpdateData).length > 0) {
				baseUpdateData.updatedAt = sql`(unixepoch('now') * 1000)`; // Manual update timestamp
				await tx
					.update(creatives)
					.set(baseUpdateData)
					.where(eq(creatives.id, creativeId));
				console.log(`API: Updated base data for creative ID: ${creativeId}`);
				baseDataUpdated = true;
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
					case 'video':
						await tx.update(creativeVideo).set(validatedTypeData).where(eq(creativeVideo.creativeId, creativeId));
						console.log(`API: Updated video data for creative ID: ${creativeId}`);
						break;
					case 'lp':
						// Ensure keySections is handled correctly if it's passed as JSON string vs object
						await tx.update(creativeLp).set(validatedTypeData).where(eq(creativeLp.creativeId, creativeId));
						console.log(`API: Updated LP data for creative ID: ${creativeId}`);
						break;
				}
				// Also update the base table's updatedAt timestamp if only type-specific data changed and base data wasn't already updated
				if (!baseDataUpdated) {
					await tx.update(creatives).set({ updatedAt: sql`(unixepoch('now') * 1000)` }).where(eq(creatives.id, creativeId));
				}
			}

			// 3. Fetch the fully updated creative to return
			return await tx.query.creatives.findFirst({
				where: eq(creatives.id, creativeId),
				with: {
					campaign: { columns: { id: true, name: true } },
					persona: { columns: { id: true, name: true } },
					// theme relation is causing issues, removed for now
					textData: true,
					imageData: true,
					videoData: true,
					lpData: true
				}
			});
		});

		console.log(`API: Creative ${creativeId} updated successfully.`);
		return json(updatedCreativeResult);

	} catch (err: any) {
		console.error(`API: Failed to update creative ${creativeId}:`, err);
		// Check if it's an error thrown by SvelteKit's error() helper
		if (err.status && err.body) {
			throw err; // Re-throw SvelteKit errors
		}
		throw error(500, `Failed to update creative: ${err.message || 'Database error'}`);
	}
};


// DELETE /api/creatives/[id]
export const DELETE: RequestHandler = async ({ params }) => {
	const creativeId = parseInt(params.id, 10);
	if (isNaN(creativeId)) {
		throw error(400, 'Invalid creative ID');
	}

	console.log(`API: Deleting creative with ID: ${creativeId}`);
	try {
		// Check if creative exists
		const existing = await getCreativeAndType(creativeId);
		if (!existing) {
			throw error(404, 'Creative not found');
		}

		// Deleting from 'creatives' table should cascade to the specific type table
		// due to `onDelete: 'cascade'` in the schema definition.
		await db.delete(creatives).where(eq(creatives.id, creativeId));

		console.log(`API: Creative ${creativeId} deleted successfully.`);
		return json({ message: 'Creative deleted successfully' }, { status: 200 });

	} catch (err: any) {
		console.error(`API: Failed to delete creative ${creativeId}:`, err);
		// Check if it's an error thrown by SvelteKit's error() helper
		if (err.status && err.body) {
			throw err; // Re-throw SvelteKit errors
		}
		throw error(500, `Failed to delete creative: ${err.message || 'Database error'}`);
	}
};
