import { db } from '$lib/server/db';
import { videoTemplates, videoFormats } from '$lib/server/db/schema'; // Import table and enum
import { json, error as kitError } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { z } from 'zod';

// --- Validation Schema for Update ---
// Note: templateCode is likely immutable after creation, so not included here.
const updateVideoTemplateSchema = z.object({
	name: z.string().max(150).optional().nullable(),
	durationSeconds: z.number().int().positive().optional().nullable(),
	materialCount: z.number().int().positive().optional().nullable(),
	aspectRatio: z.enum(videoFormats).optional().nullable(),
	sceneCount: z.number().int().positive().optional().nullable(),
	recommendedPlatforms: z.array(z.string()).optional().nullable(), // Expecting array from frontend
	resolution: z.string().max(50).optional().nullable(),
	previewUrl: z.string().url('Invalid Preview URL').optional().nullable()
});

// GET /api/video-templates/[id]
export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		kitError(400, 'Invalid video template ID');
	}

	console.log(`API: Loading video template with ID: ${id}`);
	try {
		const template = await db.query.videoTemplates.findFirst({
			where: eq(videoTemplates.id, id)
		});

		if (!template) {
			kitError(404, 'Video template not found');
		}

		console.log(`API: Found video template: ${template.name || template.templateCode}`);
		return json(template);
	} catch (error) {
		console.error(`API: Failed to load video template ${id}:`, error);
		kitError(500, 'Failed to load video template');
	}
};

// PUT /api/video-templates/[id]
export const PUT: RequestHandler = async ({ params, request }) => {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		kitError(400, 'Invalid video template ID');
	}

	let requestData;
	try {
		requestData = await request.json();
	} catch (e) {
		return json({ message: 'Invalid JSON body' }, { status: 400 });
	}

	const validationResult = updateVideoTemplateSchema.safeParse(requestData);

	if (!validationResult.success) {
		const errors = validationResult.error.flatten();
		console.error(`API Video Template Update Validation Failed (ID: ${id}):`, errors);
		return json({ message: 'Validation failed', errors: errors.fieldErrors }, { status: 400 });
	}

	const validatedData = validationResult.data;

	try {
		console.log(`API: Updating video template with ID: ${id}`);
		const [updatedTemplate] = await db
			.update(videoTemplates)
			.set({
				...validatedData, // Spread validated fields
				updatedAt: sql`(unixepoch('now') * 1000)` // Manually set updatedAt
			})
			.where(eq(videoTemplates.id, id))
			.returning();

		if (!updatedTemplate) {
			kitError(404, 'Video template not found for update');
		}

		console.log(`API: Video template ${id} updated successfully.`);
		return json(updatedTemplate);

	} catch (error: any) {
		console.error(`API: Failed to update video template ${id}:`, error);
		kitError(500, `Failed to update video template: ${error.message || 'Database error'}`);
	}
};

// DELETE /api/video-templates/[id]
export const DELETE: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		kitError(400, 'Invalid video template ID');
	}

	try {
		console.log(`API: Deleting video template with ID: ${id}`);
		// Check if template is linked to any videos first? Optional, depends on desired behavior.
		// For now, allow deletion. Foreign key constraint on creativeVideo.templateId is 'set null'.

		const [deletedTemplate] = await db
			.delete(videoTemplates)
			.where(eq(videoTemplates.id, id))
			.returning({ id: videoTemplates.id });

		if (!deletedTemplate) {
			kitError(404, 'Video template not found for deletion');
		}

		console.log(`API: Video template ${id} deleted successfully.`);
		return json({ message: `Video template ${id} deleted successfully`, id: deletedTemplate.id }, { status: 200 });

	} catch (error: any) {
		console.error(`API: Failed to delete video template ${id}:`, error);
		kitError(500, `Failed to delete video template: ${error.message || 'Database error'}`);
	}
};
