import { db } from '$lib/server/db';
import { personas } from '$lib/server/db/schema';
import { json, error } from '@sveltejs/kit';
import { eq, and, sql } from 'drizzle-orm'; // Import and, sql
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { ageRanges, genders } from '$lib/components/constants'; // Import enums from correct location

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


// Helper function to parse and validate IDs
function parseIds(params: Partial<Record<string, string>>): { productId: number; personaId: number } {
	const productId = parseInt(params.productId ?? '', 10);
	const personaId = parseInt(params.personaId ?? '', 10);

	if (isNaN(productId) || isNaN(personaId)) {
		throw error(400, 'Invalid Product or Persona ID');
	}
	return { productId, personaId };
}

// GET /api/products/[productId]/personas/[personaId]
export const GET: RequestHandler = async ({ params }) => {
	const { productId, personaId } = parseIds(params);

	console.log(`API: Loading persona ${personaId} for product ${productId}`);
	try {
		const persona = await db.query.personas.findFirst({
			where: and(
				eq(personas.id, personaId),
				eq(personas.productId, productId) // Ensure persona belongs to product
			)
			// Add relations here if needed later
		});

		if (!persona) {
			throw error(404, 'Persona not found for this product');
		}

		console.log(`API: Found persona: ${persona.name}`);
		return json(persona);
	} catch (err) {
		console.error(`API: Failed to load persona ${personaId} for product ${productId}:`, err);
		// Check if it's an error thrown by SvelteKit's error() helper
		if (err.status && err.body) {
			throw err; // Re-throw SvelteKit errors
		}
		throw error(500, 'Failed to load persona');
	}
};

// PUT /api/products/[productId]/personas/[personaId]
export const PUT: RequestHandler = async ({ params, request }) => {
	console.log(`--- API HIT: PUT /api/products/${params.productId}/personas/${params.personaId} ---`);
	console.log(`Request Method: ${request.method}`);
	console.log(`Request URL: ${request.url}`);
	// console.log('Request Headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2)); // Optional: Log headers if needed

	const { productId, personaId } = parseIds(params);

	let requestData;
	try {
		requestData = await request.json();
	} catch (e) {
		throw error(400, 'Invalid JSON body');
	}

	// Validate that at least one field is being updated
	if (Object.keys(requestData).length === 0) {
		throw error(400, 'No fields provided for update');
	}

	const validationResult = personaUpdateSchema.safeParse(requestData);

	if (!validationResult.success) {
		const errors = validationResult.error.flatten().fieldErrors;
		throw error(400, { message: 'Validation failed', errors });
	}

	// Ensure ageRangeCustom is cleared if ageRangeSelection is not 'Custom'
	const validatedData = { ...validationResult.data };
	if (validatedData.ageRangeSelection && validatedData.ageRangeSelection !== 'Custom') {
		validatedData.ageRangeCustom = null;
	}

	try {
		console.log(`API: Updating persona ${personaId} for product ${productId}`);

		// Check if persona exists *and* belongs to the product
		const existing = await db.query.personas.findFirst({
			where: and(
				eq(personas.id, personaId),
				eq(personas.productId, productId)
			),
			columns: { id: true }
		});

		if (!existing) {
			throw error(404, 'Persona not found for this product');
		}

		// Manually set updatedAt timestamp
		const updateValues = {
			...validatedData,
			updatedAt: sql`(unixepoch('now') * 1000)`
		};

		await db
			.update(personas)
			.set(updateValues)
			.where(and( // Ensure update targets the correct persona AND product
				eq(personas.id, personaId),
				eq(personas.productId, productId)
			));

		console.log(`API: Persona ${personaId} updated successfully.`);

		// Fetch and return the updated persona
		const updatedPersona = await db.query.personas.findFirst({
			where: and(
				eq(personas.id, personaId),
				eq(personas.productId, productId)
			)
		});

		return json(updatedPersona, { status: 200 });

	} catch (err) {
		console.error(`API: Failed to update persona ${personaId} for product ${productId}:`, err);
		// Check if it's an error thrown by SvelteKit's error() helper
		if (err.status && err.body) {
			throw err; // Re-throw SvelteKit errors
		}
		throw error(500, 'Failed to update persona');
	}
};

// DELETE /api/products/[productId]/personas/[personaId]
export const DELETE: RequestHandler = async ({ params }) => {
	const { productId, personaId } = parseIds(params);

	console.log(`API: Deleting persona ${personaId} for product ${productId}`);
	try {
		// Check if persona exists *and* belongs to the product before deleting
		const existing = await db.query.personas.findFirst({
			where: and(
				eq(personas.id, personaId),
				eq(personas.productId, productId)
			),
			columns: { id: true }
		});

		if (!existing) {
			throw error(404, 'Persona not found for this product');
		}

		// Perform delete only if it exists and belongs to the product
		await db.delete(personas).where(and(
			eq(personas.id, personaId),
			eq(personas.productId, productId)
		));

		console.log(`API: Persona ${personaId} deleted successfully.`);
		// Return 204 No Content for successful deletion
		return new Response(null, { status: 204 });

	} catch (err) {
		console.error(`API: Failed to delete persona ${personaId} for product ${productId}:`, err);
		// Check if it's an error thrown by SvelteKit's error() helper
		if (err.status && err.body) {
			throw err; // Re-throw SvelteKit errors
		}
		// Consider foreign key constraints (creatives linking to personas)
		throw error(500, 'Failed to delete persona');
	}
};
