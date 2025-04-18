import { generateContent, type AIProvider } from '$lib/server/aiProviderService';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler, RequestEvent } from './$types';
import { db } from '$lib/server/db';
import { products, personas, creatives, scenes, clips, stories } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// No need to check API keys here as it's handled in the aiProviderService

// Schema for the storyboard with scenes and clips
// Using uppercase types for Gemini compatibility, our converter will handle OpenAI's lowercase requirement
const storyboardSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING', description: 'Title for the storyboard' },
    description: { type: 'STRING', description: 'Brief description of the storyboard' },
    scenes: {
      type: 'ARRAY',
      description: 'Array of scenes in the storyboard, each with a specific purpose in the narrative',
      items: {
        type: 'OBJECT',
        properties: {
          description: { type: 'STRING', description: 'A descriptive title for this scene that captures its purpose in the overall narrative' },
          clips: {
            type: 'ARRAY',
            description: 'Array of clips that form a coherent scene with a specific purpose in the story',
            items: {
              type: 'OBJECT',
              properties: {
                narration: { type: 'STRING', description: 'Professional voice-over script for this clip in Brazilian Portuguese' },
                visualDescription: { type: 'STRING', description: 'Detailed visual description of what appears in this clip' },
                duration: { type: 'NUMBER', description: 'Suggested duration for this clip in seconds (typically between 2-5 seconds)' }
              },
              required: ['narration', 'visualDescription', 'duration']
            }
          }
        },
        required: ['description', 'clips']
      }
    }
  },
  required: ['title', 'description', 'scenes']
};

