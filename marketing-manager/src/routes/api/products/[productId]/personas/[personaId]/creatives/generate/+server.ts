import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler, RequestEvent } from './$types';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { products, personas, creatives, creativeText, creativeImage, creativeVideo, creativeLp } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { creativeTypes, videoPlatforms, videoFormats, videoEmotions, appealFeatures } from '$lib/components/constants'; // Import enums/constants

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY; 

if (!GEMINI_API_KEY) {
	console.error('GEMINI_API_KEY environment variable is not set.');
	// Consider throwing an error during startup if critical
}

const promptMap = {
	text: {
		type: 'OBJECT',
		properties: {
			name: { type: 'STRING', description: 'Creative name (required)', nullable: false },
			description: { type: 'STRING', description: 'Internal notes or description (optional).' },
			textData: {
				type: 'OBJECT',
				nullable: true,
				description: 'Fields for a Text creative (only populate if type is text). Generate content for ALL fields below.',
				properties: {
					headline: { type: 'STRING', description: 'Headline for the text ad (Generate if possible).' },
					body: { type: 'STRING', description: 'Main body content of the text ad (Required).', nullable: false }, // Made non-nullable
					callToAction: { type: 'STRING', description: 'Call to action text (Generate if possible).' },
					appealFeature: { type: 'STRING', description: `Appeal feature focus (e.g., ${appealFeatures.join(', ')}) (Generate if possible).` },
					emotion: { type: 'STRING', description: `Emotion to evoke (e.g., ${videoEmotions.join(', ')}) (Generate if possible).` }, // Using videoEmotions as a general list
					platformNotes: { type: 'STRING', description: 'Notes on platform suitability or adaptation (Generate if possible).' }
				},
				required: ['body', 'callToAction', 'appealFeature', 'emotion', 'platformNotes'] // Explicitly require these fields
			},
		},
		required: ['name']
	},
	image: {
		type: 'OBJECT',
		properties: {
			name: { type: 'STRING', description: 'Creative name (required)', nullable: false },
			description: { type: 'STRING', description: 'Internal notes or description (optional).' },
			imageData: {
				type: 'OBJECT',
				nullable: true,
				description: 'Fields for an Image creative (only populate if type is image)',
				properties: {
					// imageUrl: { type: 'STRING', description: 'URL of the image. AI cannot generate images, but can suggest concepts or describe an image.' },
					altText: { type: 'STRING', description: 'Alternative text for accessibility.' },
					appealFeature: { type: 'STRING', description: `Appeal feature focus (e.g., ${appealFeatures.join(', ')}).` },
					emotion: { type: 'STRING', description: `Emotion to evoke (e.g., ${videoEmotions.join(', ')}).` },
					platformNotes: { type: 'STRING', description: 'Notes on platform suitability or adaptation.' }
				},
				required: ['appealFeature', 'emotion'] // Added to make these fields required for images
			},
		},
		required: ['name']
	},
	video: {
		type: 'OBJECT',
		properties: {
			name: { type: 'STRING', description: 'Creative name (required)', nullable: false },
			description: { type: 'STRING', description: 'Internal notes or description (optional).' },
			videoData: {
				type: 'OBJECT',
				nullable: true,
				description: 'Fields for a Video creative (only populate if type is video)',
				properties: {
					// videoUrl: { type: 'STRING', description: 'URL of the video. AI cannot generate videos, but can suggest concepts or scripts.' },
					platform: { type: 'STRING', description: `Target video platform (e.g., ${videoPlatforms.join(', ')}). upto 5` },
					format: { type: 'STRING', description: `Video format/aspect ratio (e.g., ${videoFormats.join(', ')}). choose one` },
					duration: { type: 'INTEGER', description: 'Approximate video duration in seconds.' },
					appealFeature: { type: 'STRING', description: `Appeal feature focus (e.g., ${appealFeatures.join(', ')}).` },
					emotion: { type: 'STRING', description: `Emotion to evoke (e.g., ${videoEmotions.join(', ')}).` },
					// templateId is not generated by AI
				}
			},
		},
		required: ['name']
	},
	lp: {
		type: 'OBJECT',
		properties: {
			name: { type: 'STRING', description: 'Creative name (required)', nullable: false },
			description: { type: 'STRING', description: 'Internal notes or description (optional).' },
			lpData: {
				type: 'OBJECT',
				nullable: true,
				description: 'Fields for a Landing Page creative (only populate if type is lp)',
				properties: {
					pageUrl: { type: 'STRING', description: 'URL of the landing page. AI can suggest content.' },
					headline: { type: 'STRING', description: 'Main headline for the landing page.' },
					keySections: { type: 'STRING', description: 'JSON array (as a string) describing key sections or content blocks.' },
					appealFeature: { type: 'STRING', description: `Appeal feature focus (e.g., ${appealFeatures.join(', ')}).` },
					emotion: { type: 'STRING', description: `Emotion to evoke (e.g., ${videoEmotions.join(', ')}).` },
					platformNotes: { type: 'STRING', description: 'Notes on the landing page structure or flow.' }
				}
			}
		},
		required: ['name']
	}
}


