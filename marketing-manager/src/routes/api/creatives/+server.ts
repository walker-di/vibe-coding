import { db } from '$lib/server/db';
// Import necessary tables and enums
import { creatives, creativeText, creativeImage, creativeVideo, creativeLp } from '$lib/server/db/schema'; // Import tables
import { creativeTypes, videoPlatforms, videoFormats, videoEmotions } from '$lib/components/constants'; // Import constants
import { json, error } from '@sveltejs/kit';
import { desc, eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { z } from 'zod'; // For validation

// --- Validation Schemas ---

// Base schema for common creative fields
const baseCreativeSchema = z.object({
	name: z.string().min(1, 'Creative name is required.').max(150),
	description: z.string().max(500).optional().nullable(),
	campaignId: z.number().int().positive().optional().nullable(),
	personaId: z.number().int().positive(), // Made required (removed optional/nullable)
	themeId: z.number().int().positive().optional().nullable(),
	// Type will be validated specifically based on payload
});

// Schema for Text Creative specific fields
const textDataSchema = z.object({
	headline: z.string().max(200).optional().nullable(),
	body: z.string().min(1, 'Body text is required.'),
	callToAction: z.string().max(100).optional().nullable(),
	appealFeature: z.string().max(255).optional().nullable(), // Added
	emotion: z.string().max(100).optional().nullable(), // Added
	platformNotes: z.string().max(500).optional().nullable() // Added
});

// Schema for Image Creative specific fields
const imageDataSchema = z.object({
	imageUrl: z.union([
		z.string().url('Invalid Image URL.'),
		z.string().max(0), // Allow empty string
		z.null() // Allow null
	]).optional(), // Made optional
	altText: z.string().max(200).optional().nullable(),
	// width/height are optional, might be set later or derived
	width: z.number().int().positive().optional().nullable(),
	height: z.number().int().positive().optional().nullable(),
	appealFeature: z.string().max(255).optional().nullable(), // Added
	emotion: z.string().max(100).optional().nullable(), // Added
	platformNotes: z.string().max(500).optional().nullable() // Added
});

// Schema for Video Creative specific fields
const videoDataSchema = z.object({
	videoUrl: z.string().url('Invalid Video URL.').optional().nullable(),
	platform: z.enum(videoPlatforms).optional().nullable(),
	format: z.enum(videoFormats).optional().nullable(), // Add format validation
	duration: z.number().int().positive('Duration must be a positive integer.').optional().nullable(),
	appealFeature: z.string().max(255).optional().nullable(), // Keep simple string for now
	emotion: z.enum(videoEmotions).optional().nullable(),
	templateId: z.number().int().positive().optional().nullable()
});

// Schema for LP Creative specific fields
const lpDataSchema = z.object({
	pageUrl: z.string().url('Invalid Page URL.').min(1, 'Page URL is required.'),
	headline: z.string().max(200).optional().nullable(),
	keySections: z.array(z.object({ title: z.string() })).optional().nullable(), // Validate as array of objects
	appealFeature: z.string().max(255).optional().nullable(), // Added
	emotion: z.string().max(100).optional().nullable(), // Added
	platformNotes: z.string().max(500).optional().nullable() // Added
});


// Combined schema using discriminated union based on 'type'
const createCreativeSchema = z.discriminatedUnion("type", [
	baseCreativeSchema.extend({ type: z.literal(creativeTypes[0]), textData: textDataSchema }), // 'text'
	baseCreativeSchema.extend({ type: z.literal(creativeTypes[1]), imageData: imageDataSchema }), // 'image'
	baseCreativeSchema.extend({ type: z.literal(creativeTypes[2]), videoData: videoDataSchema }), // 'video'
	baseCreativeSchema.extend({ type: z.literal(creativeTypes[3]), lpData: lpDataSchema }), // 'lp'
]);

// GET /api/creatives
export const GET: RequestHandler = async ({ url }) => {
	console.log('API: Loading creatives from database...');
	try {
		// Read query parameters
		const personaIdParam = url.searchParams.get('personaId');
		const campaignIdParam = url.searchParams.get('campaignId');
		const typeParam = url.searchParams.get('type');

		// Build where conditions
		let conditions = [];

		if (personaIdParam) {
			const personaId = parseInt(personaIdParam, 10);
			if (isNaN(personaId)) {
				console.warn(`API: Invalid personaId parameter received: ${personaIdParam}`);
				throw error(400, 'Invalid personaId parameter');
			}
			console.log(`API: Filtering creatives by personaId: ${personaId}`);
			conditions.push(eq(creatives.personaId, personaId));
		}

		if (campaignIdParam) {
			const campaignId = parseInt(campaignIdParam, 10);
			if (isNaN(campaignId)) {
				console.warn(`API: Invalid campaignId parameter received: ${campaignIdParam}`);
				throw error(400, 'Invalid campaignId parameter');
			}
			console.log(`API: Filtering creatives by campaignId: ${campaignId}`);
			conditions.push(eq(creatives.campaignId, campaignId));
		}

		if (typeParam) {
			if (!creativeTypes.includes(typeParam)) {
				console.warn(`API: Invalid type parameter received: ${typeParam}`);
				throw error(400, `Invalid type parameter. Must be one of: ${creativeTypes.join(', ')}`);
			}
			console.log(`API: Filtering creatives by type: ${typeParam}`);
			conditions.push(eq(creatives.type, typeParam));
		}

		// Combine conditions if needed
		let whereCondition = undefined;
		if (conditions.length === 1) {
			whereCondition = conditions[0];
		} else if (conditions.length > 1) {
			// Use and() to combine multiple conditions
			whereCondition = and(...conditions);
		}

		const results = await db.query.creatives.findMany({
			where: whereCondition,
			orderBy: [desc(creatives.createdAt)],
			with: {
				campaign: { columns: { id: true, name: true } },
				persona: { columns: { id: true, name: true } }
				// theme relation is causing issues, removed for now
			}
		});

		console.log(`API: Found ${results.length} creatives matching filter.`);
		return json(results);
	} catch (err) {
		console.error('API: Failed to load creatives:', err);
		// Check if it's an error thrown by SvelteKit's error() helper
		if (err.status && err.body) {
			throw err; // Re-throw SvelteKit errors
		}
		throw error(500, 'Failed to load creatives');
	}
};

// POST /api/creatives
export const POST: RequestHandler = async ({ request }) => {
	let requestData;
	try {
		requestData = await request.json();
		console.log('API POST /api/creatives: Received request data:', JSON.stringify(requestData, null, 2));
	} catch (e) {
		console.error('API POST /api/creatives: Invalid JSON format', e);
		throw error(400, 'Invalid JSON body');
	}

	console.log('API POST /api/creatives: Validating request data...');
	const validationResult = createCreativeSchema.safeParse(requestData);

	if (!validationResult.success) {
		const errors = validationResult.error.flatten();
		console.error("API Creative Validation Failed:", errors);
		throw error(400, { message: 'Validation failed', errors: errors.fieldErrors });
	}

	const validatedData = validationResult.data;

	try {
		console.log(`API: Creating new creative of type: ${validatedData.type}. Starting transaction...`);

		const newCreativeId = await db.transaction(async (tx) => {
			console.log('API: Inside transaction - Inserting into creatives table...');
			// 1. Insert into the main creatives table
			const [newCreative] = await tx
				.insert(creatives)
				.values({
					name: validatedData.name,
					description: validatedData.description,
					type: validatedData.type,
					campaignId: validatedData.campaignId,
					personaId: validatedData.personaId,
					themeId: validatedData.themeId,
					// createdAt/updatedAt handled by defaults/triggers or manual setting
				})
				.returning({ id: creatives.id });

			const creativeId = newCreative.id;

			// 2. Insert into the type-specific table
			switch (validatedData.type) {
				case 'text':
					await tx.insert(creativeText).values({
						creativeId: creativeId,
						headline: validatedData.textData.headline,
						body: validatedData.textData.body,
						callToAction: validatedData.textData.callToAction,
						appealFeature: validatedData.textData.appealFeature,
						emotion: validatedData.textData.emotion,
						platformNotes: validatedData.textData.platformNotes
					});
					console.log(`API: Transaction - Inserted text data for creative ID: ${creativeId}`);
					break;
				case 'image':
					await tx.insert(creativeImage).values({
						creativeId: creativeId,
						imageUrl: validatedData.imageData.imageUrl,
						altText: validatedData.imageData.altText,
						width: validatedData.imageData.width,
						height: validatedData.imageData.height,
						appealFeature: validatedData.imageData.appealFeature,
						emotion: validatedData.imageData.emotion,
						platformNotes: validatedData.imageData.platformNotes
					});
					console.log(`API: Transaction - Inserted image data for creative ID: ${creativeId}`);
					break;
				case 'video':
					await tx.insert(creativeVideo).values({
						creativeId: creativeId,
						videoUrl: validatedData.videoData.videoUrl,
						platform: validatedData.videoData.platform,
						format: validatedData.videoData.format,
						duration: validatedData.videoData.duration,
						appealFeature: validatedData.videoData.appealFeature,
						emotion: validatedData.videoData.emotion,
						templateId: validatedData.videoData.templateId
					});
					console.log(`API: Transaction - Inserted video data for creative ID: ${creativeId}`);
					break;
				case 'lp':
					await tx.insert(creativeLp).values({
						creativeId: creativeId,
						pageUrl: validatedData.lpData.pageUrl,
						headline: validatedData.lpData.headline,
						keySections: validatedData.lpData.keySections,
						appealFeature: validatedData.lpData.appealFeature,
						emotion: validatedData.lpData.emotion,
						platformNotes: validatedData.lpData.platformNotes
					});
					console.log(`API: Transaction - Inserted LP data for creative ID: ${creativeId}`);
					break;
				default:
					// This case should be unreachable due to Zod validation
					console.error(`API: Transaction - Reached default case for unhandled creative type.`);
					throw new Error(`Unhandled creative type.`);
			}

			console.log(`API: Transaction completed for creative ID: ${creativeId}`);
			return creativeId; // Return the ID from the transaction
		});

		// Fetch the newly created creative to return complete data
		const newCreative = await db.query.creatives.findFirst({
			where: eq(creatives.id, newCreativeId),
			with: {
				campaign: { columns: { id: true, name: true } },
				persona: { columns: { id: true, name: true } },
				// theme relation is causing issues, removed for now
				textData: validatedData.type === 'text',
				imageData: validatedData.type === 'image',
				videoData: validatedData.type === 'video',
				lpData: validatedData.type === 'lp'
			}
		});

		console.log(`API: New creative created successfully with ID: ${newCreativeId}`);
		return json(newCreative, { status: 201 });

	} catch (err: any) {
		console.error('API: Failed to create creative:', err);
		// Check if it's an error thrown by SvelteKit's error() helper
		if (err.status && err.body) {
			throw err; // Re-throw SvelteKit errors
		}
		throw error(500, `Failed to create creative: ${err.message || 'Database error'}`);
	}
};

// PUT /api/creatives/[id] (To be implemented later in [id]/+server.ts)
// DELETE /api/creatives/[id] (To be implemented later in [id]/+server.ts)
