import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { scenes, clips, stories, creatives, personas, products } from '$lib/server/db/schema';
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
        // Fetch creative with related persona
        const creative = await db.query.creatives.findFirst({
          where: eq(creatives.id, creativeId),
          with: {
            persona: {
              with: {
                product: true
              }
            },
            textData: true,
            imageData: true,
            videoData: true,
            lpData: true
          }
        });

        if (creative) {
          contextData = {
            creative: {
              id: creative.id,
              name: creative.name,
              type: creative.type,
              description: creative.description,
              // Include type-specific data
              textData: creative.textData,
              imageData: creative.imageData,
              videoData: creative.videoData,
              lpData: creative.lpData
            },
            persona: creative.persona,
            product: creative.persona?.product
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
      const creative = contextData.creative;
      const persona = contextData.persona;
      const product = contextData.product;

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
      storyboardResponse = await fetch('http://localhost:5173/api/storyboard/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: storyPrompt.substring(0, 30) + '...',
          contextData: Object.keys(contextData).length > 0 ? contextData : undefined
        })
      });

      if (!storyboardResponse.ok) {
        const errorData = await storyboardResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${storyboardResponse.statusText}`);
      }
    } catch (fetchError) {
      console.error('Error connecting to AI storyboard creator:', fetchError);
      throw new Error(`Failed to connect to AI storyboard creator. Make sure the service is running at http://localhost:5173. Error: ${fetchError.message}`);
    }

    const storyboardResult = await storyboardResponse.json();
    const storyboardId = storyboardResult.storyboardId;
    console.log(`Created storyboard with ID: ${storyboardId}`);

    // Step 3: Generate frames for the storyboard in the AI storyboard creator
    let framesResponse;
    try {
      framesResponse = await fetch(`http://localhost:5173/api/storyboard/${storyboardId}/add-frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyPrompt,
          contextData: Object.keys(contextData).length > 0 ? contextData : undefined
        })
      });

      if (!framesResponse.ok) {
        const errorData = await framesResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${framesResponse.statusText}`);
      }
    } catch (fetchError) {
      console.error('Error generating frames:', fetchError);
      throw new Error(`Failed to generate frames. Error: ${fetchError.message}`);
    }

    const framesResult = await framesResponse.json();
    console.log(`Generated frames for storyboard ${storyboardId}`);

    // Step 4: Fetch the generated frames from the AI storyboard creator
    let storyboardDataResponse;
    try {
      storyboardDataResponse = await fetch(`http://localhost:5173/api/storyboard/${storyboardId}`);
      if (!storyboardDataResponse.ok) {
        const errorData = await storyboardDataResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${storyboardDataResponse.statusText}`);
      }
    } catch (fetchError) {
      console.error('Error fetching storyboard data:', fetchError);
      throw new Error(`Failed to fetch storyboard data. Error: ${fetchError.message}`);
    }

    const storyboardData = await storyboardDataResponse.json();
    const frames = storyboardData.frames || [];
    console.log(`Fetched ${frames.length} frames from storyboard ${storyboardId}`);

    // Step 5: Generate assets for each frame (optional, can be done in background)
    // This step is resource-intensive and can be skipped for now
    // We'll just use the prompts directly

    // Step 6: Create clips in the marketing-manager for each frame
    const createdClips = [];
    let orderIndex = 0;

    // Get the current max orderIndex for the scene
    const existingClips = await db.query.clips.findMany({
      where: eq(clips.sceneId, sceneId),
      columns: { orderIndex: true }
    });

    if (existingClips.length > 0) {
      orderIndex = Math.max(...existingClips.map(clip => clip.orderIndex)) + 1;
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

    for (const frame of frames) {
      try {
        // Create a new clip for the frame with context-aware content
        const contextAwareDescription = generateContextAwareDescription(frame, contextData);
        const contextAwareNarration = generateContextAwareNarration(frame, contextData);

        const [newClip] = await db.insert(clips).values({
          sceneId: sceneId,
          canvas: '{}', // Empty canvas initially
          narration: contextAwareNarration,
          description: contextAwareDescription,
          duration: 3000, // Default 3 seconds
          orderIndex: orderIndex++,
          createdAt: new Date(),
          updatedAt: new Date(),
          imageUrl: frame.mainImageUrl || null // Add the image URL if available
        }).returning();

        createdClips.push(newClip);
        console.log(`Created clip ${newClip.id} for frame ${frame.id}`);
      } catch (clipError) {
        console.error(`Error creating clip for frame ${frame.id}:`, clipError);
      }
    }

    // Determine if context was used
    const contextUsed = Object.keys(contextData).length > 0;

    return json({
      success: true,
      message: `Successfully created ${createdClips.length} clips from AI storyboard${contextUsed ? ' with context-aware content' : ''}`,
      storyboardId,
      frameCount: frames.length,
      clipCount: createdClips.length,
      clips: createdClips,
      contextUsed,
      contextSummary: contextUsed ? {
        creativeType: contextData.creative?.type || null,
        personaName: contextData.persona?.name || null,
        productName: contextData.product?.name || null
      } : null
    });

  } catch (err) {
    console.error('Error in auto-create story process:', err);

    if (err instanceof SyntaxError) {
      throw error(400, 'Invalid JSON in request body');
    }

    if (err.status) {
      throw error(err.status, err.body?.message || 'API Error');
    }

    throw error(500, `Internal Server Error: ${err.message || 'Unknown error'}`);
  }
};
