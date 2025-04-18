import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { env } from '$env/dynamic/private';

/**
 * Converts a Gemini schema format to OpenAI schema format
 * Gemini uses uppercase strings for types, OpenAI uses lowercase
 */
function convertGeminiSchemaToOpenAI(geminiSchema: any): any {
  if (!geminiSchema) return {};

  // For OpenAI, we'll create a simplified schema that follows JSON Schema format
  // This is a more reliable approach than trying to convert Gemini's schema format

  // Create a standard JSON Schema for the storyboard
  return {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "description": "Title for the storyboard"
      },
      "description": {
        "type": "string",
        "description": "Brief description of the storyboard"
      },
      "scenes": {
        "type": "array",
        "description": "Array of scenes in the storyboard, each with a specific purpose in the narrative",
        "items": {
          "type": "object",
          "properties": {
            "description": {
              "type": "string",
              "description": "A descriptive title for this scene that captures its purpose in the overall narrative"
            },
            "clips": {
              "type": "array",
              "description": "Array of clips that form a coherent scene with a specific purpose in the story",
              "items": {
                "type": "object",
                "properties": {
                  "narration": {
                    "type": "string",
                    "description": "Professional voice-over script for this clip in Brazilian Portuguese"
                  },
                  "visualDescription": {
                    "type": "string",
                    "description": "Detailed visual description of what appears in this clip"
                  },
                  "duration": {
                    "type": "number",
                    "description": "Suggested duration for this clip in seconds (typically between 2-5 seconds)"
                  }
                },
                "required": ["narration", "visualDescription", "duration"],
                "additionalProperties": false
              }
            }
          },
          "required": ["description", "clips"],
          "additionalProperties": false
        }
      }
    },
    "required": ["title", "description", "scenes"],
    "additionalProperties": false
  };
}

// API Keys from environment variables
const GEMINI_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Initialize clients only if keys exist
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Provider types
export type AIProvider = 'gemini' | 'openai';

// Error handling for missing API keys
export function checkProviderAvailability(provider: AIProvider): void {
  if (provider === 'gemini' && !GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY environment variable is not set.');
  }

  if (provider === 'openai' && !OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set.');
  }
}

// Generic interface for AI responses
export interface AIResponse {
  text: string;
}

/**
 * Generate content using the specified AI provider
 * @param provider The AI provider to use ('gemini' or 'openai')
 * @param systemPrompt The system prompt/instruction
 * @param userPrompt The user prompt/query
 * @param schema The JSON schema for structured output
 * @returns The AI response
 */
export async function generateContent(
  provider: AIProvider,
  systemPrompt: string,
  userPrompt: string,
  schema: any
): Promise<AIResponse> {
  // Check if the provider is available
  checkProviderAvailability(provider);

  if (provider === 'gemini') {
    return generateWithGemini(systemPrompt, userPrompt, schema);
  } else if (provider === 'openai') {
    return generateWithOpenAI(systemPrompt, userPrompt, schema);
  } else {
    throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

/**
 * Generate content using Gemini
 */
async function generateWithGemini(
  systemPrompt: string,
  userPrompt: string,
  schema: any
): Promise<AIResponse> {
  if (!genAI) {
    throw new Error('Gemini client not initialized. Check API key.');
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-preview-04-17',
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      responseMimeType: 'application/json',
      responseSchema: schema
    }
  });

  const result = await model.generateContent({
    systemInstruction: systemPrompt,
    contents: [{ role: "user", parts: [{ text: userPrompt }] }]
  });

  const response = result.response;
  return { text: response.text() };
}

/**
 * Generate content using OpenAI
 */
async function generateWithOpenAI(
  systemPrompt: string,
  userPrompt: string,
  schema: any
): Promise<AIResponse> {
  if (!openai) {
    throw new Error('OpenAI client not initialized. Check API key.');
  }

  // Convert Gemini schema format to OpenAI schema format
  const openAISchema = convertGeminiSchemaToOpenAI(schema);

  try {
    console.log('OpenAI schema:', JSON.stringify(openAISchema, null, 2));
    const response = await openai.responses.create({
      model: "gpt-4o",
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
    console.error('OpenAI API error:', error);
    if (error.response) {
      console.error('OpenAI API response:', error.response.data);
    }

    // Provide more specific error messages
    if (error.message.includes('Invalid schema')) {
      throw new Error(`OpenAI schema validation error: ${error.message}. Please check the schema format.`);
    } else if (error.message.includes('authentication')) {
      throw new Error('OpenAI authentication error. Please check your API key.');
    } else if (error.message.includes('rate limit')) {
      throw new Error('OpenAI rate limit exceeded. Please try again later.');
    }

    throw error;
  }

}
