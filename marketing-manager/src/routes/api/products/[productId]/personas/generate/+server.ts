import { GoogleGenerativeAI } from '@google/generative-ai';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler, RequestEvent } from './$types';
import { env } from '$env/dynamic/private';
import { ageRanges, genders } from '$lib/components/constants'; // Import constants for schema if needed
import { db } from '$lib/server/db'; // Import DB client
import { products } from '$lib/server/db/schema'; // Import products schema
import { eq } from 'drizzle-orm'; // Import eq operator
import { avatarPrompt } from '$lib/components/settings/ai/avagar.prompt';

const GEMINI_API_KEY = env.GOOGLE_API_KEY; // Use env import

if (!GEMINI_API_KEY) {
	console.error('GOOGLE_API_KEY environment variable is not set.');
	// Consider throwing an error here if the API is critical
}

// Define the JSON schema for the persona data based on PersonaForm.svelte fields
// Note: Enum types aren't directly supported in Gemini's schema, use STRING.
// We rely on the prompt to guide the AI towards valid enum values.
const personaSchema = {
	type: 'OBJECT',
	properties: {
		name: { type: 'STRING', description: 'Persona name (required)', nullable: false },
		personaTitle: { type: 'STRING', description: 'A descriptive title for the persona (e.g., "Tech-Savvy Early Adopter").' },
		imageUrl: { type: 'STRING', description: 'URL for a representative persona image (optional). Should be a plausible image URL. from https://randomuser.me/ or https://avatar-placeholder.iran.liara.run/' }, // Re-enabled
		ageRangeSelection: { type: 'STRING', description: `Suggested age range. Must be one of: ${ageRanges.join(', ')}.` }, // Re-enabled
		ageRangeCustom: { type: 'STRING', description: 'Specific custom age range (e.g., "28-32") ONLY if ageRangeSelection is "Custom". Otherwise, this should be null or omitted.' }, // Re-enabled
		gender: { type: 'STRING', description: `Suggested gender. Must be one of: ${genders.filter(g => g !== 'Unspecified').join(', ')}.` }, // Re-enabled
		location: { type: 'STRING', description: 'Geographic location or region.' },
		jobTitle: { type: 'STRING', description: 'Primary job title or role.' },
		incomeLevel: { type: 'STRING', description: 'General income level or range.' },
		personalityTraits: { type: 'STRING', description: 'Key personality traits, potentially comma-separated or as a short paragraph.' },
		valuesText: { type: 'STRING', description: 'Core values and beliefs.' },
		spendingHabits: { type: 'STRING', description: 'Typical spending habits and financial behavior.' },
		interestsHobbies: { type: 'STRING', description: 'Main interests and hobbies.' },
		lifestyle: { type: 'STRING', description: 'Description of their lifestyle (e.g., family life, daily routine, travel habits).' },
		needsPainPoints: { type: 'STRING', description: 'Primary needs, challenges, or pain points this product/service could address.' },
		goalsExpectations: { type: 'STRING', description: 'Goals or expectations they have related to solutions like this product/service.' },
		backstory: { type: 'STRING', description: 'A brief narrative or backstory for the persona.' },
		purchaseProcess: { type: 'STRING', description: 'How they typically research and make purchase decisions in this category.' },
	},
	required: ['name', 'needsPainPoints', 'goalsExpectations'] // Define essential fields for a useful persona
};


export const POST: RequestHandler = async (event: RequestEvent) => {
	const { request, params } = event;
	const productIdParam = params.productId; // Get productId from route

	if (!GEMINI_API_KEY) {
		throw error(500, 'Server configuration error: API key missing.');
	}

	if (!productIdParam) {
		throw error(400, 'Bad Request: Product ID is required in the URL.');
	}

	const productId = parseInt(productIdParam, 10);
	if (isNaN(productId)) {
		throw error(400, 'Bad Request: Invalid Product ID format.');
	}

	let instructions: string;
	let currentPersonaData: Record<string, any> | null = null;
	let productDetails: typeof products.$inferSelect | null = null;

	try {
		const body = await request.json();
		instructions = body.instructions;
		currentPersonaData = body.currentData ?? null;

		if (!instructions || typeof instructions !== 'string') {
			throw new Error('Invalid instructions provided.');
		}
		if (currentPersonaData && typeof currentPersonaData !== 'object') {
			throw new Error('Invalid currentData format provided.');
		}

	} catch (err: any) {
		console.error('Error parsing request body:', err);
		throw error(400, `Bad Request: Could not parse request body. ${err.message}`);
	}

	// --- Fetch Product Details ---
	try {
		const result = await db.select().from(products).where(eq(products.id, productId)).limit(1);
		if (result.length > 0) {
			productDetails = result[0];
		} else {
			// Optional: Decide if you want to error out if product not found,
			// or proceed without product context. Let's proceed for now.
			console.warn(`Product with ID ${productId} not found. Generating persona without product context.`);
		}
	} catch (dbError: any) {
		console.error(`Database error fetching product ${productId}:`, dbError);
		// Decide if this should be a fatal error or just a warning
		throw error(500, `Database error fetching product details: ${dbError.message}`);
	}
	// --- End Fetch Product Details ---


	try {
		const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
		const model = genAI.getGenerativeModel({
			model: 'gemini-2.0-flash', // Use a capable model
			generationConfig: {
				temperature: 0.8, // Slightly creative but grounded
				responseMimeType: 'application/json',
				// Use type assertion for the schema
				responseSchema: personaSchema as any
			},
		});

		// Construct the prompt with Product Details
		const productContextString = productDetails
			? `Product Name: ${productDetails.name}\nProduct Overview: ${productDetails.overview}\nProduct Industry: ${productDetails.industry}\nProduct Details: ${productDetails.details}\nProduct Features/Strengths: ${productDetails.featuresStrengths}`
			: 'Product details not available.';

		const prompt = `Generate or update persona details in JSON format based on the schema provided below.
This persona is being created for the following product:
--- START PRODUCT CONTEXT ---
${JSON.stringify(productDetails, null, 2)}
--- END PRODUCT CONTEXT ---

Use the product context to create a relevant and targeted persona.
Respect the user's language. Focus on creating helpful output in JSON matching the schema.
If the 'Current Persona Data' is empty or minimal, generate a comprehensive persona based on the 'User Instructions' and the 'Product Context' filling all the fields.
If 'Current Persona Data' exists, strictly apply only the changes requested in the 'User Instructions' to the existing data. Do not overwrite fields unless specifically asked.
info for image generation: ${avatarPrompt}


User Instructions:
"${instructions}"

Current Persona Data:
${currentPersonaData ? JSON.stringify(currentPersonaData, null, 2) : 'None (creating new persona).'}

Required JSON Output Schema:
${JSON.stringify(personaSchema, null, 2)}

Output JSON:`;


		console.log("Sending prompt to Gemini for Persona Generation (Product ID: " + productId + "):", prompt); // Log prompt

		const result = await model.generateContent(prompt);
		const response = result.response;
		const text = response.text();

		// Parse the JSON response defensively
		try {
			const generatedData = JSON.parse(text);
			// Add isGenerated flag manually
			generatedData.isGenerated = true;
			return json(generatedData);
		} catch (parseError) {
			console.error('Error parsing Gemini JSON response for Persona:', parseError);
			console.error('Raw Gemini response text:', text);
			throw error(500, 'Failed to parse AI response.');
		}

	} catch (err: any) {
		console.error('Error calling Gemini API for Persona:', err);
		throw error(500, `Failed to generate persona data: ${err.message || 'Unknown error'}`);
	}
};
