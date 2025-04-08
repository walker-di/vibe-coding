import { db } from '$lib/server/db';
import { personas, ageRanges, genders } from '$lib/server/db/schema'; // Import enums too
import { json, error as kitError } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { z } from 'zod';

// Schema for updating a persona (includes all fields from Phase 2)
// Making all fields optional for PUT requests using .partial()
const personaUpdateSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	personaTitle: z.string().max(150).optional().nullable(),
	imageUrl: z.string().url().optional().nullable(),
	ageRangeSelection: z.enum(ageRanges).optional(),
	ageRangeCustom: z.string().max(50).optional().nullable(),
	gender: z.enum(genders).optional(),
	location: z.string().max(100).optional().nullable(),
	jobTitle: z.string().max(100).optional().nullable(),
	incomeLevel: z.string().max(100).optional().nullable(),
	personalityTraits: z.string().optional().nullable(),
	valuesText: z.string().optional().nullable(),
	spendingHabits: z.string().optional().nullable(),
	interestsHobbies: z.string().optional().nullable(),
	lifestyle: z.string().optional().nullable(),
	needsPainPoints: z.string().optional().nullable(),
	goalsExpectations: z.string().optional().nullable(),
	backstory: z.string().optional().nullable(),
	purchaseProcess: z.string().optional().nullable(),
	isGenerated: z.boolean().optional() // Allow updating the generated flag
}).partial();


// GET /api/personas/[id]
export const GET: RequestHandler = async ({ params }) => {
	const personaId = parseInt(params.id, 10);
	if (isNaN(personaId)) {
		return json({ message: 'Invalid persona ID' }, { status: 400 });
	}

	console.log(`API: Loading persona with ID: ${personaId}`);
	try {
		const persona = await db.query.personas.findFirst({
			where: eq(personas.id, personaId)
			// Add relations here if needed later
		});

		if (!persona) {
			return json({ message: 'Persona not found' }, { status: 404 });
		}

		console.log(`API: Found persona: ${persona.name}`);
		return json(persona);
	} catch (error) {
		console.error(`API: Failed to load persona ${personaId}:`, error);
		kitError(500, 'Failed to load persona');
	}
};

// PUT /api/personas/[id]
export const PUT: RequestHandler = async ({ params, request }) => {
	const personaId = parseInt(params.id, 10);
	if (isNaN(personaId)) {
		return json({ message: 'Invalid persona ID' }, { status: 400 });
	}

	let requestData;
	try {
		requestData = await request.json();
	} catch (e) {
		return json({ message: 'Invalid JSON body' }, { status: 400 });
	}

	// Validate that at least one field is being updated
	if (Object.keys(requestData).length === 0) {
		return json({ message: 'No fields provided for update' }, { status: 400 });
	}

	const validationResult = personaUpdateSchema.safeParse(requestData);

	if (!validationResult.success) {
		const errors = validationResult.error.flatten().fieldErrors;
		return json({ message: 'Validation failed', errors }, { status: 400 });
	}

	// Ensure ageRangeCustom is cleared if ageRangeSelection is not 'Custom'
	const validatedData = { ...validationResult.data };
	if (validatedData.ageRangeSelection && validatedData.ageRangeSelection !== 'Custom') {
		validatedData.ageRangeCustom = null;
	}

	try {
		console.log(`API: Updating persona with ID: ${personaId}`);

		// Check if persona exists
		const existing = await db.query.personas.findFirst({
			where: eq(personas.id, personaId),
			columns: { id: true }
		});

		if (!existing) {
			return json({ message: 'Persona not found' }, { status: 404 });
		}

		// Manually set updatedAt timestamp
		const updateValues = {
			...validatedData,
			updatedAt: sql`(unixepoch('now') * 1000)`
		};

		await db
			.update(personas)
			.set(updateValues)
			.where(eq(personas.id, personaId));

		console.log(`API: Persona ${personaId} updated successfully.`);

		// Fetch and return the updated persona
		const updatedPersona = await db.query.personas.findFirst({
			where: eq(personas.id, personaId)
		});

		return json(updatedPersona, { status: 200 });

	} catch (error) {
		console.error(`API: Failed to update persona ${personaId}:`, error);
		kitError(500, 'Failed to update persona');
	}
};

// DELETE /api/personas/[id]
export const DELETE: RequestHandler = async ({ params }) => {
	const personaId = parseInt(params.id, 10);
	if (isNaN(personaId)) {
		return json({ message: 'Invalid persona ID' }, { status: 400 });
	}

	console.log(`API: Deleting persona with ID: ${personaId}`);
	try {
		// Check if persona exists
		const existing = await db.query.personas.findFirst({
			where: eq(personas.id, personaId),
			columns: { id: true }
		});

		if (!existing) {
			return json({ message: 'Persona not found' }, { status: 404 });
		}

		await db.delete(personas).where(eq(personas.id, personaId));

		console.log(`API: Persona ${personaId} deleted successfully.`);
		return json({ message: 'Persona deleted successfully' }, { status: 200 }); // Or 204

	} catch (error) {
		console.error(`API: Failed to delete persona ${personaId}:`, error);
		// Consider foreign key constraints (creatives linking to personas)
		kitError(500, 'Failed to delete persona');
	}
};
