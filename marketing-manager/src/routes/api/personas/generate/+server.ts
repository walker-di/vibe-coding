import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { ageRanges, genders } from '$lib/server/db/schema'; // Import enums for validation

// Optional schema for generation inputs (can be expanded later)
const generationInputSchema = z.object({
	ageRange: z.enum(ageRanges).nullable().optional(),
	gender: z.enum(genders).nullable().optional()
	// Add other potential inputs like industry, core_need etc. here
}).optional(); // Allow empty body for now

export const POST: RequestHandler = async ({ request }) => {
	let inputData = {};
	try {
		// Try parsing body, but allow it to be empty for basic mock
		if (request.headers.get('content-length') !== '0') {
			const rawData = await request.json();
			const validationResult = generationInputSchema.safeParse(rawData);
			if (validationResult.success) {
				inputData = validationResult.data ?? {};
			} else {
				// Optional: Log validation error but proceed with generic mock
				console.warn('API: Persona generation input validation failed, using generic mock.', validationResult.error.flatten());
			}
		}
	} catch (e) {
		console.warn('API: Could not parse persona generation input body, using generic mock.', e);
	}

	console.log('API: Generating mock persona details based on input:', inputData);

	// --- MOCK AI RESPONSE ---
	// Replace this with actual AI call in Phase 2 (Real AI Integration)
	const mockPersona = {
		name: 'Generated Persona Example',
		personaTitle: 'AI-Suggested Title',
		imageUrl: `https://avatar.iran.liara.run/public/${Math.random() > 0.5 ? 'boy' : 'girl'}?username=Generated${Date.now()}`, // Random placeholder avatar
		// ageRangeSelection: '30s', // Keep user selection if provided
		// ageRangeCustom: null,
		// gender: 'Female', // Keep user selection if provided
		location: 'Tokyo, Japan (Mock)',
		jobTitle: 'Software Engineer (Mock)',
		incomeLevel: '¥6M - ¥8M (Mock)',
		personalityTraits: 'Analytical, Introverted, Detail-oriented (Mock)',
		valuesText: 'Efficiency, Continuous Learning, Work-life Balance (Mock)',
		spendingHabits: 'Invests in tech gadgets, saves moderately, prefers online shopping (Mock)',
		interestsHobbies: 'Programming, Video Games, Reading Sci-Fi (Mock)',
		lifestyle: 'Works from home, enjoys quiet weekends, occasionally attends tech meetups (Mock)',
		needsPainPoints: 'Needs better tools for project management, feels overwhelmed by notifications (Mock)',
		goalsExpectations: 'Wants to improve productivity, expects software to be intuitive and reliable (Mock)',
		backstory: 'Studied computer science and has been working in the tech industry for 5 years. Always looking for ways to optimize workflows. (Mock)',
		purchaseProcess: 'Researches extensively online, reads reviews, compares features before making a purchase decision. Values free trials. (Mock)',
		isGenerated: true // Mark as generated
	};
	// --- END MOCK ---

	// Simulate a short delay
	await new Promise(resolve => setTimeout(resolve, 500));

	return json(mockPersona, { status: 200 });
};
