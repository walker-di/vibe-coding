import { db } from '$lib/server/db';
import { personas } from '$lib/server/db/schema';
import { json, error } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm'; // Import eq for filtering
import type { RequestHandler } from './$types';
import { z } from 'zod'; // For validation
import { ageRanges, genders } from '$lib/components/constants'; // Import enums from correct location

// Schema for creating a persona (Phase 2 - includes all detailed fields)
// No changes needed to the schema itself
const createDetailedPersonaSchema = z.object({
	name: z.string().min(1, { message: 'Persona name is required.' }).max(100),
	personaTitle: z.string().max(150).optional().nullable(),
	imageUrl: z.string().url({ message: 'Invalid URL format.' }).optional().nullable(),
	ageRangeSelection: z.enum(ageRanges).default('Unspecified'),
	ageRangeCustom: z.string().max(50).optional().nullable(),
	gender: z.enum(genders).default('Unspecified'),
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
	isGenerated: z.boolean().default(false).optional() // Default to false if not provided
}).refine(data => data.ageRangeSelection !== 'Custom' || (data.ageRangeSelection === 'Custom' && data.ageRangeCustom), {
	message: "Custom age range text is required when 'Custom' is selected.",
	path: ["ageRangeCustom"], // Specify the path of the error
});


// GET /api/products/[productId]/personas - List personas for a specific product
export const GET: RequestHandler = async ({ params }) => {
	const productIdParam = params.productId;
	const productId = parseInt(productIdParam, 10);

	if (isNaN(productId)) {
		throw error(400, 'Invalid Product ID');
	}

	console.log(`API: Loading personas for product ID: ${productId}...`);
	try {
		const productPersonas = await db
			.select({
				// Select only basic fields for the list view initially
				id: personas.id,
				name: personas.name,
				personaTitle: personas.personaTitle, // Include title for card display
				imageUrl: personas.imageUrl, // Include image for card display
				createdAt: personas.createdAt
			})
			.from(personas)
			.where(eq(personas.productId, productId)) // Filter by productId
			.orderBy(desc(personas.createdAt)); // Order by creation date, newest first

		console.log(`API: Found ${productPersonas.length} personas for product ${productId}.`);
		return json(productPersonas); // Return personas as JSON
	} catch (err) {
		console.error(`API: Failed to load personas for product ${productId}:`, err);
		// Check if it's an error thrown by SvelteKit's error() helper
		if (err.status && err.body) {
			throw err; // Re-throw SvelteKit errors
		}
		throw error(500, 'Failed to load personas');
	}
};

// POST /api/products/[productId]/personas - Create a new persona for a specific product
export const POST: RequestHandler = async ({ request, params }) => {
	const productIdParam = params.productId;
	const productId = parseInt(productIdParam, 10);

	if (isNaN(productId)) {
		throw error(400, 'Invalid Product ID');
	}

	// TODO: Optionally, verify the product ID exists in the database first
	// const productExists = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
	// if (productExists.length === 0) {
	//     kitError(404, 'Product not found');
	// }

	let requestData;
	try {
		requestData = await request.json();
	} catch (e) {
		throw error(400, 'Invalid JSON body');
	}

	// Use the detailed schema for validation
	const validationResult = createDetailedPersonaSchema.safeParse(requestData);

	if (!validationResult.success) {
		const errors = validationResult.error.flatten().fieldErrors;
		throw error(400, { message: 'Validation failed', errors });
	}

	// Ensure ageRangeCustom is cleared if ageRangeSelection is not 'Custom'
	const validatedData = { ...validationResult.data };
	if (validatedData.ageRangeSelection !== 'Custom') {
		validatedData.ageRangeCustom = null;
	}


	try {
		console.log(`API: Inserting new detailed persona for product ID ${productId}:`, validatedData.name);
		const [newPersona] = await db
			.insert(personas)
			.values({
				productId: productId, // Add the productId from the route
				// Insert all validated fields
				name: validatedData.name,
				personaTitle: validatedData.personaTitle,
				imageUrl: validatedData.imageUrl,
				ageRangeSelection: validatedData.ageRangeSelection,
				ageRangeCustom: validatedData.ageRangeCustom,
				gender: validatedData.gender,
				location: validatedData.location,
				jobTitle: validatedData.jobTitle,
				incomeLevel: validatedData.incomeLevel,
				personalityTraits: validatedData.personalityTraits,
				valuesText: validatedData.valuesText,
				spendingHabits: validatedData.spendingHabits,
				interestsHobbies: validatedData.interestsHobbies,
				lifestyle: validatedData.lifestyle,
				needsPainPoints: validatedData.needsPainPoints,
				goalsExpectations: validatedData.goalsExpectations,
				backstory: validatedData.backstory,
				purchaseProcess: validatedData.purchaseProcess,
				isGenerated: validatedData.isGenerated
			})
			.returning({ id: personas.id }); // Get the ID back

		console.log(`API: New persona created with ID ${newPersona.id} for product ${productId}.`);

		// Return the newly created persona ID and name with a 201 status
		return json({ id: newPersona.id, name: validatedData.name }, { status: 201 });

	} catch (err) {
		console.error(`API: Failed to create persona for product ${productId}:`, err);
		// Check if it's an error thrown by SvelteKit's error() helper
		if (err.status && err.body) {
			throw err; // Re-throw SvelteKit errors
		}
		throw error(500, 'Failed to create persona. Please try again.');
	}
};
