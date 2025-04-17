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

    console.log('Received context data in add-frame:', JSON.stringify(contextData, null, 2));

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

    // Create a context-aware prompt for generating scenes and clips
    let prompt = `Create a professional storyboard with 2-3 scenes for a marketing campaign, where each scene contains 1-3 clips.

Your output MUST be valid JSON conforming to the provided schema. The storyboard should tell a cohesive story across all scenes, with a clear beginning, middle, and end. Each scene should have a specific purpose in the narrative flow.

Story prompt: ${storyPrompt}

Structure your storyboard as follows:
1. Introduction Scene: Establish context, identify problem or need (1-2 clips)
2. Solution Scene: Present the product/service as the solution (1-3 clips)
3. Benefit/CTA Scene: Show benefits and include a call to action (1-2 clips)`;

    // Add context information if available
    if (contextData && Object.keys(contextData).length > 0) {
      console.log('Context data is available with keys:', Object.keys(contextData));

      // Check if we have the expected structure
      if (!contextData.product && !contextData.persona && !contextData.creative) {
        console.warn('Context data is missing expected structure (product, persona, creative)');
      }
      prompt += '\n\nDETAILED CONTEXT INFORMATION:\n';

      // Product context (most important)
      if (contextData.product) {
        prompt += `\n## PRODUCT DETAILS ##\n`;
        prompt += `Product Name: ${contextData.product.name}\n`;

        if (contextData.product.overview) {
          prompt += `Overview: ${contextData.product.overview}\n`;
        }

        if (contextData.product.industry) {
          prompt += `Industry: ${contextData.product.industry}\n`;
        }

        if (contextData.product.featuresStrengths) {
          prompt += `Key Features and Strengths:\n${contextData.product.featuresStrengths}\n`;
        }

        if (contextData.product.competitiveAdvantage) {
          prompt += `Competitive Advantage: ${contextData.product.competitiveAdvantage}\n`;
        }

        if (contextData.product.valueProposition) {
          prompt += `Value Proposition: ${contextData.product.valueProposition}\n`;
        }
      }

      // Persona context (second most important)
      if (contextData.persona) {
        prompt += `\n## TARGET AUDIENCE DETAILS ##\n`;
        prompt += `Persona Name: ${contextData.persona.name}`;

        if (contextData.persona.personaTitle) {
          prompt += ` (${contextData.persona.personaTitle})\n`;
        } else {
          prompt += '\n';
        }

        if (contextData.persona.demographics) {
          prompt += `Demographics: ${contextData.persona.demographics}\n`;
        }

        if (contextData.persona.needsPainPoints) {
          prompt += `Pain Points and Needs:\n${contextData.persona.needsPainPoints}\n`;
        }

        if (contextData.persona.goalsExpectations) {
          prompt += `Goals and Expectations:\n${contextData.persona.goalsExpectations}\n`;
        }

        if (contextData.persona.valuesText) {
          prompt += `Values: ${contextData.persona.valuesText}\n`;
        }

        if (contextData.persona.interestsHobbies) {
          prompt += `Interests and Hobbies: ${contextData.persona.interestsHobbies}\n`;
        }

        if (contextData.persona.mediaConsumption) {
          prompt += `Media Consumption: ${contextData.persona.mediaConsumption}\n`;
        }

        if (contextData.persona.purchaseBehavior) {
          prompt += `Purchase Behavior: ${contextData.persona.purchaseBehavior}\n`;
        }
      }

      // Creative context (details about the specific creative)
      if (contextData.creative) {
        prompt += `\n## CREATIVE DETAILS ##\n`;
        prompt += `Creative Name: ${contextData.creative.name}\n`;
        prompt += `Creative Type: ${contextData.creative.type}\n`;

        if (contextData.creative.description) {
          prompt += `Description: ${contextData.creative.description}\n`;
        }

        // Add type-specific data with more detailed instructions
        if (contextData.creative.type === 'text' && contextData.creative.textData) {
          prompt += `\nText Ad Specifics:\n`;
          prompt += `- Headline: "${contextData.creative.textData.headline || 'N/A'}"\n`;
          prompt += `- Body: "${contextData.creative.textData.body || 'N/A'}"\n`;
          prompt += `- Call to Action: "${contextData.creative.textData.callToAction || 'N/A'}"\n`;

          if (contextData.creative.textData.emotion) {
            prompt += `- Emotional Tone: ${contextData.creative.textData.emotion}\n`;
          }

          if (contextData.creative.textData.appealFeature) {
            prompt += `- Appeal Feature: ${contextData.creative.textData.appealFeature}\n`;
          }

          prompt += `\nMake sure the storyboard frames align with this text ad content, especially the headline and call to action.\n`;
        }
        else if (contextData.creative.type === 'image' && contextData.creative.imageData) {
          prompt += `\nImage Ad Specifics:\n`;

          if (contextData.creative.imageData.appealFeature) {
            prompt += `- Appeal Feature: ${contextData.creative.imageData.appealFeature}\n`;
          }

          if (contextData.creative.imageData.emotion) {
            prompt += `- Emotional Tone: ${contextData.creative.imageData.emotion}\n`;
          }

          if (contextData.creative.imageData.visualStyle) {
            prompt += `- Visual Style: ${contextData.creative.imageData.visualStyle}\n`;
          }

          prompt += `\nEnsure the storyboard frames have consistent visual style and emotional tone with this image ad.\n`;
        }
        else if (contextData.creative.type === 'video' && contextData.creative.videoData) {
          prompt += `\nVideo Ad Specifics:\n`;
          prompt += `- Duration: ${contextData.creative.videoData.duration || 'N/A'}\n`;
          prompt += `- Emotional Tone: ${contextData.creative.videoData.emotion || 'N/A'}\n`;

          if (contextData.creative.videoData.appealFeature) {
            prompt += `- Appeal Feature: ${contextData.creative.videoData.appealFeature}\n`;
          }

          if (contextData.creative.videoData.visualStyle) {
            prompt += `- Visual Style: ${contextData.creative.videoData.visualStyle}\n`;
          }

          prompt += `\nCreate a storyboard that would work well for a ${contextData.creative.videoData.duration || '30-second'} video with the specified emotional tone.\n`;
        }
        else if (contextData.creative.type === 'lp' && contextData.creative.lpData) {
          prompt += `\nLanding Page Specifics:\n`;
          prompt += `- Headline: "${contextData.creative.lpData.headline || 'N/A'}"\n`;

          if (contextData.creative.lpData.subheadline) {
            prompt += `- Subheadline: "${contextData.creative.lpData.subheadline}"\n`;
          }

          if (contextData.creative.lpData.callToAction) {
            prompt += `- Call to Action: "${contextData.creative.lpData.callToAction}"\n`;
          }

          prompt += `\nCreate a storyboard that effectively communicates the landing page's key message and call to action.\n`;
        }
      }

      // Add specific instructions based on the context
      prompt += '\n## CONTEXT-SPECIFIC INSTRUCTIONS ##\n';

      // Product-specific instructions
      if (contextData.product) {
        prompt += `- Highlight the key features of ${contextData.product.name}: ${contextData.product.featuresStrengths || 'its main benefits'}\n`;
        prompt += `- Emphasize the product's value proposition\n`;
      }

      // Persona-specific instructions
      if (contextData.persona) {
        prompt += `- Address the specific pain points of ${contextData.persona.personaTitle || contextData.persona.name}: ${contextData.persona.needsPainPoints || 'their key challenges'}\n`;
        prompt += `- Show how the product helps achieve their goals: ${contextData.persona.goalsExpectations || 'their desired outcomes'}\n`;
      }

      // Creative type-specific instructions
      if (contextData.creative) {
        if (contextData.creative.type === 'text') {
          prompt += `- Ensure the narration aligns with the text ad's messaging\n`;
        } else if (contextData.creative.type === 'image') {
          prompt += `- Create visually compelling scenes that would translate well to static images\n`;
        } else if (contextData.creative.type === 'video') {
          prompt += `- Design a narrative flow that works well for a video format\n`;
          prompt += `- Include dynamic elements that would engage viewers\n`;
        } else if (contextData.creative.type === 'lp') {
          prompt += `- Focus on the key sections that would appear on a landing page\n`;
          prompt += `- Emphasize the call to action in the final frame\n`;
        }
      }
    }

    prompt += `\n\nIMPORTANT INSTRUCTIONS:\n- Generate a title and description for the storyboard that specifically references the product and target audience\n- Create 2-3 scenes, each with 1-3 clips that form a coherent narrative\n- Each scene should have a clear purpose (introduction, solution, benefits/CTA)\n- Each clip should have high-quality, detailed content that is directly relevant to the context provided\n- The narration should be concise but impactful, using language that would resonate with the target audience\n- The visual descriptions should be detailed enough for a designer to create the visuals\n- Include a suggested duration for each clip (in seconds, typically between 2-5 seconds)\n- Ensure the scenes and clips tell a cohesive story with a clear beginning (problem/need), middle (solution/product), and end (benefit/call to action)\n- Use a tone and style that matches the creative type and emotional context\n- Include specific product features and benefits mentioned in the context\n- Address the specific pain points and goals of the target persona\n- Make each scene distinct but connected to the overall narrative flow`;

    // Log the full prompt for debugging
    console.log('FULL PROMPT TO GEMINI:\n' + prompt);

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

      // Validate the response structure - check for scenes first (new schema)
      if (storyboardData.scenes && Array.isArray(storyboardData.scenes) && storyboardData.scenes.length > 0) {
        console.log('Using new scene-based schema');

        // Flatten scenes and clips into frames for backward compatibility
        const frames = [];

        storyboardData.scenes.forEach((scene: any, sceneIndex: number) => {
          // Store scene information in the first clip of each scene
          if (scene.clips && Array.isArray(scene.clips) && scene.clips.length > 0) {
            scene.clips.forEach((clip: any, clipIndex: number) => {
              frames.push({
                id: `${sceneIndex + 1}-${clipIndex + 1}`,
                sceneId: sceneIndex + 1,
                sceneDescription: scene.description || `Scene ${sceneIndex + 1}`,
                narration: clip.narration || 'Professional narration for this clip.',
                mainImagePrompt: clip.visualDescription || 'Professional visual for this marketing clip.',
                duration: clip.duration ? Math.round(clip.duration * 1000) : 3000, // Convert to milliseconds
                imageUrl: null
              });
            });
          } else {
            // If no clips in scene, create a placeholder
            frames.push({
              id: `${sceneIndex + 1}-1`,
              sceneId: sceneIndex + 1,
              sceneDescription: scene.description || `Scene ${sceneIndex + 1}`,
              narration: 'Professional narration for this scene.',
              mainImagePrompt: 'Professional visual for this marketing scene.',
              duration: 3000,
              imageUrl: null
            });
          }
        });

        // Store the frames in our storyboard store
        setFrames(storyboardId, frames);
      }
      // Fallback to old schema for backward compatibility
      else if (storyboardData.frames && Array.isArray(storyboardData.frames) && storyboardData.frames.length > 0) {
        console.log('Using legacy frame-based schema');

        // Convert the structured data to our frame format
        const frames = storyboardData.frames.map((frame: any, index: number) => ({
          id: String(index + 1),
          sceneId: 1, // All frames belong to the same scene in old schema
          sceneDescription: 'Main Scene',
          narration: frame.narration || 'Professional narration for this frame.',
          mainImagePrompt: frame.visualDescription || 'Professional visual for this marketing frame.',
          duration: 3000, // Default duration
          imageUrl: null
        }));

        // Store the frames in our storyboard store
        setFrames(storyboardId, frames);
      } else {
        throw new Error('Invalid response structure: missing or empty scenes/frames array');
      }

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


