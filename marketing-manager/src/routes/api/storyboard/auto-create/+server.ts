import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { scenes, clips, stories } from '$lib/server/db/schema';
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

    // Create a new scene for this story
    const [newScene] = await db.insert(scenes).values({
      storyId: storyRecord.id,
      description: `Scene for ${storyRecord.title || 'story'}`,
      orderIndex: 0, // First scene
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    sceneId = newScene.id;
    console.log(`Created new scene with ID: ${sceneId}`);


    // Step 2: Create a storyboard in the AI storyboard creator
    let storyboardResponse;
    try {
      storyboardResponse = await fetch('http://localhost:5173/api/storyboard/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: storyPrompt.substring(0, 30) + '...' })
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
        body: JSON.stringify({ storyPrompt })
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

    for (const frame of frames) {
      try {
        // Create a new clip for the frame
        const [newClip] = await db.insert(clips).values({
          sceneId: sceneId,
          canvas: '{}', // Empty canvas initially
          narration: frame.narration || '',
          description: frame.mainImagePrompt || '',
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

    return json({
      success: true,
      message: `Successfully created ${createdClips.length} clips from AI storyboard`,
      storyboardId,
      frameCount: frames.length,
      clipCount: createdClips.length,
      clips: createdClips
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
