import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { setFrames, setMetadata } from '$lib/server/storyboardStore';
import { storyboardSchema } from '$lib/server/storyboardSchema';

// This endpoint forwards the request to the AI storyboard creator service
export const POST: RequestHandler = async ({ request, params }) => {
  const storyboardId = params.storyboardId;
  if (!storyboardId) {
    throw error(400, 'Missing storyboardId parameter');
  }

  const GEMINI_API_KEY = process.env.GOOGLE_API_KEY;

  if (!GEMINI_API_KEY) {
    throw error(500, 'Server configuration error: GOOGLE_API_KEY is missing');
  }

  let requestData;
  try {
    requestData = await request.json();
    console.log(`Received data at /api/storyboard/${storyboardId}/add-frame:`, requestData);

    const { storyPrompt, contextData } = requestData;

    if (!storyPrompt) {
      throw error(400, 'Missing required parameter: storyPrompt');
    }

    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
        responseSchema: storyboardSchema as any // Type casting needed due to schema type mismatch
      }
    });

    // Create a context-aware prompt for generating frames
    let prompt = `Create a professional storyboard with 3 frames for a marketing campaign.

Your output MUST be valid JSON conforming to the provided schema. The storyboard should tell a cohesive story across all frames, with a clear beginning, middle, and end.

Story prompt: ${storyPrompt}`;

    // Add context information if available
    if (contextData && Object.keys(contextData).length > 0) {
      prompt += '\n\nAdditional context:';

      if (contextData.creative) {
        prompt += `\n- Creative Type: ${contextData.creative.type}`;
        prompt += `\n- Creative Name: ${contextData.creative.name}`;

        if (contextData.creative.description) {
          prompt += `\n- Creative Description: ${contextData.creative.description}`;
        }

        // Add type-specific data
        if (contextData.creative.type === 'text' && contextData.creative.textData) {
          prompt += `\n- Headline: ${contextData.creative.textData.headline || 'N/A'}`;
          prompt += `\n- Body: ${contextData.creative.textData.body || 'N/A'}`;
          prompt += `\n- Call to Action: ${contextData.creative.textData.callToAction || 'N/A'}`;
        } else if (contextData.creative.type === 'video' && contextData.creative.videoData) {
          prompt += `\n- Video Duration: ${contextData.creative.videoData.duration || 'N/A'}`;
          prompt += `\n- Video Emotion: ${contextData.creative.videoData.emotion || 'N/A'}`;
        }
      }

      if (contextData.persona) {
        prompt += `\n- Target Persona: ${contextData.persona.name}`;
        if (contextData.persona.personaTitle) {
          prompt += ` (${contextData.persona.personaTitle})`;
        }
        if (contextData.persona.needsPainPoints) {
          prompt += `\n- Pain Points: ${contextData.persona.needsPainPoints}`;
        }
        if (contextData.persona.goalsExpectations) {
          prompt += `\n- Goals: ${contextData.persona.goalsExpectations}`;
        }
      }

      if (contextData.product) {
        prompt += `\n- Product: ${contextData.product.name}`;
        if (contextData.product.featuresStrengths) {
          prompt += `\n- Key Features: ${contextData.product.featuresStrengths}`;
        }
      }
    }

    prompt += `\n\nIMPORTANT INSTRUCTIONS:\n- Generate a title and description for the storyboard\n- Create exactly 3 frames with professional narration and visual descriptions\n- Each frame should have high-quality, detailed content\n- The narration should be concise but impactful\n- The visual descriptions should be detailed enough for a designer to create the visuals\n- Ensure the frames tell a cohesive story with a clear beginning, middle, and end`;

    console.log('Sending prompt to Gemini:', prompt);

    // Generate content with Gemini
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log('Received response from Gemini');

    // Parse the generated content
    let storyboardData;
    try {
      storyboardData = JSON.parse(text);
      console.log('Parsed storyboard data:', storyboardData);

      // Validate the response structure
      if (!storyboardData.frames || !Array.isArray(storyboardData.frames) || storyboardData.frames.length === 0) {
        throw new Error('Invalid response structure: missing or empty frames array');
      }

      // Convert the structured data to our frame format
      const frames = storyboardData.frames.map((frame: any, index: number) => ({
        id: String(index + 1),
        narration: frame.narration || 'Professional narration for this frame.',
        mainImagePrompt: frame.visualDescription || 'Professional visual for this marketing frame.',
        imageUrl: null
      }));

      // Store the frames in our storyboard store
      setFrames(storyboardId, frames);

      // Store the metadata
      const title = storyboardData.title || 'Professional Marketing Storyboard';
      const description = storyboardData.description || 'A cohesive marketing narrative.';

      setMetadata(storyboardId, {
        title,
        description
      });

      const result = {
        success: true,
        storyboardId: storyboardId,
        title,
        description,
        message: 'Frames added successfully',
        framesAdded: frames.length
      };

      console.log(`Generated ${frames.length} frames for storyboard ${storyboardId}:`, frames);

    // Uncomment this when you have a proper external service
    /*
    const response = await fetch(`http://localhost:8000/api/storyboard/${storyboardId}/add-frame`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `API Error: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('AI Storyboard Creator API Response:', result);
    */

    return json(result, { status: 201 });
    } catch (parseError: any) {
      console.error('Error parsing or processing AI response:', parseError);
      throw error(500, `Failed to process AI response: ${parseError.message || 'Unknown error'}`);
    }
  } catch (err) {
    const error_obj = err as any;
    console.error(`Error in /api/storyboard/${storyboardId}/add-frame:`, err);

    // Handle potential JSON parsing errors from request
    if (err instanceof SyntaxError) {
      throw error(400, 'Invalid JSON in request body');
    }
    // Handle errors thrown during API call
    if (error_obj.status) {
      throw error(error_obj.status, error_obj.body?.message || 'API Error');
    }
    // Generic internal server error
    throw error(500, `Internal Server Error adding frames: ${error_obj.message || 'Unknown error'}`);
  }
};


