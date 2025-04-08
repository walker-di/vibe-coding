import { db } from '$lib/server/db';
import { personas } from '$lib/server/db/schema';
import { json, error as kitError } from '@sveltejs/kit';
import { desc } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { z } from 'zod'; // For validation
import { ageRanges, genders } from '$lib/server/db/schema'; // Import enums

// Schema for creating a persona (Phase 2 - includes all detailed fields)
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

	// Use the detailed schema for validation
	const validationResult = createDetailedPersonaSchema.safeParse(requestData);

	if (!validationResult.success) {
		const errors = validationResult.error.flatten().fieldErrors;
		return json({ message: 'Validation failed', errors }, { status: 400 });
	}

	// Ensure ageRangeCustom is cleared if ageRangeSelection is not 'Custom'
	// This is handled by the refine, but double-checking here before insert
	const validatedData = { ...validationResult.data };
	if (validatedData.ageRangeSelection !== 'Custom') {
		validatedData.ageRangeCustom = null;
	}


	try {
		console.log('API: Inserting new detailed persona:', validatedData.name);
		const [newPersona] = await db
			.insert(personas)
			.values({
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

		console.log('API: New persona created with ID:', newPersona.id);

		// Return the newly created persona ID and name with a 201 status
		return json({ id: newPersona.id, name: validatedData.name }, { status: 201 });

	} catch (error) {
		console.error('API: Failed to create persona:', error);
		// Use SvelteKit's error helper for internal errors
		kitError(500, 'Failed to create persona. Please try again.');
	}
};
