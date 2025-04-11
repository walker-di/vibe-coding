import { GoogleGenerativeAI } from '@google/generative-ai';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler, RequestEvent } from './$types';
import { db } from '$lib/server/db';
import { products, personas, creatives, scenes, clips, stories } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// Get the API key from environment variables
const GEMINI_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY or GOOGLE_API_KEY environment variable is not set.');
}

// Schema for the storyboard frames
const storyboardSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING', description: 'Title for the storyboard' },
    description: { type: 'STRING', description: 'Brief description of the storyboard' },
    frames: {
      type: 'ARRAY',
      description: 'Array of frames in the storyboard',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING', description: 'Unique identifier for the frame' },
          narration: { type: 'STRING', description: 'Narration text for this frame' },
          visualDescription: { type: 'STRING', description: 'Detailed description of the visual elements in this frame' }
        },
        required: ['id', 'narration', 'visualDescription']
      }
    }
  },
  required: ['title', 'description', 'frames']
};

export const POST: RequestHandler = async ({ request, params }: RequestEvent) => {
  // Check if the API key is available
  if (!GEMINI_API_KEY) {
    console.error('API key is missing. Check your environment variables.');
    throw error(500, 'Server configuration error: API key missing. Please set GOOGLE_API_KEY or GEMINI_API_KEY in your environment variables.');
  }

  const productId = parseInt(params.productId || '', 10);
  const personaId = parseInt(params.personaId || '', 10);
  const creativeId = parseInt(params.creativeId || '', 10);

  if (isNaN(productId) || isNaN(personaId) || isNaN(creativeId)) {
    throw error(400, 'Invalid Product, Persona, or Creative ID.');
  }

  let storyPrompt: string;
  let storyId: number | undefined;

  try {
    const body = await request.json();
    storyPrompt = body.storyPrompt;
    storyId = body.storyId;

    if (!storyPrompt || typeof storyPrompt !== 'string') {
      throw new Error('Invalid or missing storyPrompt.');
    }

  } catch (err: any) {
    console.error('Error parsing request body:', err);
    throw error(400, `Bad Request: Could not parse request body. ${err.message}`);
  }

  try {
    // Fetch Product, Persona, and Creative details for context
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
      columns: {
        name: true,
        description: true,
        industry: true,
        overview: true,
        details: true,
        featuresStrengths: true
      }
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
        purchaseProcess: true
      }
    });

    const creative = await db.query.creatives.findFirst({
      where: eq(creatives.id, creativeId),
      with: {
        textData: true,
        imageData: true,
        videoData: true,
        lpData: true
      }
    });

    console.log('Fetched product:', product);
    console.log('Fetched persona:', persona);
    console.log('Fetched creative:', creative);

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
        columns: { id: true, title: true, aspectRatio: true }
      });

      if (!storyRecord) {
        throw error(404, `Story with ID ${storyId} not found`);
      }
    } else {
      // Create a new story if storyId is not provided
      const storyName = storyPrompt.substring(0, 30) + '...';
      const [newStory] = await db.insert(stories).values({
        creativeId, // Required field
        title: storyName,
        description: storyPrompt,
        aspectRatio: '16:9',
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      storyRecord = newStory;
      console.log(`Created new story with ID: ${storyRecord.id}`);
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

    // Add context information
    prompt += '\n\nDETAILED CONTEXT INFORMATION:\n';

    // Product context (most important)
    prompt += `\n## PRODUCT DETAILS ##\n`;
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

    // Persona context
    prompt += `\n## TARGET AUDIENCE ##\n`;
    prompt += `Persona: ${persona.name}${persona.personaTitle ? ` (${persona.personaTitle})` : ''}\n`;

    // Demographics
    prompt += `\nDemographics\n`;

    if (persona.ageRangeSelection && persona.ageRangeSelection !== 'Unspecified') {
      prompt += `Age Range\n${persona.ageRangeSelection === 'Custom' ? persona.ageRangeCustom : persona.ageRangeSelection}\n`;
    }

    if (persona.gender && persona.gender !== 'Unspecified') {
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

    // Creative context
    prompt += `\n## CREATIVE DETAILS ##\n`;
    prompt += `Creative Name: ${creative.name}\n`;
    prompt += `Creative Type: ${creative.type.toUpperCase()}\n`;

    if (creative.description) {
      prompt += `Description: ${creative.description}\n`;
    }

    // Type-specific creative details
    if (creative.type === 'text' && creative.textData) {
      prompt += `\nText Creative Details:\n`;
      if (creative.textData.headline) prompt += `Headline: ${creative.textData.headline}\n`;
      if (creative.textData.body) prompt += `Body: ${creative.textData.body}\n`;
      if (creative.textData.callToAction) prompt += `Call to Action: ${creative.textData.callToAction}\n`;
      if (creative.textData.appealFeature) prompt += `Appeal Feature: ${creative.textData.appealFeature}\n`;
      if (creative.textData.emotion) prompt += `Emotion: ${creative.textData.emotion}\n`;
      if (creative.textData.platformNotes) prompt += `Platform Notes: ${creative.textData.platformNotes}\n`;
    } else if (creative.type === 'image' && creative.imageData) {
      prompt += `\nImage Creative Details:\n`;
      if (creative.imageData.appealFeature) prompt += `Appeal Feature: ${creative.imageData.appealFeature}\n`;
      if (creative.imageData.emotion) prompt += `Emotion: ${creative.imageData.emotion}\n`;
      if (creative.imageData.platformNotes) prompt += `Platform Notes: ${creative.imageData.platformNotes}\n`;
    } else if (creative.type === 'video' && creative.videoData) {
      prompt += `\nVideo Creative Details:\n`;
      if (creative.videoData.duration) prompt += `Duration: ${creative.videoData.duration}\n`;
      if (creative.videoData.appealFeature) prompt += `Appeal Feature: ${creative.videoData.appealFeature}\n`;
      if (creative.videoData.emotion) prompt += `Emotion: ${creative.videoData.emotion}\n`;
      if (creative.videoData.platform) prompt += `Platform: ${creative.videoData.platform}\n`;
    } else if (creative.type === 'lp' && creative.lpData) {
      prompt += `\nLanding Page Creative Details:\n`;
      if (creative.lpData.headline) prompt += `Headline: ${creative.lpData.headline}\n`;
      if (creative.lpData.appealFeature) prompt += `Appeal Feature: ${creative.lpData.appealFeature}\n`;
      if (creative.lpData.emotion) prompt += `Emotion: ${creative.lpData.emotion}\n`;
      if (creative.lpData.platformNotes) prompt += `Platform Notes: ${creative.lpData.platformNotes}\n`;
    }

    prompt += `\n\nIMPORTANT INSTRUCTIONS:\n- Generate a title and description for the storyboard that specifically references the product and target audience\n- Create exactly 3 frames with professional narration and visual descriptions\n- Each frame should have high-quality, detailed content that is directly relevant to the context provided\n- The narration should be concise but impactful, using language that would resonate with the target audience\n- The visual descriptions should be detailed enough for a designer to create the visuals\n- Ensure the frames tell a cohesive story with a clear beginning (problem/need), middle (solution/product), and end (benefit/call to action)\n- Use a tone and style that matches the creative type and emotional context\n- Include specific product features and benefits mentioned in the context\n- Address the specific pain points and goals of the target persona`;

    // Log the full prompt for debugging
    console.log('FULL PROMPT TO GEMINI:\n' + prompt);

    // Generate content with Gemini
    console.log('Sending prompt to Gemini...');
    let text;
    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      text = response.text();
      console.log('Received response from Gemini');
    } catch (geminiError: any) {
      console.error('Error generating content with Gemini:', geminiError);
      throw error(500, `Failed to generate content with Gemini: ${geminiError.message || 'Unknown error'}`);
    }

    try {
      if (!text) {
        throw new Error('No text received from Gemini');
      }
      const storyboardData = JSON.parse(text);
      console.log('Generated storyboard data:', storyboardData);

      // Create a new scene for this story with context-aware description
      const [newScene] = await db.insert(scenes).values({
        storyId: storyRecord.id,
        description: storyboardData.description || 'Generated from AI storyboard',
        orderIndex: 0, // First scene
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      console.log(`Created new scene with ID: ${newScene.id}`);

      // Create clips for each frame
      const createdClips = [];
      for (let i = 0; i < storyboardData.frames.length; i++) {
        const frame = storyboardData.frames[i];
        try {
          // Create a clip for this frame
          const [newClip] = await db.insert(clips).values({
            sceneId: newScene.id,
            orderIndex: i,
            narration: frame.narration || '',
            description: frame.visualDescription || '',
            canvas: JSON.stringify({ objects: [] }), // Empty canvas initially
            imageUrl: null, // Will be generated by the clip-preview endpoint
            duration: 5, // Default duration in seconds
            createdAt: new Date(),
            updatedAt: new Date()
          }).returning();

          createdClips.push(newClip);
          console.log(`Created clip ${i + 1}/${storyboardData.frames.length} with ID: ${newClip.id}`);
        } catch (clipError) {
          console.error(`Error creating clip for frame ${frame.id}:`, clipError);
        }
      }

      // Create a context summary for the response
      const contextSummary = {
        // Creative information
        creativeType: creative.type,
        creativeName: creative.name,
        creativeDescription: creative.description,

        // Type-specific creative information
        textHeadline: creative.type === 'text' && creative.textData ? creative.textData.headline : null,
        textBody: creative.type === 'text' && creative.textData ? creative.textData.body : null,
        textCTA: creative.type === 'text' && creative.textData ? creative.textData.callToAction : null,

        imageAppeal: creative.type === 'image' && creative.imageData ? creative.imageData.appealFeature : null,
        imageEmotion: creative.type === 'image' && creative.imageData ? creative.imageData.emotion : null,

        videoEmotion: creative.type === 'video' && creative.videoData ? creative.videoData.emotion : null,
        videoDuration: creative.type === 'video' && creative.videoData ? creative.videoData.duration : null,

        lpHeadline: creative.type === 'lp' && creative.lpData ? creative.lpData.headline : null,

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
        productDetails: product.details
      };

      return json({
        success: true,
        message: `Successfully created ${createdClips.length} clips from AI storyboard with context-aware content`,
        storyId: storyRecord.id,
        sceneId: newScene.id,
        frameCount: storyboardData.frames.length,
        clipCount: createdClips.length,
        clips: createdClips,
        contextUsed: true,
        contextSummary
      });

    } catch (parseError: any) {
      console.error('Error parsing AI response:', parseError);
      throw error(500, `Failed to parse AI response: ${parseError.message}`);
    }

  } catch (err: any) {
    console.error('Error in auto-create story process:', err);

    if (err instanceof SyntaxError) {
      throw error(400, 'Invalid JSON in request body');
    }

    const errAny = err as any;
    if (errAny.status) {
      throw error(errAny.status, errAny.body?.message || 'API Error');
    }

    throw error(500, `Internal Server Error: ${errAny.message || 'Unknown error'}`);
  }
};