export const POST: RequestHandler = async ({ request, params }: RequestEvent) => {
	if (!GEMINI_API_KEY) {
		throw error(500, 'Server configuration error: API key missing.');
	}

	const productId = parseInt(params.productId || '', 10);
	const personaId = parseInt(params.personaId || '', 10);

	if (isNaN(productId) || isNaN(personaId)) {
		throw error(400, 'Invalid Product or Persona ID.');
	}

	let instructions: string;
	let currentCreativeData: Record<string, any> | null = null;
	let creativeType: string | undefined;

	try {
		const body = await request.json();
		instructions = body.instructions;
		currentCreativeData = body.currentData ?? null;
		creativeType = currentCreativeData?.type; // Get type from current data

		if (!instructions || typeof instructions !== 'string') {
			throw new Error('Invalid instructions provided.');
		}
		if (currentCreativeData && typeof currentCreativeData !== 'object') {
			throw new Error('Invalid currentData format provided.');
		}
		if (!creativeType || !creativeTypes.includes(creativeType as any)) {
			throw new Error('Creative type must be specified in currentData and be valid.');
		}

	} catch (err: any) {
		console.error('Error parsing request body:', err);
		throw error(400, `Bad Request: Could not parse request body. ${err.message}`);
	}

	try {
		// Fetch Product and Persona details for context
		const product = await db.select({
			name: products.name,
			description: products.description,
			industry: products.industry,
			overview: products.overview,
			details: products.details,
			featuresStrengths: products.featuresStrengths
		}).from(products).where(eq(products.id, productId)).get();

		const persona = await db.select({
			name: personas.name,
			insights: personas.insights,
			personaTitle: personas.personaTitle,
			ageRangeSelection: personas.ageRangeSelection,
			ageRangeCustom: personas.ageRangeCustom,
			gender: personas.gender,
			location: personas.location,
			jobTitle: personas.jobTitle,
			incomeLevel: personas.incomeLevel,
			personalityTraits: personas.personalityTraits,
			valuesText: personas.valuesText,
			spendingHabits: personas.spendingHabits,
			interestsHobbies: personas.interestsHobbies,
			lifestyle: personas.lifestyle,
			needsPainPoints: personas.needsPainPoints,
			goalsExpectations: personas.goalsExpectations,
			backstory: personas.backstory,
			purchaseProcess: personas.purchaseProcess
		}).from(personas).where(eq(personas.id, personaId)).get();

		if (!product) {
			throw error(404, 'Product not found.');
		}
		if (!persona) {
			throw error(404, 'Persona not found.');
		}

		const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
		const model = genAI.getGenerativeModel({
			model: 'gemini-2.0-flash', // Using flash model
			generationConfig: {
				temperature: 0.8, // Slightly lower temp for more focused creative output
				responseMimeType: 'application/json',
				responseSchema: (promptMap as any)[creativeType] // Use type assertion
			},
		});

		// Construct the prompt
		const prompt = `
Generate marketing creative content based on the provided product, target persona, and user instructions.
Output MUST be valid JSON conforming to the provided schema.
The creative type is '${creativeType}'. Only populate the fields relevant to this type (e.g., 'textData' for type 'text', 'imageData' for type 'image', etc.) and the common fields ('name', 'description'). Leave other type-specific objects (e.g., 'imageData', 'videoData', 'lpData' if type is 'text') as null or omit them.

**IMPORTANT INSTRUCTIONS:**
- Use the provided Product and Persona information to generate relevant and targeted content.
- Respect the user's language in the output.
- **If generating a new creative (Current Creative Data is empty/minimal):** You MUST generate meaningful content for ALL required fields. For text creatives, this includes: body, callToAction, appealFeature, emotion, and platformNotes. These fields are REQUIRED and cannot be omitted.
- **If modifying an existing creative (Current Creative Data is provided):** Strictly apply only the changes requested in the 'User Instructions' to the existing data. Do not overwrite fields unless specifically asked.


**Product Information:**
${JSON.stringify(product, null, 2)}

**Target Persona Information:**
${JSON.stringify(persona, null, 2)}

**User Instructions:**
"${instructions}"

**Current Creative Data (Use this as a base if provided, otherwise generate new):**
${currentCreativeData ? JSON.stringify(currentCreativeData, null, 2) : 'None (creating new creative).'}
`;

		console.log("Sending prompt to Gemini for creative generation..."); // Log prompt start

		const result = await model.generateContent(prompt);
		const response = result.response;
		const text = response.text();

		console.log("Received raw response from Gemini:", text); // Log raw response

		try {
			const generatedData = JSON.parse(text);
			// Basic validation: Check if the correct type-specific object exists
			if (creativeType === 'text' && !generatedData.textData) console.warn("AI response missing expected textData for type 'text'");
			if (creativeType === 'image' && !generatedData.imageData) console.warn("AI response missing expected imageData for type 'image'");
			if (creativeType === 'video' && !generatedData.videoData) console.warn("AI response missing expected videoData for type 'video'");
			if (creativeType === 'lp' && !generatedData.lpData) console.warn("AI response missing expected lpData for type 'lp'");
			
			// Enhanced validation for form fields
			if (creativeType === 'text' && generatedData.textData) {
				// Validate Appeal Feature is one of the allowed values
				if (generatedData.textData.appealFeature && !appealFeatures.includes(generatedData.textData.appealFeature)) {
					console.warn(`Invalid Appeal Feature value: ${generatedData.textData.appealFeature}. Using default.`);
					generatedData.textData.appealFeature = appealFeatures[0]; // Default to first option
				}
				
				// Validate Emotion is one of the allowed values
				if (generatedData.textData.emotion && !videoEmotions.includes(generatedData.textData.emotion)) {
					console.warn(`Invalid Emotion value: ${generatedData.textData.emotion}. Using default.`);
					generatedData.textData.emotion = videoEmotions[0]; // Default to first option
				}
			}
			
			// Similar validation for other creative types
			if (creativeType === 'image' && generatedData.imageData) {
				if (generatedData.imageData.appealFeature && !appealFeatures.includes(generatedData.imageData.appealFeature)) {
					generatedData.imageData.appealFeature = appealFeatures[0];
				}
				if (generatedData.imageData.emotion && !videoEmotions.includes(generatedData.imageData.emotion)) {
					generatedData.imageData.emotion = videoEmotions[0];
				}
			}
			
			if (creativeType === 'video' && generatedData.videoData) {
				if (generatedData.videoData.appealFeature && !appealFeatures.includes(generatedData.videoData.appealFeature)) {
					generatedData.videoData.appealFeature = appealFeatures[0];
				}
				if (generatedData.videoData.emotion && !videoEmotions.includes(generatedData.videoData.emotion)) {
					generatedData.videoData.emotion = videoEmotions[0];
				}
			}
			
			if (creativeType === 'lp' && generatedData.lpData) {
				if (generatedData.lpData.appealFeature && !appealFeatures.includes(generatedData.lpData.appealFeature)) {
					generatedData.lpData.appealFeature = appealFeatures[0];
				}
				if (generatedData.lpData.emotion && !videoEmotions.includes(generatedData.lpData.emotion)) {
					generatedData.lpData.emotion = videoEmotions[0];
				}
			}

			return json(generatedData);
		} catch (parseError) {
			console.error('Error parsing Gemini JSON response:', parseError);
			throw error(500, 'Failed to parse AI response. Raw text: ' + text);
		}

	} catch (err: any) {
		console.error('Error during creative generation API call:', err);
		// Check for specific Gemini errors if possible, otherwise generic
		if (err.message?.includes('404')) {
			throw error(404, err.message); // Propagate 404 if product/persona not found
		}
		throw error(500, `Failed to generate creative data: ${err.message || 'Unknown error'}`);
	}
};