export const POST: RequestHandler = async ({ request, params }: RequestEvent) => {
  // API key availability is checked in the aiProviderService

  const productId = parseInt(params.productId || '', 10);
  const personaId = parseInt(params.personaId || '', 10);
  const creativeId = parseInt(params.creativeId || '', 10);

  if (isNaN(productId) || isNaN(personaId) || isNaN(creativeId)) {
    throw error(400, 'Invalid Product, Persona, or Creative ID.');
  }

  let storyPrompt: string;
  let storyId: number | undefined;
  let aiProvider: AIProvider = 'gemini'; // Default to Gemini

  try {
    const body = await request.json();
    storyPrompt = body.storyPrompt;
    storyId = body.storyId;

    // Get the AI provider from the request body, default to 'gemini' if not provided
    if (body.aiProvider && (body.aiProvider === 'gemini' || body.aiProvider === 'openai')) {
      aiProvider = body.aiProvider;
    }

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

    // We'll use the aiProviderService instead of initializing Gemini directly

    let targetPrompt = `\n## Channel info ##\n`;
    // Creative context
    targetPrompt += `Name${creative.name}\n`;

    if (creative.description) {
      targetPrompt += `Description: ${creative.description}\n`;
    }

    // Type-specific creative details
    if (creative.type === 'text' && creative.textData) {
      targetPrompt += `\nText Creative Details:\n`;
      if (creative.textData.headline) targetPrompt += `Headline: ${creative.textData.headline}\n`;
      if (creative.textData.body) targetPrompt += `Body: ${creative.textData.body}\n`;
      if (creative.textData.callToAction) targetPrompt += `Call to Action: ${creative.textData.callToAction}\n`;
      if (creative.textData.appealFeature) targetPrompt += `Appeal Feature: ${creative.textData.appealFeature}\n`;
      if (creative.textData.emotion) targetPrompt += `Emotion: ${creative.textData.emotion}\n`;
      if (creative.textData.platformNotes) targetPrompt += `Platform Notes: ${creative.textData.platformNotes}\n`;
    } else if (creative.type === 'image' && creative.imageData) {
      targetPrompt += `\nImage Creative Details:\n`;
      if (creative.imageData.appealFeature) targetPrompt += `Appeal Feature: ${creative.imageData.appealFeature}\n`;
      if (creative.imageData.emotion) targetPrompt += `Emotion: ${creative.imageData.emotion}\n`;
      if (creative.imageData.platformNotes) targetPrompt += `Platform Notes: ${creative.imageData.platformNotes}\n`;
    } else if (creative.type === 'video' && creative.videoData) {
      targetPrompt += `\nVideo Creative Details:\n`;
      if (creative.videoData.duration) targetPrompt += `Duration: ${creative.videoData.duration}\n`;
      if (creative.videoData.appealFeature) targetPrompt += `Appeal Feature: ${creative.videoData.appealFeature}\n`;
      if (creative.videoData.emotion) targetPrompt += `Emotion: ${creative.videoData.emotion}\n`;
      if (creative.videoData.platform) targetPrompt += `Platform: ${creative.videoData.platform}\n`;
    } else if (creative.type === 'lp' && creative.lpData) {
      targetPrompt += `\nLanding Page Creative Details:\n`;
      if (creative.lpData.headline) targetPrompt += `Headline: ${creative.lpData.headline}\n`;
      if (creative.lpData.appealFeature) targetPrompt += `Appeal Feature: ${creative.lpData.appealFeature}\n`;
      if (creative.lpData.emotion) targetPrompt += `Emotion: ${creative.lpData.emotion}\n`;
      if (creative.lpData.platformNotes) targetPrompt += `Platform Notes: ${creative.lpData.platformNotes}\n`;
    }
    // Create a context-aware prompt for generating scenes and clips
    let prompt = `You are a professional content creator for social media. please create a attractive content based on the use input.
${targetPrompt}

Your output MUST be valid JSON conforming to the provided schema. The storyboard should tell a cohesive story across all scenes, with a clear beginning, middle, and end. Each scene should have a specific purpose in the narrative flow.

Here’s the high-impact narrative flow adapted for these platforms:

**Core Narrative Flow (Applies to All):**

1.  **Hook & Problem:** Grab attention immediately + Show the relatable struggle.
2.  **Introduce Solution:** Present the product/service as the answer.
3.  **Showcase Value:** Demonstrate *how* it works and its key benefit/differentiator.
4.  **Transformation/Payoff:** Show the positive outcome/feeling.
5.  **Call to Action (CTA):** Tell the viewer what to do next.

**Adaptation for Instagram (Reels/Stories) & YouTube Shorts (Short-Form Vertical Video):**

*   **Key Principles:** Speed, Visual Clarity, Instant Hook, Mobile-First, Sound-Optional Design (use text overlays).
*   **Goal:** Quick engagement, stop the scroll, immediate understanding, drive profile visits/link clicks.

**Short-Form Narrative Breakdown (Aim for < 60 seconds, often 15-30s):**

1.  **The INSTANT Hook & Identify/Problem ID (Seconds 0-3):**
    *   **Execution:** Start *immediately* with the most visually arresting or relatable aspect of the pain point. Use dynamic visuals, maybe a text overlay stating the core problem concisely (e.g., "Tired of X?", "Wish you could Y?"). No slow intros.
    *   Capture attention with a visually striking moment that showcases your persona's pain point
    *   Use dynamic motion or an emotionally resonant facial expression to stop the scroll
    *   Create immediate viewer self-identification with a relatable struggle or desire
    *   **Example:** Quick cuts showing frustration (messy desk, failed attempt, stressed expression).

2.  **Swift Solution Intro/SHOWCASE & Core Action (Seconds 3-10):**
    *   **Execution:** Seamlessly introduce the product visually. Show it *directly interacting* with the problem shown in the hook. Focus on the *single most important action* it performs. Keep cuts fast.
    Introduce your product within the persona's environment through smooth visual transition
Demonstrate the key functionality with clear, focused shots that highlight ease of use
Show immediate transformation through before/after visual contrast
    *   **Example:** Product appears, instantly organizes the desk; app interface shown achieving the desired task in one tap.

3.  **The "Aha!" Moment/EMOTIONAL PAYOFF/ Key Benefit Flash (Seconds 10-20):**
    *   **Execution:** Show the *immediate positive result* or the *key differentiator* in action. Use clear visuals, maybe a quick satisfying shot, a positive reaction from the persona, or a simple "Before -> After" flash cut. Text overlay reinforcing the main benefit (e.g., "Instant Clarity!", "Effortless Results!").
Deliver a satisfying emotional resolution that feels genuine
End with your product and persona in harmony, showing the new reality
Include your call-to-action and brand elements optimized for mobile viewing
    *   **Example:** Clean desk + smile; successful outcome shown clearly; unique feature highlighted with a graphic element.

4.  **Quick Transformation Glimpse & CTA (Seconds 20-End):**
    *   **Execution:** Brief shot showing the sustained positive state (the "after"). Immediately follow with a clear, concise CTA – visually dominant (text on screen, pointing) and verbally (if using voiceover). Use platform features (e.g., Polls/Stickers in Stories, clear "Link in Bio" text).
    *   **Example:** Persona relaxed/productive + Text: "Get Yours Now!" + "Link in Bio" graphic.

**Adaptation for YouTube Standard Videos (Longer-Form Horizontal/Vertical Video):**

*   **Key Principles:** Strong Hook (but more time to build), Deeper Value Proposition, Storytelling Depth, Clear Audio, Encourage Engagement (Likes, Subs), Drive Off-Platform Actions.
*   **Goal:** Build connection, educate/entertain, establish credibility, drive subscriptions or website visits/conversions.

**Longer-Form Narrative Breakdown (Can vary greatly, e.g., 2-7 minutes):**

1.  **The AUTHENTIC CONNECTION/Engaging Hook & Contextualized Problem (First 30-60 seconds):**
    *   **Execution:** Start with a strong hook (question, surprising visual, relatable scenario) related to the pain point. Take a *bit* more time to establish the persona's environment and the *stakes* – why does this problem genuinely matter? Build empathy.
    Open with a relatable scenario that immediately establishes emotional investment
Use environmental details and character moments to create depth and authenticity
Plant a specific question or tension that creates genuine viewer curiosity
    *   **Example:** A mini-scene showing the persona struggling, perhaps with a brief voiceover explaining the frustration's impact.

2.  **Introducing the Solution/PROBLEM EXPLORATION & Detailed Walkthrough (Can span 1-3 minutes):**
    *   **Execution:** Introduce the product/service as the natural answer. Dedicate time to clearly demonstrate *how* it works, focusing on key features that solve the established problem. Use screen recordings, B-roll, clear narration. Address *why* it's effective.
    Deepen understanding of the persona's challenge through meaningful context
Build emotional investment by showing real consequences of the problem
Create anticipation through subtle visual cues that hint at upcoming relief
    *   **Example:** Unboxing/setup (if relevant), step-by-step demo of core features, explaining the thinking behind the design.

3.  **Showcasing Unique Value/SOLUTION JOURNEY & Building Credibility (Can span 1-2 minutes):**
    *   **Execution:** Dive deeper into what makes the product unique. Show specific use cases, highlight advanced features, compare it implicitly/explicitly to alternatives (showing its superiority). Include testimonials, results, or data if applicable. Build trust.
Introduce your product as a natural discovery within the persona's world
Show detailed interaction sequence highlighting key features and benefits
Demonstrate progressive mastery and satisfaction as persona explores product
Include micro-moments of delight that showcase product uniqueness
    *   **Example:** Showing the product tackling a more complex version of the problem, featuring a user quote, demonstrating unexpected benefits.

4.  **The Full Transformation/TRANSFORMATION IMPACT & Emotional Payoff (Can span 30-60 seconds):**
    *   **Execution:** Show the lasting positive impact on the persona's life/work. Contrast clearly with the initial problem state. Emphasize both the practical *and* emotional benefits (less stress, more time, creativity, success). Use compelling visuals and summarizing narration.
    Reveal meaningful changes in the persona's life or emotional state
Show broader applications or secondary benefits of your solution
Create visual contrast between before/after states for maximum impact
    *   **Example:** Persona enjoying the benefits over time, achieving a larger goal previously blocked by the problem, expressing satisfaction.

5.  **Clear Call to Action/COMPELLING CONCLUSION & Outro (Final 30 seconds):**
    *   **Execution:** Summarize the core value proposition one last time. Deliver a clear, direct CTA (e.g., "Click the link in the description," "Subscribe for more tips," "Visit our website to learn more"). Use YouTube End Screens and Cards effectively. Encourage likes/comments/shares. End with clear branding.
    Deliver a memorable final image that encapsulates your core value proposition
Structure your call-to-action as the natural next step in the viewer's own journey
Reinforce brand identity with consistent visual elements and messaging
    *   **Example:** Direct address to camera, clear graphics showing the URL, animated end screen with subscribe button and related video.

**Key Takeaway:** Adapt the *pacing, depth, and visual execution* based on the platform's constraints and audience expectations, while maintaining the core logical and emotional flow of Problem -> Solution -> Benefit -> Action.`;

    // Add context information
    prompt += '\n\nDETAILED CONTEXT INFORMATION (Use it to make the content more interesting):\n';

    // Product context (most important)
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

    // Persona context
    prompt += `\n## TARGET AUDIENCE ##\n`;
    prompt += `Persona: ${persona.personaTitle ? ` (${persona.personaTitle})` : ''}\n`;

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
        storyboardSchema
      );
      text = result.text;
      console.log(`Received response from ${aiProvider}`);
    } catch (aiError: any) {
      console.error(`Error generating content with ${aiProvider}:`, aiError);
      throw error(500, `Failed to generate content with ${aiProvider}: ${aiError.message || 'Unknown error'}`);
    }

    try {
      if (!text) {
        throw new Error(`No text received from ${aiProvider}`);
      }
      const storyboardData = JSON.parse(text);
      console.log('Generated storyboard data:', storyboardData);

      // Check if we have scenes in the response (new schema) or frames (old schema)
      const createdScenes = [];
      const createdClips = [];

      if (storyboardData.scenes && Array.isArray(storyboardData.scenes) && storyboardData.scenes.length > 0) {
        console.log('Processing scene-based storyboard structure');

        // Create scenes and clips based on the new structure
        for (let sceneIndex = 0; sceneIndex < storyboardData.scenes.length; sceneIndex++) {
          const sceneData = storyboardData.scenes[sceneIndex];

          // Create a new scene
          const [newScene] = await db.insert(scenes).values({
            storyId: storyRecord.id,
            description: sceneData.description || `Scene ${sceneIndex + 1}`,
            orderIndex: sceneIndex, // Order based on index
            createdAt: new Date(),
            updatedAt: new Date()
          }).returning();

          createdScenes.push(newScene);
          console.log(`Created scene ${sceneIndex + 1}/${storyboardData.scenes.length} with ID: ${newScene.id}`);

          // Create clips for this scene
          if (sceneData.clips && Array.isArray(sceneData.clips)) {
            for (let clipIndex = 0; clipIndex < sceneData.clips.length; clipIndex++) {
              const clipData = sceneData.clips[clipIndex];
              try {
                // Create a clip for this scene
                const [newClip] = await db.insert(clips).values({
                  sceneId: newScene.id,
                  orderIndex: clipIndex,
                  narration: clipData.narration || '',
                  description: clipData.visualDescription || '',
                  canvas: JSON.stringify({ objects: [] }), // Empty canvas initially
                  imageUrl: null, // Will be generated by the clip-preview endpoint
                  duration: clipData.duration ? Math.round(clipData.duration * 1000) : 5000, // Convert to milliseconds
                  createdAt: new Date(),
                  updatedAt: new Date()
                }).returning();

                createdClips.push(newClip);
                console.log(`Created clip ${clipIndex + 1}/${sceneData.clips.length} for scene ${sceneIndex + 1} with ID: ${newClip.id}`);
              } catch (clipError) {
                console.error(`Error creating clip for scene ${newScene.id}:`, clipError);
              }
            }
          }
        }
      }
      // Fallback to old frame-based structure for backward compatibility
      else if (storyboardData.frames && Array.isArray(storyboardData.frames) && storyboardData.frames.length > 0) {
        console.log('Processing legacy frame-based storyboard structure');

        // Create a single scene for all frames
        const [newScene] = await db.insert(scenes).values({
          storyId: storyRecord.id,
          description: storyboardData.description || 'Generated from AI storyboard',
          orderIndex: 0, // First scene
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();

        createdScenes.push(newScene);
        console.log(`Created single scene with ID: ${newScene.id} for ${storyboardData.frames.length} frames`);

        // Create clips for each frame
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
              duration: 5000, // Default duration in milliseconds
              createdAt: new Date(),
              updatedAt: new Date()
            }).returning();

            createdClips.push(newClip);
            console.log(`Created clip ${i + 1}/${storyboardData.frames.length} with ID: ${newClip.id}`);
          } catch (clipError) {
            console.error(`Error creating clip for frame ${frame.id}:`, clipError);
          }
        }
      } else {
        throw new Error('Invalid storyboard data: missing scenes or frames');
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
        message: `Successfully created ${createdScenes.length} scenes with ${createdClips.length} clips from AI storyboard with context-aware content`,
        storyId: storyRecord.id,
        sceneCount: createdScenes.length,
        clipCount: createdClips.length,
        scenes: createdScenes,
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
