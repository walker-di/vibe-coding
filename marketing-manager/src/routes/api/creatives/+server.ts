import { db } from '$lib/server/db';
// Import necessary tables and enums
import { creatives, creativeText, creativeImage, creativeVideo, creativeLp, creativeTypes, videoPlatforms, videoFormats, videoEmotions } from '$lib/server/db/schema';
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
	personaId: z.number().int().positive().optional().nullable(),
	themeId: z.number().int().positive().optional().nullable(),
	// Type will be validated specifically based on payload
});

// Schema for Text Creative specific fields
const textDataSchema = z.object({
	headline: z.string().max(200).optional().nullable(),
	body: z.string().min(1, 'Body text is required.'),
	callToAction: z.string().max(100).optional().nullable()
});

// Schema for Image Creative specific fields
const imageDataSchema = z.object({
	imageUrl: z.string().url('Invalid Image URL.').min(1, 'Image URL is required.'),
	altText: z.string().max(200).optional().nullable(),
	// width/height are optional, might be set later or derived
	width: z.number().int().positive().optional().nullable(),
	height: z.number().int().positive().optional().nullable()
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
	keySections: z.array(z.object({ title: z.string() })).optional().nullable() // Validate as array of objects
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
		// TODO: Add filtering based on query params (campaignId, personaId, themeId, type) later
		// const campaignId = url.searchParams.get('campaignId');
		// const personaId = url.searchParams.get('personaId');
		// const type = url.searchParams.get('type');

		const allCreatives = await db.query.creatives.findMany({
			orderBy: [desc(creatives.createdAt)],
			// Include basic related data for list display if needed
			with: {
				campaign: { columns: { id: true, name: true } },
				persona: { columns: { id: true, name: true } },
				theme: { columns: { id: true, title: true } }
				// Specific type data could be fetched on detail view or conditionally here
			}
			// Add where clause here for filtering later
		});

		console.log(`API: Found ${allCreatives.length} creatives.`);
		return json(allCreatives);
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
	} catch (e) {
		return json({ message: 'Invalid JSON body' }, { status: 400 });
	}

	const validationResult = createCreativeSchema.safeParse(requestData);

	if (!validationResult.success) {
		const errors = validationResult.error.flatten(); // Use flatten for better error structure
		console.error("API Creative Validation Failed:", errors);
		return json({ message: 'Validation failed', errors: errors.fieldErrors }, { status: 400 });
	}

	const validatedData = validationResult.data;

	try {
		console.log(`API: Creating new creative of type: ${validatedData.type}`);

		const newCreativeId = await db.transaction(async (tx) => {
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
						callToAction: validatedData.textData.callToAction
					});
					console.log(`API: Inserted text data for creative ID: ${creativeId}`);
					break;
				case 'image':
					await tx.insert(creativeImage).values({
						creativeId: creativeId,
						imageUrl: validatedData.imageData.imageUrl,
						altText: validatedData.imageData.altText,
						width: validatedData.imageData.width,
						height: validatedData.imageData.height
					});
					console.log(`API: Inserted image data for creative ID: ${creativeId}`);
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
					console.log(`API: Inserted video data for creative ID: ${creativeId}`);
					break;
				case 'lp':
					await tx.insert(creativeLp).values({
						creativeId: creativeId,
						pageUrl: validatedData.lpData.pageUrl,
						headline: validatedData.lpData.headline,
						keySections: validatedData.lpData.keySections // Store parsed JSON
					});
					console.log(`API: Inserted LP data for creative ID: ${creativeId}`);
					break;
				default:
					// This case should be unreachable due to Zod validation
					// If reached, the transaction will automatically roll back.
					console.error(`API: Unhandled creative type in transaction.`);
					throw new Error(`Unhandled creative type.`);
			}

			return creativeId; // Return the ID from the transaction
		});

		console.log(`API: New creative created successfully with ID: ${newCreativeId}`);
		return json({ id: newCreativeId, name: validatedData.name, type: validatedData.type }, { status: 201 });

	} catch (error: any) {
		console.error('API: Failed to create creative:', error);
		// Check for specific DB errors if needed (e.g., foreign key constraint)
		kitError(500, `Failed to create creative: ${error.message || 'Database error'}`);
	}
};

// PUT /api/creatives/[id] (To be implemented later in [id]/+server.ts)
// DELETE /api/creatives/[id] (To be implemented later in [id]/+server.ts)
