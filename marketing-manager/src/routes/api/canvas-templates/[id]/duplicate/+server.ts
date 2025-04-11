import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { canvasTemplates } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// POST /api/canvas-templates/[id]/duplicate - Duplicate a template
export const POST: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		throw error(400, 'Invalid template ID');
	}

	try {
		// 1. Fetch the original template
		const originalTemplateArr = await db
			.select() // Select all fields
			.from(canvasTemplates)
			.where(eq(canvasTemplates.id, id))
			.limit(1);

		if (!originalTemplateArr || originalTemplateArr.length === 0) {
			throw error(404, 'Original canvas template not found');
		}
		const originalTemplate = originalTemplateArr[0];

		// 2. Prepare data for the new template
		const newTemplateData = {
			name: `Copy of ${originalTemplate.name}`,
			description: originalTemplate.description,
			aspectRatio: originalTemplate.aspectRatio,
			resolution: originalTemplate.resolution,
			canvasData: originalTemplate.canvasData, // Copy canvas data JSON string
			previewImageUrl: originalTemplate.previewImageUrl, // Copy preview image URL
			// createdAt will be set by default
			updatedAt: null // Ensure updatedAt is null for the new copy
		};

		// 3. Insert the new template into the database
		const result = await db.insert(canvasTemplates).values(newTemplateData).returning();

		if (!result || result.length === 0) {
			throw error(500, 'Failed to create duplicated canvas template in database');
		}

		// 4. Return the newly created template
		return json(result[0], { status: 201 });

	} catch (err: any) {
		console.error(`Error duplicating canvas template ${id}:`, err);
		if (err.status) {
			// Re-throw SvelteKit errors (like 400, 404)
			throw err;
		}
		// Handle potential database errors (e.g., constraints if name had a unique index)
		throw error(500, `Failed to duplicate canvas template: ${err.message || 'Internal Server Error'}`);
	}
};
