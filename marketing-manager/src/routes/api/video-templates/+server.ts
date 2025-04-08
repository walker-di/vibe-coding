import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { videoTemplates, videoFormats } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Schema for validating new video template data
const createVideoTemplateSchema = z.object({
	templateCode: z.string().min(1, 'Template code is required').max(50), // Added max length
	name: z.string().max(150).optional().nullable(),
	durationSeconds: z.number().int().positive().optional().nullable(),
	materialCount: z.number().int().positive().optional().nullable(),
	aspectRatio: z.enum(videoFormats).optional().nullable(),
	sceneCount: z.number().int().positive().optional().nullable(),
	recommendedPlatforms: z.array(z.string()).optional().nullable(), // Expecting an array of strings
	resolution: z.string().max(50).optional().nullable(),
	previewUrl: z.string().url('Invalid preview URL format').max(500).optional().nullable(),
});

/**
 * GET /api/video-templates
 * Retrieves a list of all video templates.
 */
export async function GET() {
	try {
		const allTemplates = await db.select().from(videoTemplates).orderBy(videoTemplates.name); // Order by name
		// Drizzle automatically handles JSON parsing for the 'json' mode field
		return json(allTemplates);
	} catch (e: any) {
		console.error('Failed to fetch video templates:', e);
		throw error(500, 'Failed to load video templates');
	}
}

/**
 * POST /api/video-templates
 * Creates a new video template.
 */
export async function POST({ request }) {
	let requestData;
	try {
		requestData = await request.json();
	} catch (e) {
		throw error(400, 'Invalid JSON format');
	}

	const validationResult = createVideoTemplateSchema.safeParse(requestData);

	if (!validationResult.success) {
		return json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
	}

	const data = validationResult.data;

	try {
        // Check if templateCode already exists
        if (data.templateCode) {
            const existing = await db.select({ id: videoTemplates.id }).from(videoTemplates).where(eq(videoTemplates.templateCode, data.templateCode)).get();
            if (existing) {
                return json({ errors: { templateCode: 'Template code must be unique' } }, { status: 400 });
            }
        }

		const [newTemplate] = await db.insert(videoTemplates).values({
			...data,
            // Ensure recommendedPlatforms is stored correctly (Drizzle handles JSON stringification)
            recommendedPlatforms: data.recommendedPlatforms ?? null,
			// createdAt is handled by default SQL value
		}).returning({ id: videoTemplates.id });

		if (!newTemplate || !newTemplate.id) {
			throw error(500, 'Failed to create video template: No ID returned');
		}

		// Fetch the newly created template to return the full object
        const createdTemplate = await db.select().from(videoTemplates).where(eq(videoTemplates.id, newTemplate.id)).get();

        if (!createdTemplate) {
            throw error(500, 'Failed to retrieve newly created video template');
        }

		return json(createdTemplate, { status: 201 }); // 201 Created status

	} catch (e: any) {
		console.error('Failed to create video template:', e);
        // Drizzle might throw specific errors for unique constraints, handle if needed
		throw error(500, `Failed to create video template: ${e.message}`);
	}
}
