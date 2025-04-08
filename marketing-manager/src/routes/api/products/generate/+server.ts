import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'; // Removed Type import again
import { json, error } from '@sveltejs/kit';
import type { RequestHandler, RequestEvent } from './$types'; // Import RequestEvent
import { env } from '$env/dynamic/private'; // Use dynamic private env for server-side

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY;

if (!GEMINI_API_KEY) {
	console.error('GEMINI_API_KEY environment variable is not set.');
	// Throwing an error during initialization might be better
	// depending on how critical this API is.
}

// Define the JSON schema for the product data based on ProductForm.svelte fields
// Using string literals based on documentation examples, despite potential type mismatch
const productSchema = {
	type: 'OBJECT',
	properties: {
		name: { type: 'STRING', description: 'Product name (required)', nullable: false },
		overview: { type: 'STRING', description: 'A brief summary of the product.' },
		industry: { type: 'STRING', description: 'The industry the product belongs to (e.g., Business Video Media).' },
		details: { type: 'STRING', description: 'More in-depth information about the product.' },
		featuresStrengths: { type: 'STRING', description: 'List key features or strengths, potentially separated by newlines.' },
		description: { type: 'STRING', description: 'Internal notes or description (optional).' },
		imageUrl: { type: 'STRING', description: 'URL for the product image (optional).' }
	},
	required: ['name'] // Only name is strictly required in the form, others can be generated as null/empty
};

export const POST: RequestHandler = async ({ request }: RequestEvent) => { // Add RequestEvent type
	if (!GEMINI_API_KEY) {
		throw error(500, 'Server configuration error: API key missing.');
	}

	let instructions: string;
	try {
		const body = await request.json();
		instructions = body.instructions;
		if (!instructions || typeof instructions !== 'string') {
			throw new Error('Invalid instructions provided.');
		}
	} catch (err) {
		console.error('Error parsing request body:', err);
		throw error(400, 'Bad Request: Could not parse instructions from request body.');
	}

	try {
		const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
		const model = genAI.getGenerativeModel({
			model: 'gemini-1.5-flash', // Or another suitable model
			generationConfig: {
				responseMimeType: 'application/json',
				// Use type assertion to bypass strict type checking for the schema
				responseSchema: productSchema as any
			},
			// Optional: Adjust safety settings if needed
			safetySettings: [
				{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
				{ category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
				{ category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
				{ category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
			]
		});

		const result = await model.generateContent(instructions);
		const response = result.response;
		const text = response.text();

		// Gemini should return valid JSON based on the schema, but parse defensively
		try {
			const generatedData = JSON.parse(text);
			// Optional: Add validation against the schema here if needed
			return json(generatedData);
		} catch (parseError) {
			console.error('Error parsing Gemini JSON response:', parseError);
			console.error('Raw Gemini response text:', text);
			throw error(500, 'Failed to parse AI response.');
		}

	} catch (err: any) {
		console.error('Error calling Gemini API:', err);
		// Provide a more generic error to the client
		throw error(500, `Failed to generate product data: ${err.message || 'Unknown error'}`);
	}
};
