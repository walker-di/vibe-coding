import { env } from "$env/dynamic/private";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

function convertGeminiSchemaToOpenAI(geminiSchema: any): any {
	if (!geminiSchema) return {};

	return {
		type: "object",
		properties: {
			title: {
				type: "string",
				description: "Title for the storyboard",
			},
			description: {
				type: "string",
				description: "Brief description of the storyboard",
			},
			scenes: {
				type: "array",
				description:
					"Array of scenes in the storyboard, each with a specific purpose in the narrative",
				items: {
					type: "object",
					properties: {
						description: {
							type: "string",
							description:
								"A descriptive title for this scene that captures its purpose in the overall narrative",
						},
						clips: {
							type: "array",
							description:
								"Array of clips that form a coherent scene with a specific purpose in the story",
							items: {
								type: "object",
								properties: {
									narration: {
										type: "string",
										description:
											"Professional voice-over script for this clip in Brazilian Portuguese",
									},
									visualDescription: {
										type: "string",
										description:
											"Detailed visual description of what appears in this clip",
									},
									duration: {
										type: "number",
										description:
											"Suggested duration for this clip in seconds (typically between 5-10 seconds)",
									},
								},
								required: ["narration", "visualDescription", "duration"],
								additionalProperties: false,
							},
						},
					},
					required: ["description", "clips"],
					additionalProperties: false,
				},
			},
		},
		required: ["title", "description", "scenes"],
		additionalProperties: false,
	};
}

// API Keys from environment variables
const GEMINI_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Initialize clients only if keys exist
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
const anthropic = ANTHROPIC_API_KEY
	? new Anthropic({ apiKey: ANTHROPIC_API_KEY })
	: null;

// Provider types
export type AIProvider = "gemini" | "openai" | "claude";

// Error handling for missing API keys
export function checkProviderAvailability(provider: AIProvider): void {
	if (provider === "gemini" && !GEMINI_API_KEY) {
		throw new Error(
			"GEMINI_API_KEY or GOOGLE_API_KEY environment variable is not set.",
		);
	}

	if (provider === "openai" && !OPENAI_API_KEY) {
		throw new Error("OPENAI_API_KEY environment variable is not set.");
	}

	if (provider === "claude" && !ANTHROPIC_API_KEY) {
		throw new Error("ANTHROPIC_API_KEY environment variable is not set.");
	}
}

// Generic interface for AI responses
export interface AIResponse {
	text: string;
}

export async function generateContent(
	provider: AIProvider,
	systemPrompt: string,
	userPrompt: string,
	schema: any,
): Promise<AIResponse> {
	// Check if the provider is available
	checkProviderAvailability(provider);

	if (provider === "gemini") {
		return generateWithGemini(systemPrompt, userPrompt, schema);
	} else if (provider === "openai") {
		return generateWithOpenAI(systemPrompt, userPrompt, schema);
	} else if (provider === "claude") {
		return generateWithClaude(systemPrompt, userPrompt, schema);
	} else {
		throw new Error(`Unsupported AI provider: ${provider}`);
	}
}

async function generateWithGemini(
	systemPrompt: string,
	userPrompt: string,
	schema: any,
): Promise<AIResponse> {
	if (!genAI) {
		throw new Error("Gemini client not initialized. Check API key.");
	}

	const model = genAI.getGenerativeModel({
		model: "gemini-2.5-flash-preview-05-20",
		generationConfig: {
			temperature: 0.7,
			topP: 0.9,
			responseMimeType: "application/json",
			responseSchema: schema,
		},
	});

	const result = await model.generateContent({
		systemInstruction: systemPrompt,
		contents: [{ role: "user", parts: [{ text: userPrompt }] }],
	});

	const response = result.response;
	return { text: response.text() };
}

async function generateWithOpenAI(
	systemPrompt: string,
	userPrompt: string,
	schema: any,
): Promise<AIResponse> {
	if (!openai) {
		throw new Error("OpenAI client not initialized. Check API key.");
	}

	// Convert Gemini schema format to OpenAI schema format
	const openAISchema = convertGeminiSchemaToOpenAI(schema);

	try {
		console.log("OpenAI schema:", JSON.stringify(openAISchema, null, 2));
		const response = await openai.responses.create({
			model: "o3",
			input: [
				{
					role: "system",
					content: systemPrompt,
				},
				{
					role: "user",
					content: userPrompt,
				},
			],
			text: {
				format: {
					type: "json_schema",
					name: "storyboard",
					description: "Dynamically generated storyboard",
					schema: openAISchema,
					strict: true,
				},
			},
		});

		return { text: response.output_text };
	} catch (error: any) {
		console.error("OpenAI API error:", error);
		if (error.response) {
			console.error("OpenAI API response:", error.response.data);
		}

		// Provide more specific error messages
		if (error.message.includes("Invalid schema")) {
			throw new Error(
				`OpenAI schema validation error: ${error.message}. Please check the schema format.`,
			);
		} else if (error.message.includes("authentication")) {
			throw new Error(
				"OpenAI authentication error. Please check your API key.",
			);
		} else if (error.message.includes("rate limit")) {
			throw new Error("OpenAI rate limit exceeded. Please try again later.");
		}

		throw error;
	}
}

async function generateWithClaude(
	systemPrompt: string,
	userPrompt: string,
	schema: any,
): Promise<AIResponse> {
	if (!anthropic) {
		throw new Error("Anthropic client not initialized. Check API key.");
	}

	try {
		console.log("Generating content with Claude...");

		// Convert the schema to a JSON string for inclusion in the system prompt
		const schemaString = JSON.stringify(
			convertGeminiSchemaToOpenAI(schema),
			null,
			2,
		);

		// Create a combined prompt that includes the schema
		const combinedSystemPrompt = `${systemPrompt}\n\nYour response must be a valid JSON object that follows this schema:\n${schemaString}\n\nDo not include any explanations, only provide a RFC8259 compliant JSON response following the schema.`;

		const response = await anthropic.messages.create({
			model: "claude-sonnet-4-0",
			max_tokens: 8000,
			system: combinedSystemPrompt,
			messages: [{ role: "user", content: userPrompt }],
		});

		// Extract the text content from the response
		const textContent = response.content
			.filter((item) => item.type === "text")
			.map((item) => item.text)
			.join("");

		return { text: textContent };
	} catch (error: any) {
		console.error("Claude API error:", error);

		// Provide more specific error messages
		if (error.status === 401) {
			throw new Error(
				"Claude authentication error. Please check your API key.",
			);
		} else if (error.status === 429) {
			throw new Error("Claude rate limit exceeded. Please try again later.");
		} else if (error.status === 400) {
			throw new Error(
				`Claude request error: ${error.message}. Please check your inputs.`,
			);
		}

		throw error;
	}
}
