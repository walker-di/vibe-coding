import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { themes } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

// Schema for validating theme updates (all fields optional)
const updateThemeSchema = z.object({
	title: z.string().min(1, 'Title cannot be empty').max(150).optional(),
	description: z.string().max(500).optional().nullable(),
	associatedPainPoint: z.string().max(255).optional().nullable(),
}).refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update", // Ensure at least one field is being updated
});


/**
 * GET /api/themes/[id]
 * Retrieves a specific theme by its ID.
 */
export async function GET({ params }) {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		throw error(400, 'Invalid theme ID');
	}

	try {
		const theme = await db.select().from(themes).where(eq(themes.id, id)).get();

		if (!theme) {
			throw error(404, 'Theme not found');
		}
		return json(theme);
	} catch (e: any) {
        if (e.status === 404) throw e; // Re-throw known 404
		console.error(`Failed to fetch theme ${id}:`, e);
		throw error(500, `Failed to load theme ${id}`);
	}
}

/**
 * PUT /api/themes/[id]
 * Updates an existing theme.
 */
export async function PUT({ params, request }) {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		throw error(400, 'Invalid theme ID');
	}

	let requestData;
	try {
		requestData = await request.json();
	} catch (e) {
		throw error(400, 'Invalid JSON format');
	}

	const validationResult = updateThemeSchema.safeParse(requestData);

	if (!validationResult.success) {
		return json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
	}

	const dataToUpdate = validationResult.data;

	try {
        // Check if theme exists before updating
        const existingTheme = await db.select({ id: themes.id }).from(themes).where(eq(themes.id, id)).get();
        if (!existingTheme) {
            throw error(404, 'Theme not found');
        }

		// Manually set updatedAt timestamp
		const updateTimestamp = new Date();

		const [updatedTheme] = await db.update(themes)
			.set({
				...dataToUpdate,
				updatedAt: updateTimestamp, // Manually set update time
			})
			.where(eq(themes.id, id))
			.returning(); // Return the full updated object

        if (!updatedTheme) {
             // This case might be redundant due to the check above, but good for safety
            throw error(404, 'Theme not found after update attempt');
        }

		return json(updatedTheme);

	} catch (e: any) {
        if (e.status === 404) throw e; // Re-throw known 404
		console.error(`Failed to update theme ${id}:`, e);
        // Could add check for unique constraint errors if title needs to be unique
		throw error(500, `Failed to update theme ${id}: ${e.message}`);
	}
}

/**
 * DELETE /api/themes/[id]
 * Deletes a specific theme by its ID.
 */
export async function DELETE({ params }) {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		throw error(400, 'Invalid theme ID');
	}

	try {
        // Check if theme exists before deleting
        const existingTheme = await db.select({ id: themes.id }).from(themes).where(eq(themes.id, id)).get();
        if (!existingTheme) {
            throw error(404, 'Theme not found');
        }

		const result = await db.delete(themes).where(eq(themes.id, id)).run();

        // better-sqlite3 driver might return changes: 0 if not found, though we check above
		if (result.changes === 0) {
            // This case might be redundant due to the check above, but good for safety
			throw error(404, 'Theme not found, cannot delete');
		}

		return new Response(null, { status: 204 }); // 204 No Content on successful deletion

	} catch (e: any) {
        if (e.status === 404) throw e; // Re-throw known 404
		console.error(`Failed to delete theme ${id}:`, e);
		throw error(500, `Failed to delete theme ${id}: ${e.message}`);
	}
}
