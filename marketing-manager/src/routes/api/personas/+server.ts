import { db } from '$lib/server/db';
import { personas } from '$lib/server/db/schema';
import { json, error as kitError } from '@sveltejs/kit';
import { desc } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { z } from 'zod'; // For validation

// Schema for creating a persona (Phase 1 - just name)
const createPersonaSchema = z.object({
	name: z.string().min(1, { message: 'Persona name is required.' }).max(100)
});


export const GET: RequestHandler = async () => {
	console.log('API: Loading personas from database...');
	try {
		const allPersonas = await db
			.select({
				// Select only basic fields for the list view initially
				id: personas.id,
				name: personas.name,
				personaTitle: personas.personaTitle, // Include title for card display
				imageUrl: personas.imageUrl, // Include image for card display
				createdAt: personas.createdAt
			})
			.from(personas)
			.orderBy(desc(personas.createdAt)); // Order by creation date, newest first

		console.log(`API: Found ${allPersonas.length} personas.`);
		return json(allPersonas); // Return personas as JSON
	} catch (error) {
		console.error('API: Failed to load personas:', error);
		// Return a server error response
		return json({ message: 'Failed to load personas' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	let requestData;
	try {
		requestData = await request.json();
	} catch (e) {
		return json({ message: 'Invalid JSON body' }, { status: 400 });
	}

	const validationResult = createPersonaSchema.safeParse(requestData);

	if (!validationResult.success) {
		const errors = validationResult.error.flatten().fieldErrors;
		return json({ message: 'Validation failed', errors }, { status: 400 });
	}

	const validatedData = validationResult.data;

	try {
		console.log('API: Inserting new persona:', validatedData.name);
		const [newPersona] = await db
			.insert(personas)
			.values({
				name: validatedData.name
				// Set other fields to defaults or null as needed by schema
			})
			.returning({ id: personas.id }); // Get the ID back

		console.log('API: New persona created with ID:', newPersona.id);

		// Return the newly created persona (or just the ID) with a 201 status
		return json({ id: newPersona.id, name: validatedData.name }, { status: 201 });

	} catch (error) {
		console.error('API: Failed to create persona:', error);
		// Use SvelteKit's error helper for internal errors
		kitError(500, 'Failed to create persona. Please try again.');
	}
};
