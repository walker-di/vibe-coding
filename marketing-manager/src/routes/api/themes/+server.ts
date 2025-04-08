import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { themes } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Schema for validating new theme data
const createThemeSchema = z.object({
	title: z.string().min(1, 'Title is required').max(150),
	description: z.string().max(500).optional().nullable(),
	associatedPainPoint: z.string().max(255).optional().nullable(),
});

/**
 * GET /api/themes
 * Retrieves a list of all themes.
 */
export async function GET() {
	try {
		const allThemes = await db.select({
            id: themes.id,
            title: themes.title,
            description: themes.description,
            associatedPainPoint: themes.associatedPainPoint,
            createdAt: themes.createdAt
        }).from(themes).orderBy(themes.title); // Order by title for consistency
		return json(allThemes);
	} catch (e: any) {
		console.error('Failed to fetch themes:', e);
		throw error(500, 'Failed to load themes');
	}
}

/**
 * POST /api/themes
 * Creates a new theme.
 */
export async function POST({ request }) {
	let requestData;
	try {
		requestData = await request.json();
	} catch (e) {
		throw error(400, 'Invalid JSON format');
	}

	const validationResult = createThemeSchema.safeParse(requestData);

	if (!validationResult.success) {
		return json({ errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
	}

	const { title, description, associatedPainPoint } = validationResult.data;

	try {
		const [newTheme] = await db.insert(themes).values({
			title,
			description,
			associatedPainPoint,
			// createdAt is handled by default SQL value
		}).returning({ id: themes.id }); // Return the ID of the newly created theme

		if (!newTheme || !newTheme.id) {
			throw error(500, 'Failed to create theme: No ID returned');
		}

		// Fetch the newly created theme to return the full object
        const createdTheme = await db.select().from(themes).where(eq(themes.id, newTheme.id)).get();

        if (!createdTheme) {
            throw error(500, 'Failed to retrieve newly created theme');
        }

		return json(createdTheme, { status: 201 }); // 201 Created status

	} catch (e: any) {
		console.error('Failed to create theme:', e);
        // Could add check for unique constraint errors if title needs to be unique
		throw error(500, `Failed to create theme: ${e.message}`);
	}
}
