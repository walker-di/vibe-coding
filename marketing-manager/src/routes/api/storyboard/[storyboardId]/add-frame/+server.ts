import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { setFrames } from '$lib/server/storyboardStore';

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
      }
    });

    // Create a context-aware prompt for generating frames
    let prompt = `Create a professional storyboard with 3 frames for a marketing campaign. For each frame, provide:
1. A detailed narration (voice-over script)
2. A detailed detailed visual description for the frame in english

The storyboard should tell a cohesive story across all frames, with a clear beginning, middle, and end.

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

    prompt += `\n\nFormat your response as follows for each frame:\n\nFrame 1:\nNarration: [detailed voice-over script]\nVisual: [detailed visual description]\n\nFrame 2:\nNarration: [detailed voice-over script]\nVisual: [detailed visual description]\n\nFrame 3:\nNarration: [detailed voice-over script]\nVisual: [detailed visual description]`;

    console.log('Sending prompt to Gemini:', prompt);

    // Generate content with Gemini
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log('Received response from Gemini');

    // Parse the generated frames
    const frames = parseFramesFromText(text);

    // Store the frames in memory (in a real app, you'd store them in a database)
    // For now, we'll just return them directly

    const mockResult = {
      success: true,
      storyboardId: storyboardId,
      message: 'Frames added successfully',
      framesAdded: frames.length
    };

    // Store the frames in our storyboard store
    setFrames(storyboardId, frames);

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

    return json(mockResult, { status: 201 });
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

// Helper function to parse frames from Gemini's text response
function parseFramesFromText(text: string) {
  const frames: Array<{
    id: string;
    narration: string;
    mainImagePrompt: string;
    imageUrl: string | null;
  }> = [];

  // Split the text by frame sections
  const frameRegex = /Frame \d+:\s*\n/g;
  const frameSections = text.split(frameRegex).filter((section: string) => section.trim().length > 0);

  // Process each frame section
  frameSections.forEach((section: string, index: number) => {
    // Extract narration and visual description
    const narrationMatch = section.match(/Narration:\s*(.+?)(?=\n\s*Visual:|$)/s);
    const visualMatch = section.match(/Visual:\s*(.+?)(?=\n\s*(?:Frame|$)|$)/s);

    const narration = narrationMatch ? narrationMatch[1].trim() : '';
    const mainImagePrompt = visualMatch ? visualMatch[1].trim() : '';

    frames.push({
      id: String(index + 1),
      narration,
      mainImagePrompt,
      imageUrl: null // We're not generating actual images in this example
    });
  });

  // If no frames were parsed, create at least one frame with the original text
  if (frames.length === 0) {
    frames.push({
      id: '1',
      narration: 'Generated narration',
      mainImagePrompt: text.substring(0, 200) + '...',
      imageUrl: null
    });
  }

  return frames;
}
