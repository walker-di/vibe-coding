import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { videoTemplates, videoFormats } from '$lib/server/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { z } from 'zod';

// Schema for validating video template updates (all fields optional)
const updateVideoTemplateSchema = z.object({
	templateCode: z.string().min(1, 'Template code cannot be empty').max(50).optional(),
	name: z.string().max(150).optional().nullable(),
	durationSeconds: z.number().int().positive().optional().nullable(),
	materialCount: z.number().int().positive().optional().nullable(),
	aspectRatio: z.enum(videoFormats).optional().nullable(),
	sceneCount: z.number().int().positive().optional().nullable(),
	recommendedPlatforms: z.array(z.string()).optional().nullable(),
	resolution: z.string().max(50).optional().nullable(),
	previewUrl: z.string().url('Invalid preview URL format').max(500).optional().nullable(),
}).refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
});


/**
 * GET /api/video-templates/[id]
 * Retrieves a specific video template by its ID.
 */
export async function GET({ params }) {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		throw error(400, 'Invalid video template ID');
	}

	try {
		const template = await db.select().from(videoTemplates).where(eq(videoTemplates.id, id)).get();

		if (!template) {
			throw error(404, 'Video template not found');
		}
		// Drizzle automatically handles JSON parsing for the 'json' mode field
		return json(template);
	} catch (e: any) {
        if (e.status === 404) throw e; // Re-throw known 404
		console.error(`Failed to fetch video template ${id}:`, e);
		throw error(500, `Failed to load video template ${id}`);
	}
}

/**
 * PUT /api/video-templates/[id]
 * Updates an existing video template.
 */
export async function PUT({ params, request }) {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		throw error(400, 'Invalid video template ID');
	}

	let requestData;
	try {
		requestData = await request.json();
	} catch (e) {
		throw error(400, 'Invalid JSON format');
	}

	const validationResult = updateVideoTemplateSchema.safeParse(requestData);

	if (!validationResult.success) {
		return json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
	}

	const dataToUpdate = validationResult.data;

	try {
        // Check if template exists before updating
        const existingTemplate = await db.select({ id: videoTemplates.id }).from(videoTemplates).where(eq(videoTemplates.id, id)).get();
        if (!existingTemplate) {
            throw error(404, 'Video template not found');
        }

        // If templateCode is being updated, check if the new code is already taken by another template
        if (dataToUpdate.templateCode) {
            const conflictingTemplate = await db.select({ id: videoTemplates.id })
                .from(videoTemplates)
                .where(and(
                    eq(videoTemplates.templateCode, dataToUpdate.templateCode),
                    ne(videoTemplates.id, id) // Exclude the current template being updated
                ))
                .get();

            if (conflictingTemplate) {
                 return json({ errors: { templateCode: 'Template code must be unique' } }, { status: 400 });
            }
        }

		// Manually set updatedAt timestamp
		const updateTimestamp = new Date();

		const [updatedTemplate] = await db.update(videoTemplates)
			.set({
				...dataToUpdate,
                // Ensure recommendedPlatforms is stored correctly
                recommendedPlatforms: dataToUpdate.recommendedPlatforms ?? undefined, // Use undefined if not present to avoid overwriting with null
				updatedAt: updateTimestamp,
			})
			.where(eq(videoTemplates.id, id))
			.returning();

        if (!updatedTemplate) {
            throw error(404, 'Video template not found after update attempt');
        }

		return json(updatedTemplate);

	} catch (e: any) {
        if (e.status === 404) throw e; // Re-throw known 404
		console.error(`Failed to update video template ${id}:`, e);
		throw error(500, `Failed to update video template ${id}: ${e.message}`);
	}
}

/**
 * DELETE /api/video-templates/[id]
 * Deletes a specific video template by its ID.
 */
export async function DELETE({ params }) {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		throw error(400, 'Invalid video template ID');
	}

	try {
        // Check if template exists before deleting
        const existingTemplate = await db.select({ id: videoTemplates.id }).from(videoTemplates).where(eq(videoTemplates.id, id)).get();
        if (!existingTemplate) {
            throw error(404, 'Video template not found');
        }

		const result = await db.delete(videoTemplates).where(eq(videoTemplates.id, id)).run();

		if (result.changes === 0) {
			throw error(404, 'Video template not found, cannot delete');
		}

		return new Response(null, { status: 204 }); // 204 No Content

	} catch (e: any) {
        if (e.status === 404) throw e; // Re-throw known 404
		console.error(`Failed to delete video template ${id}:`, e);
        // Consider potential foreign key constraint errors if videos are linked
		throw error(500, `Failed to delete video template ${id}: ${e.message}`);
	}
}
