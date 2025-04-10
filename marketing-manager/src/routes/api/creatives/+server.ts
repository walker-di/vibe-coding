import { db } from '$lib/server/db';
// Import necessary tables and enums
import { creatives, creativeText, creativeImage, creativeVideo, creativeLp } from '$lib/server/db/schema'; // Import tables
import { creativeTypes, videoPlatforms, videoFormats, videoEmotions } from '$lib/components/constants'; // Import constants
import { json, error as kitError } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { z } from 'zod'; // For validation

// --- Validation Schemas ---

// Base schema for common creative fields
const baseCreativeSchema = z.object({
	name: z.string().min(1, 'Creative name is required.').max(150),
	description: z.string().max(500).optional().nullable(),
	campaignId: z.number().int().positive().optional().nullable(),
	personaId: z.number().int().positive(), // Made required (removed optional/nullable)
	// themeId field removed from schema
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
		// TODO: Add other filters (campaignId, themeId, type) later
		// const campaignIdParam = url.searchParams.get('campaignId');
		// const typeParam = url.searchParams.get('type');

		let whereCondition = undefined;
		if (personaIdParam) {
			const personaId = parseInt(personaIdParam, 10);
			if (!isNaN(personaId)) {
				console.log(`API: Filtering creatives by personaId: ${personaId}`);
				whereCondition = eq(creatives.personaId, personaId);
			} else {
				console.warn(`API: Invalid personaId parameter received: ${personaIdParam}`);
				// Optionally return 400 Bad Request if personaId is invalid format
			}
		}
		// TODO: Add conditions for other filters using `and()` if needed

		const results = await db.query.creatives.findMany({
			where: whereCondition, // Apply the where condition
			orderBy: [desc(creatives.createdAt)],
			// Include basic related data for list display
			with: {
				campaign: { columns: { id: true, name: true } },
				persona: { columns: { id: true, name: true } }
				// Specific type data could be fetched on detail view
			}
		});

		console.log(`API: Found ${results.length} creatives matching filter.`);
		// If no results found for a specific filter, return empty array (not 404)
		return json(results);
	} catch (error) {
		console.error('API: Failed to load creatives:', error);
		kitError(500, 'Failed to load creatives');
	}
};

// POST /api/creatives
export const POST: RequestHandler = async ({ request }) => {
	let requestData;
	try {
		requestData = await request.json();
		console.log('API POST /api/creatives: Received request data:', JSON.stringify(requestData, null, 2)); // Log received data
	} catch (e) {
		console.error('API POST /api/creatives: Invalid JSON format', e); // Log error
		return json({ message: 'Invalid JSON body' }, { status: 400 });
	}

	console.log('API POST /api/creatives: Validating request data...'); // Log before validation
	const validationResult = createCreativeSchema.safeParse(requestData);

	if (!validationResult.success) {
		const errors = validationResult.error.flatten(); // Use flatten for better error structure
		console.error("API Creative Validation Failed:", errors);
		return json({ message: 'Validation failed', errors: errors.fieldErrors }, { status: 400 });
	}

	const validatedData = validationResult.data;

	try {
		console.log(`API: Creating new creative of type: ${validatedData.type}. Starting transaction...`); // Log before transaction

		const newCreativeId = await db.transaction(async (tx) => {
			console.log('API: Inside transaction - Inserting into creatives table...'); // Log inside transaction
			// 1. Insert into the main creatives table
			const [newCreative] = await tx
				.insert(creatives)
				.values({
					name: validatedData.name,
					description: validatedData.description,
					type: validatedData.type,
					campaignId: validatedData.campaignId,
					personaId: validatedData.personaId,
					// themeId field removed from schema
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
						appealFeature: validatedData.textData.appealFeature, // Added
						emotion: validatedData.textData.emotion, // Added
						platformNotes: validatedData.textData.platformNotes // Added
					});
					console.log(`API: Transaction - Inserted text data for creative ID: ${creativeId}`); // Log specific type
					break;
				case 'image':
					await tx.insert(creativeImage).values({
						creativeId: creativeId,
						imageUrl: validatedData.imageData.imageUrl,
						altText: validatedData.imageData.altText,
						width: validatedData.imageData.width,
						height: validatedData.imageData.height,
						appealFeature: validatedData.imageData.appealFeature, // Added
						emotion: validatedData.imageData.emotion, // Added
						platformNotes: validatedData.imageData.platformNotes // Added
					});
					console.log(`API: Transaction - Inserted image data for creative ID: ${creativeId}`); // Log specific type
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
					console.log(`API: Transaction - Inserted video data for creative ID: ${creativeId}`); // Log specific type
					break;
				case 'lp':
					await tx.insert(creativeLp).values({
						creativeId: creativeId,
						pageUrl: validatedData.lpData.pageUrl,
						headline: validatedData.lpData.headline,
						keySections: validatedData.lpData.keySections, // Store parsed JSON
						appealFeature: validatedData.lpData.appealFeature, // Added
						emotion: validatedData.lpData.emotion, // Added
						platformNotes: validatedData.lpData.platformNotes // Added
					});
					console.log(`API: Transaction - Inserted LP data for creative ID: ${creativeId}`); // Log specific type
					break;
				default:
					// This case should be unreachable due to Zod validation
					// If reached, the transaction will automatically roll back.
					console.error(`API: Transaction - Reached default case for unhandled creative type.`); // Log unhandled type without accessing validatedData.type
					throw new Error(`Unhandled creative type.`);
			}

			console.log(`API: Transaction completed for creative ID: ${creativeId}`); // Log transaction end
			return creativeId; // Return the ID from the transaction
		});

		console.log(`API: New creative created successfully with ID: ${newCreativeId}. Returning response.`); // Log success
		return json({ id: newCreativeId, name: validatedData.name, type: validatedData.type }, { status: 201 });

	} catch (error: any) {
		console.error('API: Failed to create creative (outside or after transaction):', error); // Log final catch block
		// Check for specific DB errors if needed (e.g., foreign key constraint)
		kitError(500, `Failed to create creative: ${error.message || 'Database error'}`);
	}
};

// PUT /api/creatives/[id] (To be implemented later in [id]/+server.ts)
// DELETE /api/creatives/[id] (To be implemented later in [id]/+server.ts)
