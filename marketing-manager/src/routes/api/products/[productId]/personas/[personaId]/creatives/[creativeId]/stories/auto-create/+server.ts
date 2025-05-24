import {
	type AIProvider,
	generateContent,
} from "$lib/server/aiProviderService";
import { db } from "$lib/server/db";
import {
	clips,
	creatives,
	personas,
	products,
	scenes,
	stories,
} from "$lib/server/db/schema";
import { error, json } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { RequestEvent, RequestHandler } from "./$types";

// No need to check API keys here as it's handled in the aiProviderService

// Schema for the storyboard with scenes and clips
// Using uppercase types for Gemini compatibility, our converter will handle OpenAI's lowercase requirement
const storyboardSchema = {
	type: "OBJECT",
	properties: {
		title: { type: "STRING", description: "Title for the storyboard" },
		description: {
			type: "STRING",
			description: "Brief description of the storyboard",
		},
		scenes: {
			type: "ARRAY",
			description:
				"Array of scenes in the storyboard, each with a specific purpose in the narrative",
			items: {
				type: "OBJECT",
				properties: {
					description: {
						type: "STRING",
						description:
							"A descriptive title for this scene that captures its purpose in the overall narrative",
					},
					clips: {
						type: "ARRAY",
						description:
							"Array of clips that form a coherent scene with a specific purpose in the story",
						items: {
							type: "OBJECT",
							properties: {
								narration: {
									type: "STRING",
									description:
										"Professional voice-over script for this clip in Brazilian Portuguese",
								},
								visualDescription: {
									type: "STRING",
									description:
										"Detailed visual description of what appears in this clip",
								},
								duration: {
									type: "NUMBER",
									description:
										"Suggested duration for this clip in seconds (typically between 5-10 seconds)",
								},
							},
							required: ["narration", "visualDescription", "duration"],
						},
					},
				},
				required: ["description", "clips"],
			},
		},
	},
	required: ["title", "description", "scenes"],
};

