import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { scenes, clips, stories, creatives } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// This endpoint handles the entire auto-create process in one go
export const POST: RequestHandler = async ({ request, fetch }) => {
  try {
    const requestData = await request.json();
    const { storyPrompt, storyId, creativeId } = requestData;

    if (!storyPrompt) {
      throw error(400, 'Missing required parameter: storyPrompt');
    }

    // We need a creativeId to create a story
    if (!storyId && !creativeId) {
      throw error(400, 'Missing required parameter: creativeId (needed to create a new story)');
    }

    console.log(`Auto-create story request received with prompt: "${storyPrompt.substring(0, 50)}..."`);
    console.log(`Creative ID received: ${creativeId || 'None'}`);

    if (creativeId) {
      console.log('API: Loading creative with ID:', creativeId);
    } else {
      console.warn('No creativeId provided - context-aware generation will be limited');
    }

    // Get or create a story
    let storyRecord;
    let sceneId;

    if (storyId) {
      // If storyId is provided, verify it exists
      storyRecord = await db.query.stories.findFirst({
        where: eq(stories.id, storyId),
        columns: { id: true, title: true }
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

    // Fetch creative, persona, and product information for context
    let contextData = {};
    if (creativeId) {
      try {
        // Fetch creative with related persona and product with all fields
        const creative = await db.query.creatives.findFirst({
          where: eq(creatives.id, creativeId),
          with: {
            persona: {
              with: {
                product: true,
                // Include all persona fields
              }
            },
            textData: true,
            imageData: true,
            videoData: true,
            lpData: true
          }
        });

        console.log('API: Found creative:', creative?.name + ' - ' + creative?.description + ' (Type: ' + creative?.type + ')');

        if (creative) {
          // Use type assertion to handle the complex structure
          const creativeAny = creative as any;

          // Create a deep copy of the data
          contextData = {
            creative: {
              id: creative.id,
              name: creative.name,
              type: creative.type,
              description: creative.description,
              // Include type-specific data
              textData: creativeAny.textData,
              imageData: creativeAny.imageData,
              videoData: creativeAny.videoData,
              lpData: creativeAny.lpData
            },
            persona: creativeAny.persona ? {
              ...creativeAny.persona,
              // Add any additional persona properties here
              valuesText: creativeAny.persona.personaValues ?
                creativeAny.persona.personaValues.map((v: any) => v.value).join(', ') : ''
            } : null,
            product: creativeAny.persona?.product ? {
              ...creativeAny.persona.product
            } : null
          };
          console.log(`Fetched context data for creative ID: ${creativeId}`);
        }
      } catch (contextError) {
        console.error('Error fetching context data:', contextError);
        // Continue even if context fetching fails
      }
    }

    // Generate a context-aware scene description
    let sceneDescription = `Scene for ${storyRecord.title || 'story'}`;
    if (Object.keys(contextData).length > 0) {
      // Use type assertion to handle the complex structure
      const typedContext = contextData as any;
      const creative = typedContext.creative;
      const persona = typedContext.persona;
      const product = typedContext.product;

      if (creative?.type) {
        sceneDescription = `${creative.type.charAt(0).toUpperCase() + creative.type.slice(1)} ad scene`;
      }

      if (product?.name) {
        sceneDescription += ` for ${product.name}`;
      }

      if (persona?.personaTitle) {
        sceneDescription += ` targeting ${persona.personaTitle}`;
      }
    }

    // Create a new scene for this story with context-aware description
    const [newScene] = await db.insert(scenes).values({
      storyId: storyRecord.id,
      description: sceneDescription,
      orderIndex: 0, // First scene
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    sceneId = newScene.id;
    console.log(`Created new scene with ID: ${sceneId}`);


    // Context data already fetched above

    // Step 2: Create a storyboard in the AI storyboard creator
    let storyboardResponse;
    try {
      storyboardResponse = await fetch('/api/storyboard/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: storyPrompt.substring(0, 30) + '...',
          contextData: Object.keys(contextData).length > 0 ? contextData : undefined
        })
      });

      console.log('Sending context data to storyboard creator:', JSON.stringify(contextData, null, 2));

      if (!storyboardResponse.ok) {
        const errorData = await storyboardResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${storyboardResponse.statusText}`);
      }
    } catch (fetchError: any) {
      console.error('Error connecting to AI storyboard creator:', fetchError);
      throw new Error(`Failed to connect to AI storyboard creator. Make sure the service is running at http://localhost:5173. Error: ${fetchError.message || 'Unknown error'}`);
    }

    const storyboardResult = await storyboardResponse.json();
    const storyboardId = storyboardResult.storyboardId;
    console.log(`Created storyboard with ID: ${storyboardId}`);

    // Step 3: Generate frames for the storyboard in the AI storyboard creator
    let framesResponse;
    try {
      // Create a simplified version of the context data for better serialization
      const simplifiedContextData: any = {};

      if (Object.keys(contextData).length > 0) {
        // Use type assertion to handle the complex structure
        const typedContextData = contextData as any;
        // Create a simplified version of the creative data
        if (typedContextData.creative) {
          simplifiedContextData.creative = {
            id: typedContextData.creative.id,
            name: typedContextData.creative.name,
            type: typedContextData.creative.type,
            description: typedContextData.creative.description
          };

          // Add type-specific data
          if (typedContextData.creative.type === 'text' && typedContextData.creative.textData) {
            simplifiedContextData.creative.textData = { ...typedContextData.creative.textData };
          } else if (typedContextData.creative.type === 'image' && typedContextData.creative.imageData) {
            simplifiedContextData.creative.imageData = { ...typedContextData.creative.imageData };
          } else if (typedContextData.creative.type === 'video' && typedContextData.creative.videoData) {
            simplifiedContextData.creative.videoData = { ...typedContextData.creative.videoData };
          } else if (typedContextData.creative.type === 'lp' && typedContextData.creative.lpData) {
            simplifiedContextData.creative.lpData = { ...typedContextData.creative.lpData };
          }
        }

        // Create a simplified version of the persona data
        if (typedContextData.persona) {
          simplifiedContextData.persona = {
            name: typedContextData.persona.name,
            personaTitle: typedContextData.persona.personaTitle,
            needsPainPoints: typedContextData.persona.needsPainPoints,
            goalsExpectations: typedContextData.persona.goalsExpectations,
            valuesText: typedContextData.persona.valuesText
          };
        }

        // Create a simplified version of the product data
        if (typedContextData.product) {
          simplifiedContextData.product = {
            name: typedContextData.product.name,
            featuresStrengths: typedContextData.product.featuresStrengths,
            overview: typedContextData.product.overview,
            competitiveAdvantage: typedContextData.product.competitiveAdvantage
          };
        }
      }

      console.log('Simplified context data for add-frame:', JSON.stringify(simplifiedContextData, null, 2));

      framesResponse = await fetch(`/api/storyboard/${storyboardId}/add-frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyPrompt,
          contextData: Object.keys(simplifiedContextData).length > 0 ? simplifiedContextData : undefined
        })
      });



      if (!framesResponse.ok) {
        const errorData = await framesResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${framesResponse.statusText}`);
      }
    } catch (fetchError: any) {
      console.error('Error generating frames:', fetchError);
      throw new Error(`Failed to generate frames. Error: ${fetchError.message || 'Unknown error'}`);
    }

    await framesResponse.json(); // We don't need to use the result
    console.log(`Generated frames for storyboard ${storyboardId}`);

    // Step 4: Fetch the generated frames from the AI storyboard creator
    let storyboardDataResponse;
    try {
      storyboardDataResponse = await fetch(`/api/storyboard/${storyboardId}`);
      if (!storyboardDataResponse.ok) {
        const errorData = await storyboardDataResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${storyboardDataResponse.statusText}`);
      }
    } catch (fetchError: any) {
      console.error('Error fetching storyboard data:', fetchError);
      throw new Error(`Failed to fetch storyboard data. Error: ${fetchError.message || 'Unknown error'}`);
    }

    const storyboardData = await storyboardDataResponse.json();
    const frames = storyboardData.frames || [];
    console.log(`Fetched ${frames.length} frames from storyboard ${storyboardId}`);

    // Step 5: Generate assets for each frame (optional, can be done in background)
    // This step is resource-intensive and can be skipped for now
    // We'll just use the prompts directly

    // Step 6: Create scenes and clips in the marketing-manager based on the storyboard data
    const createdScenes = [];
    const createdClips = [];

    // Group frames by scene
    const framesByScene: Record<string | number, any[]> = {};
    for (const frame of frames) {
      const sceneId = frame.sceneId || 1; // Default to scene 1 if not specified
      if (!framesByScene[sceneId]) {
        framesByScene[sceneId] = [];
      }
      framesByScene[sceneId].push(frame);
    }

    // Generate context-aware clip descriptions
    const generateContextAwareDescription = (frame: any, contextData: any) => {
      let description = frame.mainImagePrompt || '';

      // If the description is too short or generic, enhance it
      if (description.length < 50 || description.includes('generic') || description.includes('placeholder')) {
        description += ' This visual should be professional quality with excellent composition, lighting, and detail.';
      }

      // If we have context data, enhance the description
      if (Object.keys(contextData).length > 0) {
        const creative = contextData.creative;
        const persona = contextData.persona;
        const product = contextData.product;

        // Add product name if available
        if (product?.name && !description.includes(product.name)) {
          description = description.replace(/product/gi, product.name);

          // If still no mention of the product, add it explicitly
          if (!description.includes(product.name)) {
            description += ` The scene should prominently feature ${product.name}.`;
          }
        }

        // Add creative type-specific enhancements
        if (creative?.type === 'text' && creative.textData?.headline) {
          // For text ads, incorporate headline into description
          if (!description.includes(creative.textData.headline)) {
            description += ` Highlighting the key message: "${creative.textData.headline}".`;
          }
        } else if (creative?.type === 'video' && creative.videoData?.emotion) {
          // For video ads, incorporate emotion
          if (!description.includes(creative.videoData.emotion)) {
            description += ` The visual should convey a ${creative.videoData.emotion} tone through composition, lighting, and subject expression.`;
          }
        }

        // Add persona-specific visual elements if available
        if (persona && !description.toLowerCase().includes('target audience') && !description.toLowerCase().includes(persona.name.toLowerCase())) {
          description += ` The visual should appeal to ${persona.personaTitle || persona.name} through appropriate styling and representation.`;
        }
      }

      // Ensure the description is detailed enough
      if (description.split(' ').length < 20) {
        description += ' Include professional lighting, clear focal points, and a balanced composition with appropriate depth of field.';
      }

      return description;
    };

    // Generate context-aware narration
    const generateContextAwareNarration = (frame: any, contextData: any) => {
      let narration = frame.narration || '';

      // If the narration is too short or generic, enhance it
      if (narration.length < 30 || narration.includes('generic') || narration.includes('placeholder')) {
        narration += ' Delivered with professional, clear voiceover that conveys authority and trustworthiness.';
      }

      // If we have context data, enhance the narration
      if (Object.keys(contextData).length > 0) {
        const creative = contextData.creative;
        const persona = contextData.persona;
        const product = contextData.product;

        // Add product name if available
        if (product?.name && !narration.includes(product.name)) {
          narration = narration.replace(/product/gi, product.name);

          // If still no mention of the product, add it explicitly
          if (!narration.includes(product.name)) {
            narration += ` ${product.name} is the solution you've been looking for.`;
          }
        }

        // Add creative type-specific enhancements
        if (creative?.type === 'text' && creative.textData?.callToAction && !narration.toLowerCase().includes('call to action')) {
          // For text ads, incorporate call to action
          narration += ` ${creative.textData.callToAction}`;
        }

        // Add persona-specific language if available
        if (persona?.personaTitle && !narration.includes('for ' + persona.personaTitle)) {
          // Only add if it makes sense in context
          if (narration.toLowerCase().includes('audience') || narration.toLowerCase().includes('customer')) {
            narration = narration.replace(/audience|customers/gi, persona.personaTitle);
          } else if (!narration.toLowerCase().includes(persona.name.toLowerCase())) {
            // If no mention of the persona at all, add it
            narration += ` Perfect for ${persona.personaTitle || persona.name}.`;
          }
        }
      }

      // Ensure the narration is impactful
      if (narration.split(' ').length < 15 && !narration.includes('!')) {
        narration += ' Experience the difference today!';
      }

      return narration;
    };

    // Process each scene and its frames
    let sceneOrderIndex = 0;

    // Get the current max orderIndex for scenes in this story
    const existingScenes = await db.query.scenes.findMany({
      where: eq(scenes.storyId, storyRecord.id),
      columns: { orderIndex: true }
    });

    if (existingScenes.length > 0) {
      sceneOrderIndex = Math.max(...existingScenes.map(scene => scene.orderIndex)) + 1;
    }

    // Create scenes and clips
    for (const [sceneIdStr, sceneFrames] of Object.entries(framesByScene)) {
      if (!Array.isArray(sceneFrames) || sceneFrames.length === 0) continue;

      // Get scene description from the first frame in this scene
      const sceneDescription = sceneFrames[0]?.sceneDescription || `Scene ${sceneIdStr}`;

      // Create a new scene
      const [newScene] = await db.insert(scenes).values({
        storyId: storyRecord.id,
        description: sceneDescription,
        orderIndex: sceneOrderIndex++,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      createdScenes.push(newScene);
      console.log(`Created scene ${newScene.id} with description: ${sceneDescription}`);

      // Create clips for this scene
      let clipOrderIndex = 0;
      for (const frame of sceneFrames) {
        try {
          // Create a new clip with context-aware content
          const contextAwareDescription = generateContextAwareDescription(frame, contextData);
          const contextAwareNarration = generateContextAwareNarration(frame, contextData);

          const [newClip] = await db.insert(clips).values({
            sceneId: newScene.id,
            canvas: '{}', // Empty canvas initially
            narration: contextAwareNarration,
            description: contextAwareDescription,
            duration: frame.duration || 3000, // Use frame duration or default to 3 seconds
            orderIndex: clipOrderIndex++,
            createdAt: new Date(),
            updatedAt: new Date(),
            imageUrl: frame.imageUrl || null // Add the image URL if available
          }).returning();

          createdClips.push(newClip);
          console.log(`Created clip ${newClip.id} for scene ${newScene.id}`);
        } catch (clipError) {
          console.error(`Error creating clip for frame ${frame.id}:`, clipError);
        }
      }
    }

    // Determine if context was used
    const contextUsed = Object.keys(contextData).length > 0;

    // Create a detailed context summary
    let contextSummary = null;
    if (contextUsed) {
      // Use type assertion to help TypeScript understand the structure
      const typedContextData = contextData as {
        creative?: {
          type?: string;
          name?: string;
          description?: string;
          textData?: { headline?: string; body?: string; callToAction?: string };
          imageData?: { appealFeature?: string; emotion?: string };
          videoData?: { emotion?: string; duration?: string };
          lpData?: { headline?: string };
        };
        persona?: {
          name?: string;
          personaTitle?: string;
          needsPainPoints?: string;
          goalsExpectations?: string;
          valuesText?: string;
        };
        product?: {
          name?: string;
          featuresStrengths?: string;
          overview?: string;
          competitiveAdvantage?: string;
        };
      };

      contextSummary = {
        // Creative information
        creativeType: typedContextData.creative?.type || null,
        creativeName: typedContextData.creative?.name || null,
        creativeDescription: typedContextData.creative?.description || null,

        // Type-specific creative information
        textHeadline: typedContextData.creative?.textData?.headline || null,
        textBody: typedContextData.creative?.textData?.body || null,
        textCTA: typedContextData.creative?.textData?.callToAction || null,

        imageAppeal: typedContextData.creative?.imageData?.appealFeature || null,
        imageEmotion: typedContextData.creative?.imageData?.emotion || null,

        videoEmotion: typedContextData.creative?.videoData?.emotion || null,
        videoDuration: typedContextData.creative?.videoData?.duration || null,

        lpHeadline: typedContextData.creative?.lpData?.headline || null,

        // Persona information
        personaName: typedContextData.persona?.name || null,
        personaTitle: typedContextData.persona?.personaTitle || null,
        personaPainPoints: typedContextData.persona?.needsPainPoints || null,
        personaGoals: typedContextData.persona?.goalsExpectations || null,
        personaValues: typedContextData.persona?.valuesText || null,

        // Product information
        productName: typedContextData.product?.name || null,
        productFeatures: typedContextData.product?.featuresStrengths || null,
        productOverview: typedContextData.product?.overview || null,
        productAdvantage: typedContextData.product?.competitiveAdvantage || null
      };
    }

    return json({
      success: true,
      message: `Successfully created ${createdScenes.length} scenes with ${createdClips.length} clips from AI storyboard${contextUsed ? ' with context-aware content' : ''}`,
      storyboardId,
      frameCount: frames.length,
      sceneCount: createdScenes.length,
      clipCount: createdClips.length,
      scenes: createdScenes,
      clips: createdClips,
      contextUsed,
      contextSummary
    });

  } catch (err) {
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
