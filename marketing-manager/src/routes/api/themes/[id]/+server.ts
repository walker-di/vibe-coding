import { db } from '$lib/server/db';
import { themes } from '$lib/server/db/schema';
import { json, error as kitError } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { z } from 'zod';

// --- Validation Schema for Update ---
const updateThemeSchema = z.object({
	title: z.string().min(1, 'Title is required.').max(150),
	description: z.string().max(500).optional().nullable(),
	associatedPainPoint: z.string().max(255).optional().nullable()
});

// GET /api/themes/[id]
export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		kitError(400, 'Invalid theme ID');
	}

	console.log(`API: Loading theme with ID: ${id}`);
	try {
		const theme = await db.query.themes.findFirst({
			where: eq(themes.id, id)
		});

		if (!theme) {
			kitError(404, 'Theme not found');
		}

		console.log(`API: Found theme: ${theme.title}`);
		return json(theme);
	} catch (error) {
		console.error(`API: Failed to load theme ${id}:`, error);
		kitError(500, 'Failed to load theme');
	}
};

// PUT /api/themes/[id]
export const PUT: RequestHandler = async ({ params, request }) => {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		kitError(400, 'Invalid theme ID');
	}

	let requestData;
	try {
		requestData = await request.json();
	} catch (e) {
		return json({ message: 'Invalid JSON body' }, { status: 400 });
	}

	const validationResult = updateThemeSchema.safeParse(requestData);

	if (!validationResult.success) {
		const errors = validationResult.error.flatten();
		console.error(`API Theme Update Validation Failed (ID: ${id}):`, errors);
		return json({ message: 'Validation failed', errors: errors.fieldErrors }, { status: 400 });
	}

	const validatedData = validationResult.data;

	try {
		console.log(`API: Updating theme with ID: ${id}`);
		const [updatedTheme] = await db
			.update(themes)
			.set({
				title: validatedData.title,
				description: validatedData.description,
				associatedPainPoint: validatedData.associatedPainPoint,
				updatedAt: sql`(unixepoch('now') * 1000)` // Manually set updatedAt
			})
			.where(eq(themes.id, id))
			.returning();

		if (!updatedTheme) {
			kitError(404, 'Theme not found for update');
		}

		console.log(`API: Theme ${id} updated successfully.`);
		return json(updatedTheme);

	} catch (error: any) {
		console.error(`API: Failed to update theme ${id}:`, error);
		kitError(500, `Failed to update theme: ${error.message || 'Database error'}`);
	}
};

// DELETE /api/themes/[id]
export const DELETE: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		kitError(400, 'Invalid theme ID');
	}

	try {
		console.log(`API: Deleting theme with ID: ${id}`);
		const [deletedTheme] = await db
			.delete(themes)
			.where(eq(themes.id, id))
			.returning({ id: themes.id }); // Return the ID to confirm deletion

		if (!deletedTheme) {
			kitError(404, 'Theme not found for deletion');
		}

		console.log(`API: Theme ${id} deleted successfully.`);
		return json({ message: `Theme ${id} deleted successfully`, id: deletedTheme.id }, { status: 200 }); // Use 200 OK for DELETE success with body

	} catch (error: any) {
		console.error(`API: Failed to delete theme ${id}:`, error);
		// Consider specific error handling, e.g., foreign key constraints if themes are linked tightly
		kitError(500, `Failed to delete theme: ${error.message || 'Database error'}`);
	}
};