export const POST: RequestHandler = async ({ request, params }) => {
	// API key availability is checked in the aiProviderService

	const productId = parseInt(params.productId || "", 10);
	const personaId = parseInt(params.personaId || "", 10);
	const creativeId = parseInt(params.creativeId || "", 10);

	if (isNaN(productId) || isNaN(personaId) || isNaN(creativeId)) {
		throw error(400, "Invalid Product, Persona, or Creative ID.");
	}

	let storyPrompt: string;
	let storyId: number | undefined;
	let aiProvider: AIProvider = "gemini"; // Default to Gemini
	let includeProductInfo: boolean = true; // Default to including product info
	let includePersonaInfo: boolean = true; // Default to including persona info
	let includeCreativeInfo: boolean = true; // Default to including creative info

	try {
		const body = await request.json();
		storyPrompt = body.storyPrompt;
		storyId = body.storyId;

		// Get the AI provider from the request body, default to 'gemini' if not provided
		if (
			body.aiProvider &&
			["gemini", "openai", "claude"].includes(body.aiProvider)
		) {
			aiProvider = body.aiProvider;
		}

		// Get whether to include specific context information from the request body
		if (body.includeProductInfo !== undefined) {
			includeProductInfo = body.includeProductInfo;
		}

		if (body.includePersonaInfo !== undefined) {
			includePersonaInfo = body.includePersonaInfo;
		}

		if (body.includeCreativeInfo !== undefined) {
			includeCreativeInfo = body.includeCreativeInfo;
		}

		if (!storyPrompt || typeof storyPrompt !== "string") {
			throw new Error("Invalid or missing storyPrompt.");
		}
	} catch (err: any) {
		console.error("Error parsing request body:", err);
		throw error(
			400,
			`Bad Request: Could not parse request body. ${err.message}`,
		);
	}

	// Fetch Product, Persona, and Creative details for context
	const product = await db.query.products.findFirst({
		where: eq(products.id, productId),
		columns: {
			name: true,
			description: true,
			industry: true,
			overview: true,
			details: true,
			featuresStrengths: true,
		},
	});

	const persona = await db.query.personas.findFirst({
		where: eq(personas.id, personaId),
		columns: {
			name: true,
			insights: true,
			personaTitle: true,
			ageRangeSelection: true,
			ageRangeCustom: true,
			gender: true,
			location: true,
			jobTitle: true,
			incomeLevel: true,
			personalityTraits: true,
			valuesText: true,
			spendingHabits: true,
			interestsHobbies: true,
			lifestyle: true,
			needsPainPoints: true,
			goalsExpectations: true,
			backstory: true,
			purchaseProcess: true,
		},
	});

	const creative = await db.query.creatives.findFirst({
		where: eq(creatives.id, creativeId),
		with: {
			textData: true,
			imageData: true,
			videoData: true,
			lpData: true,
		},
	});

	console.log("Fetched product:", product);
	console.log("Fetched persona:", persona);
	console.log("Fetched creative:", creative);

	if (!product) {
		throw error(404, `Product with ID ${productId} not found.`);
	}
	if (!persona) {
		throw error(404, `Persona with ID ${personaId} not found.`);
	}
	if (!creative) {
		throw error(404, `Creative with ID ${creativeId} not found.`);
	}

	// Get or create a story
	let storyRecord;

	if (storyId) {
		// If storyId is provided, verify it exists
		storyRecord = await db.query.stories.findFirst({
			where: eq(stories.id, storyId),
			columns: { id: true, title: true, aspectRatio: true },
		});

		if (!storyRecord) {
			throw error(404, `Story with ID ${storyId} not found`);
		}
	} else {
		// Create a new story if storyId is not provided
		const storyName = storyPrompt.substring(0, 30) + "...";
		const [newStory] = await db
			.insert(stories)
			.values({
				creativeId, // Required field
				title: storyName,
				description: storyPrompt,
				aspectRatio: "16:9",
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.returning();

		storyRecord = newStory;
		console.log(`Created new story with ID: ${storyRecord.id}`);
	}

	// We'll use the aiProviderService instead of initializing Gemini directly

	let targetPrompt = `\n## Channel info ##\n`;
	// Creative context
	targetPrompt += `Name${creative.name}\n`;

	if (creative.description) {
		targetPrompt += `Description: ${creative.description}\n`;
	}

	// Type-specific creative details
	if (creative.type === "text" && creative.textData) {
		targetPrompt += `\nText Creative Details:\n`;
		if (creative.textData.headline)
			targetPrompt += `Headline: ${creative.textData.headline}\n`;
		if (creative.textData.body)
			targetPrompt += `Body: ${creative.textData.body}\n`;
		if (creative.textData.callToAction)
			targetPrompt += `Call to Action: ${creative.textData.callToAction}\n`;
		if (creative.textData.appealFeature)
			targetPrompt += `Appeal Feature: ${creative.textData.appealFeature}\n`;
		if (creative.textData.emotion)
			targetPrompt += `Emotion: ${creative.textData.emotion}\n`;
		if (creative.textData.platformNotes)
			targetPrompt += `Platform Notes: ${creative.textData.platformNotes}\n`;
	} else if (creative.type === "image" && creative.imageData) {
		targetPrompt += `\nImage Creative Details:\n`;
		if (creative.imageData.appealFeature)
			targetPrompt += `Appeal Feature: ${creative.imageData.appealFeature}\n`;
		if (creative.imageData.emotion)
			targetPrompt += `Emotion: ${creative.imageData.emotion}\n`;
		if (creative.imageData.platformNotes)
			targetPrompt += `Platform Notes: ${creative.imageData.platformNotes}\n`;
	} else if (creative.type === "video" && creative.videoData) {
		targetPrompt += `\nVideo Creative Details:\n`;
		if (creative.videoData.duration)
			targetPrompt += `Duration: ${creative.videoData.duration}\n`;
		if (creative.videoData.appealFeature)
			targetPrompt += `Appeal Feature: ${creative.videoData.appealFeature}\n`;
		if (creative.videoData.emotion)
			targetPrompt += `Emotion: ${creative.videoData.emotion}\n`;
		if (creative.videoData.platform)
			targetPrompt += `Platform: ${creative.videoData.platform}\n`;
	} else if (creative.type === "lp" && creative.lpData) {
		targetPrompt += `\nLanding Page Creative Details:\n`;
		if (creative.lpData.headline)
			targetPrompt += `Headline: ${creative.lpData.headline}\n`;
		if (creative.lpData.appealFeature)
			targetPrompt += `Appeal Feature: ${creative.lpData.appealFeature}\n`;
		if (creative.lpData.emotion)
			targetPrompt += `Emotion: ${creative.lpData.emotion}\n`;
		if (creative.lpData.platformNotes)
			targetPrompt += `Platform Notes: ${creative.lpData.platformNotes}\n`;
	}
	// Create a context-aware prompt for generating scenes and clips
	let prompt = `You are a highly creative and empathetic AI content strategist and professional social media content creator. Your mission is to craft compelling, non-generic, and emotionally resonant short-form (Reels/Shorts) and potentially longer-form (YouTube) video storyboards based on user input. Your primary goal is to deeply resonate with the target audience, stop the scroll, evoke a specific emotion, and drive action.

You MUST adhere to the provided structure, narrative flow, and constraints. However, your creativity is paramount in bringing these elements to life in a vivid, specific, and engaging way that avoids cliché and speaks directly to the target persona.
${targetPrompt}

The storyboard should tell a cohesive, visually driven story across all scenes, with a clear beginning (problem), middle (solution/value), and end (transformation/CTA). Each scene must have a specific, non-generic purpose directly linked to the persona's journey and the creative goals (Benefit Focus, Awe).

**Crucially, your scene descriptions, text overlays, and suggested actions must be VIVID, SPECIFIC, and aligned with the TARGET AUDIENCE, PAIN POINTS, DESIRES, BENEFIT FOCUS, and the specific type of "Awe" described above.** Avoid generic descriptions like "Person looks happy." Instead, describe *why* they look happy (e.g., "Persona smiles, shoulders relax as the summary appears instantly").

Here’s the high-impact narrative flow adapted for these platforms, which you must now populate with specific, creative, persona-driven content:

**Core Narrative Flow (Applies to All):**

1.  **Hook & Problem:** Grab attention immediately + Visually and emotionally show the *relatable struggle* of the 'Marketing Professional Organizado'. Make the viewer think, "That's me!"
2.  **Introduce Solution:** Present AI Recap as the elegant answer to *their specific* problem.
3.  **Showcase Value:** Demonstrate *how* it works *for them* and highlight the *tangible benefit* and key differentiator in action. Evoke the specific "Awe" moment here.
4.  **Transformation/Payoff:** Show the positive outcome – the feeling of relief, efficiency, productivity, and confidence. Depict the "after."
5.  **Call to Action (CTA):** Tell the viewer clearly and concisely what to do next to achieve this transformation themselves.

**Adaptation for Instagram (Reels/Stories) & YouTube Shorts (Short-Form Vertical Video):**

*   **Key Principles:** Speed, Visual Clarity, Instant Hook, Mobile-First, Sound-Optional Design (use compelling, readable text overlays).
*   **Goal:** Quick engagement, stop the scroll, immediate understanding, drive profile visits/link clicks.
*   **Creative Execution:** Focus on dynamic cuts, close-ups on the persona's struggle and the solution's ease of use, satisfying visual transitions showing the 'before-after', and text overlays that mirror the persona's internal monologue or state the benefit/awe moment concisely.

**Short-Form Narrative Breakdown (Aim for < 60 seconds, often 15-30s):**

1.  **The INSTANT Hook & Identify/Problem ID (Seconds 0-3):**
    *   **Execution:** Start *immediately* with a highly relatable visual of the persona's pain point. Show the *chaos* of scattered information (piles of documents, overwhelming number of tabs, endless scrolling through notes). Use a quick, empathetic text overlay stating the core problem (e.g., "Drowning in Notes?", "Wasted Time Searching?"). Show the persona's *frustration* (stressed facial expression, sigh).
    *   *Example Idea:* Quick cuts showing stacks of books/papers, a computer screen with dozens of open tabs, a hand scrolling endlessly through a messy notes app. Persona runs a hand through their hair or looks exasperated. Text: "Info Overload is REAL 😩"

2.  **Swift Solution Intro/SHOWCASE & Core Action (Seconds 3-10):**
    *   **Execution:** Introduce the AI Recap visually, smoothly transitioning from the problem. Show the persona interacting with it *directly* to solve the problem shown in the hook. Focus on the *single most impactful action* (e.g., pasting a link, uploading a file, clicking 'summarize'). Demonstrate the *ease of use*.
    *   *Example Idea:* A clean interface appears. Hand pastes a complex article link. Cursor hovers over a prominent "Summarize Instantly" button. The screen shows a quick processing animation.

3.  **The "Aha!" Moment/EMOTIONAL PAYOFF/ Key Benefit Flash (Seconds 10-20):**
    *   **Execution:** THIS IS WHERE YOU EVOKE THE "AWE." Show the immediate, satisfying positive result. The clear, concise summary appears. Show the persona's reaction: eyes widen slightly in surprise/delight, a genuine smile, shoulders visibly relax. Use a powerful text overlay highlighting the core benefit and the "Awe" factor (e.g., "🤯 Instant Clarity!", "Saved HOURS!", "Information, Organized. Finally."). Use a quick 'Before -> After' visual if possible (e.g., messy notes -> clean summary).
    *   *Example Idea:* The concise, perfectly formatted summary appears on screen. Persona reads it, their expression shifts from tense to genuinely impressed and relieved. Quick cut to text: "THAT took SECONDS?! ⏱️✨"

4.  **Quick Transformation Glimpse & CTA (Seconds 20-End):**
    *   **Execution:** Show the sustained positive state – the persona confidently using the summarized information, looking productive and in control. Immediately follow with a clear, concise, and visually dominant CTA. Use text overlays and platform features effectively.
    *   *Example Idea:* Persona is shown confidently sharing a point in a meeting (implied), or easily finding a key stat from a previous summary. Final screen: AI Recap logo + Text: "Get Organized, Stay Ahead." + "Link in Bio to Start!"

**Adaptation for YouTube Standard Videos (Longer-Form Horizontal/Vertical Video):**

*   **Key Principles:** Strong Hook (but more time), Deeper Value Proposition, Storytelling Depth, Clear Audio, Encourage Engagement, Drive Off-Platform Actions.
*   **Goal:** Build connection, educate/entertain, establish credibility, drive subscriptions or website visits/conversions.
*   **Creative Execution:** Use more realistic scenarios, allow for more detail in demonstrating features and benefits, build emotional connection through the persona's journey, use voiceover strategically.

**Longer-Form Narrative Breakdown (Can vary greatly, e.g., 2-7 minutes):**

1.  **The AUTHENTIC CONNECTION/Engaging Hook & Contextualized Problem (First 30-60 seconds):**
    *   **Execution:** Start with a relatable scene showing the 'Marketing Professional Organizado' in their natural habitat struggling. Show the *context* of their problem (e.g., preparing for a meeting, trying to write a report, doing research). Allow the frustration to build slightly more authentically than in short-form. Use internal monologue voiceover or relatable dialogue expressing the pain ("I know I wrote that down somewhere!", "How am I supposed to get through all this reading?"). Establish the *stakes* – why is this disorganization hindering their *actual job*?
    *   *Example Idea:* Scene: Persona at desk, surrounded by half-read articles, open files. Voiceover: "As a marketing pro, I *have* to stay updated. But between meetings and deadlines, finding time to read *everything* and actually *remember* it? Impossible. My notes look like a warzone." Show them searching frustratingly on screen.

2.  **Introducing the Solution/PROBLEM EXPLORATION & Detailed Walkthrough (Can span 1-3 minutes):**
    *   **Execution:** Introduce AI Recap as the discovery or solution they tried. Dedicate significant time to clearly demonstrate *how* it works step-by-step, focusing on the features that directly solve the problems just shown. Use clear screen recordings, show different input types (links, text, maybe file uploads). Explain *why* this approach is effective (e.g., uses advanced AI, focuses on key points). Build credibility through showing functionality.
    *   *Example Idea:* "That's when I found AI Recap." Show the process: copying a blog link -> pasting into AI Recap -> clicking summarize. Voiceover explains *what's happening* and *why it's better* than manual note-taking ("Instead of reading 3000 words, AI gets me the core ideas in seconds"). Show summarization of a video transcript.

3.  **Showcasing Unique Value/SOLUTION JOURNEY & Building Credibility (Can span 1-2 minutes):**
    *   **Execution:** Dive deeper. Show a slightly more complex use case (e.g., summarizing multiple articles for a report, organizing summaries into folders, using a search function). Highlight what makes AI Recap stand out – maybe its accuracy, speed, ease of organizing, or specific types of content it handles. Show the persona becoming more proficient and finding new ways to use it. Build trust by showing consistent results.
    *   *Example Idea:* "But it's not just summaries." Show the persona organizing summaries by project or topic. "Now, when I need info for the Q3 strategy meeting..." Show them instantly searching their AI Recap library and pulling up a key summary from weeks ago. Voiceover: "It's like having a perfectly organized second brain." *This is another moment for 'Awe' – the awe of finding buried info instantly.*

4.  **The Full Transformation/TRANSFORMATION IMPACT & Emotional Payoff (Can span 30-60 seconds):**
    *   **Execution:** Show the clear "after." Depict the persona *successfully using* the organized, summarized information. Show them less stressed, more confident, presenting ideas effectively, or simply having more free time. Contrast visually and narratively with the opening problem. Emphasize the emotional and practical benefits (saved hours, reduced stress, better performance, feeling knowledgeable).
    *   *Example Idea:* Persona is now shown calmly and confidently presenting data derived from their AI Recaps in a simulated meeting. Or, show them leaving work on time with a relaxed smile, or using their reclaimed time for a hobby. Voiceover: "AI Recap didn't just organize my notes; it gave me back time and confidence." Show their clean, organized digital workspace.

5.  **Clear Call to Action/COMPELLING CONCLUSION & Outro (Final 30 seconds):**
    *   **Execution:** Summarize the main benefit concisely. Deliver a clear, strong CTA. Use on-screen graphics, End Screens, and Cards effectively. Encourage subscription and engagement. End with clear branding.
    *   *Example Idea:* Persona looks directly at the camera. "If you're tired of information overload and messy notes, AI Recap is a game-changer." On-screen text/graphics: "Transform your workflow." "Click the link in the description to try AI Recap." Remind viewers to like/subscribe for more tips.
`;

	// Add context information header if any context is included
	if (includeProductInfo || includePersonaInfo || includeCreativeInfo) {
		prompt +=
			"\n\nDETAILED CONTEXT INFORMATION (Use it to make the content more interesting):\n";

		// Product context (only if includeProductInfo is true)
		if (includeProductInfo) {
			prompt += `\n## PRODUCT DETAILS (only promotion posts) ##\n`;
			prompt += `Product Name: ${product.name}\n`;

			if (product.overview) {
				prompt += `Overview: ${product.overview}\n`;
			}

			if (product.industry) {
				prompt += `Industry: ${product.industry}\n`;
			}

			if (product.details) {
				prompt += `Details: ${product.details}\n`;
			}

			if (product.featuresStrengths) {
				prompt += `Key Features and Strengths:\n${product.featuresStrengths}\n`;
			}
		}

		// Persona context (only if includePersonaInfo is true)
		if (includePersonaInfo) {
			prompt += `\n## TARGET AUDIENCE ##\n`;
			prompt += `Persona: ${persona.personaTitle ? ` (${persona.personaTitle})` : ""}\n`;

			// Demographics
			prompt += `\nDemographics\n`;

			if (
				persona.ageRangeSelection &&
				persona.ageRangeSelection !== "Unspecified"
			) {
				prompt += `Age Range\n${persona.ageRangeSelection === "Custom" ? persona.ageRangeCustom : persona.ageRangeSelection}\n`;
			}

			if (persona.gender && persona.gender !== "Unspecified") {
				prompt += `Gender\n${persona.gender}\n`;
			}

			if (persona.location) {
				prompt += `Location\n${persona.location}\n`;
			}

			if (persona.jobTitle) {
				prompt += `Job Title\n${persona.jobTitle}\n`;
			}

			if (persona.incomeLevel) {
				prompt += `Income Level\n${persona.incomeLevel}\n`;
			}

			// Psychographics
			prompt += `\nPsychographics\n`;

			if (persona.personalityTraits) {
				prompt += `Personality Traits\n${persona.personalityTraits}\n`;
			}

			if (persona.valuesText) {
				prompt += `Values\n${persona.valuesText}\n`;
			}

			if (persona.spendingHabits) {
				prompt += `Spending Habits\n${persona.spendingHabits}\n`;
			}

			if (persona.interestsHobbies) {
				prompt += `Interests & Hobbies\n${persona.interestsHobbies}\n`;
			}

			if (persona.lifestyle) {
				prompt += `Lifestyle\n${persona.lifestyle}\n`;
			}

			// Needs & Goals
			prompt += `\nNeeds & Goals\n`;

			if (persona.needsPainPoints) {
				prompt += `Pain Points: ${persona.needsPainPoints}\n`;
			}

			if (persona.goalsExpectations) {
				prompt += `Goals: ${persona.goalsExpectations}\n`;
			}

			// Story & Behavior
			prompt += `\nStory & Behavior\n`;

			if (persona.backstory) {
				prompt += `Backstory\n${persona.backstory}\n`;
			}

			if (persona.purchaseProcess) {
				prompt += `Purchase Process\n${persona.purchaseProcess}\n`;
			}
		}

		// Creative context (only if includeCreativeInfo is true)
		if (includeCreativeInfo && creative) {
			prompt += `\n## CREATIVE DETAILS ##\n`;
			prompt += `Creative Name: ${creative.name}\n`;
			prompt += `Creative Type: ${creative.type}\n`;

			// Add type-specific creative details
			if (creative.type === "text" && creative.textData) {
				if (creative.textData.headline)
					prompt += `Headline: ${creative.textData.headline}\n`;
				if (creative.textData.body)
					prompt += `Body: ${creative.textData.body}\n`;
				if (creative.textData.callToAction)
					prompt += `Call to Action: ${creative.textData.callToAction}\n`;
			} else if (creative.type === "image" && creative.imageData) {
				if (creative.imageData.appealFeature)
					prompt += `Appeal/Feature: ${creative.imageData.appealFeature}\n`;
				if (creative.imageData.emotion)
					prompt += `Emotion: ${creative.imageData.emotion}\n`;
			} else if (creative.type === "video" && creative.videoData) {
				if (creative.videoData.duration)
					prompt += `Duration: ${creative.videoData.duration}\n`;
				if (creative.videoData.emotion)
					prompt += `Emotion: ${creative.videoData.emotion}\n`;
			} else if (creative.type === "lp" && creative.lpData) {
				if (creative.lpData.headline)
					prompt += `Headline: ${creative.lpData.headline}\n`;
			}
		}

		// If not including any context, add a note about it
		if (!includeProductInfo && !includePersonaInfo && !includeCreativeInfo) {
			prompt +=
				"\n\nCreate content based solely on the user's prompt without additional context information.\n";
		}
		prompt += "Do not use markdown format like ```json";

		// Log the full prompt for debugging
		console.log(`FULL PROMPT TO ${aiProvider.toUpperCase()}:\n` + prompt);

		// Generate content with the selected AI provider
		console.log(`Sending prompt to ${aiProvider}...`);
		let text;
		try {
			const result = await generateContent(
				aiProvider,
				prompt,
				storyPrompt,
				storyboardSchema,
			);
			text = result.text;
			console.log(`Received response from ${aiProvider}`);
		} catch (aiError: any) {
			console.error(`Error generating content with ${aiProvider}:`, aiError);
			throw error(
				500,
				`Failed to generate content with ${aiProvider}: ${aiError.message || "Unknown error"}`,
			);
		}

		if (!text) {
			throw new Error(`No text received from ${aiProvider}`);
		}
		const storyboardData = JSON.parse(text);
		console.log("Generated storyboard data:", storyboardData);

		// Check if we have scenes in the response (new schema) or frames (old schema)
		const createdScenes = [];
		const createdClips = [];

		if (
			storyboardData.scenes &&
			Array.isArray(storyboardData.scenes) &&
			storyboardData.scenes.length > 0
		) {
			console.log("Processing scene-based storyboard structure");

			// Create scenes and clips based on the new structure
			for (
				let sceneIndex = 0;
				sceneIndex < storyboardData.scenes.length;
				sceneIndex++
			) {
				const sceneData = storyboardData.scenes[sceneIndex];

				// Create a new scene
				const [newScene] = await db
					.insert(scenes)
					.values({
						storyId: storyRecord.id,
						description: sceneData.description || `Scene ${sceneIndex + 1}`,
						orderIndex: sceneIndex, // Order based on index
						createdAt: new Date(),
						updatedAt: new Date(),
					})
					.returning();

				createdScenes.push(newScene);
				console.log(
					`Created scene ${sceneIndex + 1}/${storyboardData.scenes.length} with ID: ${newScene.id}`,
				);

				// Create clips for this scene
				if (sceneData.clips && Array.isArray(sceneData.clips)) {
					for (
						let clipIndex = 0;
						clipIndex < sceneData.clips.length;
						clipIndex++
					) {
						const clipData = sceneData.clips[clipIndex];
						try {
							// Create a clip for this scene
							const [newClip] = await db
								.insert(clips)
								.values({
									sceneId: newScene.id,
									orderIndex: clipIndex,
									narration: clipData.narration || "",
									description: clipData.visualDescription || "",
									canvas: JSON.stringify({ objects: [] }), // Empty canvas initially
									imageUrl: null, // Will be generated by the clip-preview endpoint
									duration: clipData.duration
										? Math.round(clipData.duration * 1000)
										: 5000, // Convert to milliseconds
									createdAt: new Date(),
									updatedAt: new Date(),
								})
								.returning();

							createdClips.push(newClip);
							console.log(
								`Created clip ${clipIndex + 1}/${sceneData.clips.length} for scene ${sceneIndex + 1} with ID: ${newClip.id}`,
							);
						} catch (clipError) {
							console.error(
								`Error creating clip for scene ${newScene.id}:`,
								clipError,
							);
						}
					}
				}
			}
		}
		// Fallback to old frame-based structure for backward compatibility
		else if (
			storyboardData.frames &&
			Array.isArray(storyboardData.frames) &&
			storyboardData.frames.length > 0
		) {
			console.log("Processing legacy frame-based storyboard structure");

			// Create a single scene for all frames
			const [newScene] = await db
				.insert(scenes)
				.values({
					storyId: storyRecord.id,
					description:
						storyboardData.description || "Generated from AI storyboard",
					orderIndex: 0, // First scene
					createdAt: new Date(),
					updatedAt: new Date(),
				})
				.returning();

			createdScenes.push(newScene);
			console.log(
				`Created single scene with ID: ${newScene.id} for ${storyboardData.frames.length} frames`,
			);

			// Create clips for each frame
			for (let i = 0; i < storyboardData.frames.length; i++) {
				const frame = storyboardData.frames[i];
				try {
					// Create a clip for this frame
					const [newClip] = await db
						.insert(clips)
						.values({
							sceneId: newScene.id,
							orderIndex: i,
							narration: frame.narration || "",
							description: frame.visualDescription || "",
							canvas: JSON.stringify({ objects: [] }), // Empty canvas initially
							imageUrl: null, // Will be generated by the clip-preview endpoint
							duration: 5000, // Default duration in milliseconds
							createdAt: new Date(),
							updatedAt: new Date(),
						})
						.returning();

					createdClips.push(newClip);
					console.log(
						`Created clip ${i + 1}/${storyboardData.frames.length} with ID: ${newClip.id}`,
					);
				} catch (clipError) {
					console.error(
						`Error creating clip for frame ${frame.id}:`,
						clipError,
					);
				}
			}
		} else {
			throw new Error("Invalid storyboard data: missing scenes or frames");
		}

		// Create a context summary for the response
		const contextSummary = {
			// Creative information
			creativeType: creative.type,
			creativeName: creative.name,
			creativeDescription: creative.description,

			// Type-specific creative information
			textHeadline:
				creative.type === "text" && creative.textData
					? creative.textData.headline
					: null,
			textBody:
				creative.type === "text" && creative.textData
					? creative.textData.body
					: null,
			textCTA:
				creative.type === "text" && creative.textData
					? creative.textData.callToAction
					: null,

			imageAppeal:
				creative.type === "image" && creative.imageData
					? creative.imageData.appealFeature
					: null,
			imageEmotion:
				creative.type === "image" && creative.imageData
					? creative.imageData.emotion
					: null,

			videoEmotion:
				creative.type === "video" && creative.videoData
					? creative.videoData.emotion
					: null,
			videoDuration:
				creative.type === "video" && creative.videoData
					? creative.videoData.duration
					: null,

			lpHeadline:
				creative.type === "lp" && creative.lpData
					? creative.lpData.headline
					: null,

			// Persona information
			personaName: persona.name,
			personaTitle: persona.personaTitle,
			personaPainPoints: persona.needsPainPoints,
			personaGoals: persona.goalsExpectations,
			personaValues: persona.valuesText,

			// Product information
			productName: product.name,
			productFeatures: product.featuresStrengths,
			productOverview: product.overview,
			productDetails: product.details,
		};

		return json({
			success: true,
			message: `Successfully created ${createdScenes.length} scenes with ${createdClips.length} clips from AI storyboard with context-aware content`,
			storyId: storyRecord.id,
			sceneCount: createdScenes.length,
			clipCount: createdClips.length,
			scenes: createdScenes,
			clips: createdClips,
			contextUsed:
				includeProductInfo || includePersonaInfo || includeCreativeInfo,
			contextSummary,
		});
	}
};
