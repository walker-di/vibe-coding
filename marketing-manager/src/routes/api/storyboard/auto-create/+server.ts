import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { scenes, clips } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// This endpoint handles the entire auto-create process in one go
export const POST: RequestHandler = async ({ request, fetch }) => {
  try {
    const requestData = await request.json();
    const { storyPrompt, sceneId } = requestData;

    if (!storyPrompt || !sceneId) {
      throw error(400, 'Missing required parameters: storyPrompt and sceneId');
    }

    console.log(`Auto-create story request received for scene ${sceneId} with prompt: "${storyPrompt.substring(0, 50)}..."`);

    // Step 1: Verify the scene exists
    const sceneExists = await db.query.scenes.findFirst({
      where: eq(scenes.id, sceneId),
      columns: { id: true }
    });

    if (!sceneExists) {
      throw error(404, `Scene with ID ${sceneId} not found`);
    }

    // Step 2: Create a storyboard in the AI storyboard creator
    const storyboardResponse = await fetch('http://localhost:5173/api/storyboard/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: storyPrompt.substring(0, 30) + '...' })
    });

    if (!storyboardResponse.ok) {
      const errorData = await storyboardResponse.json();
      throw new Error(errorData.message || `API Error: ${storyboardResponse.statusText}`);
    }

    const storyboardResult = await storyboardResponse.json();
    const storyboardId = storyboardResult.storyboardId;
    console.log(`Created storyboard with ID: ${storyboardId}`);

    // Step 3: Generate frames for the storyboard in the AI storyboard creator
    const framesResponse = await fetch(`http://localhost:5173/api/storyboard/${storyboardId}/add-frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyPrompt })
    });

    if (!framesResponse.ok) {
      const errorData = await framesResponse.json();
      throw new Error(errorData.message || `API Error: ${framesResponse.statusText}`);
    }

    const framesResult = await framesResponse.json();
    console.log(`Generated frames for storyboard ${storyboardId}`);

    // Step 4: Fetch the generated frames from the AI storyboard creator
    const storyboardDataResponse = await fetch(`http://localhost:5173/api/storyboard/${storyboardId}`);
    if (!storyboardDataResponse.ok) {
      const errorData = await storyboardDataResponse.json();
      throw new Error(errorData.message || `API Error: ${storyboardDataResponse.statusText}`);
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
