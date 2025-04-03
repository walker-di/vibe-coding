import { json, error, type RequestEvent } from '@sveltejs/kit'; // Import RequestEvent
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { storyboardFrames } from '$lib/server/db/schema';
import { eq, type InferSelectModel } from 'drizzle-orm';
import {
    generateImageReplicate,
    generateNarrationAudioAzure,
    generateBackgroundMusicReplicate // Import the new function
} from '$lib/server/aiService';

// Define the inferred type
type StoryboardFrame = InferSelectModel<typeof storyboardFrames>;

// Define the expected type for the request body
type GenerateAssetRequestBody = {
  assetType?: 'mainImage' | 'backgroundImage' | 'narrationAudio' | 'bgmAudio'; // Add bgmAudio
  voiceName?: string;
};

// This endpoint triggers the generation of assets (image, audio) for a specific frame
// Can optionally regenerate only a specific asset type via request body { assetType: '...' }
export const POST: RequestHandler = async ({ params, request }: RequestEvent) => { // Add request to params
  const frameId = params.frameId;

  if (!frameId) {
    throw error(400, 'Missing frameId parameter');
  }

  console.log(`Received request to generate assets for frame: ${frameId}`);

  let assetType: GenerateAssetRequestBody['assetType'] = undefined;
  let voiceName: string | undefined = undefined; // Variable to store voice name

  try {
    // Check if there's a request body to specify asset type and/or voice name
    const body = await request.json().catch(() => ({})); // Handle empty or non-JSON body gracefully

    if (body && typeof body === 'object') {
        // Check for assetType
        if ('assetType' in body) {
            const potentialType = body.assetType;
            // Update the list of valid asset types
            if (['mainImage', 'backgroundImage', 'narrationAudio', 'bgmAudio'].includes(potentialType)) {
                assetType = potentialType as GenerateAssetRequestBody['assetType'];
                console.log(`Request is for specific asset type: ${assetType}`);
            } else {
                 console.warn(`Invalid assetType received: ${potentialType}. Generating all assets.`);
            }
        }
        // Check for voiceName (only relevant if generating audio)
        if ('voiceName' in body && typeof body.voiceName === 'string') {
            voiceName = body.voiceName;
            console.log(`Received voiceName parameter: ${voiceName}`);
        }
    }
  } catch (e) {
      console.warn("Could not parse request body for assetType/voiceName, generating all assets.", e);
  }


  try {
    // 1. Fetch the required frame data from the database
    const frameResult = await db.select({
        id: storyboardFrames.id,
        mainImagePrompt: storyboardFrames.mainImagePrompt,
        backgroundImagePrompt: storyboardFrames.backgroundImagePrompt,
        bgmPrompt: storyboardFrames.bgmPrompt, // Fetch the BGM prompt
        narration: storyboardFrames.narration,
      })
      .from(storyboardFrames)
      .where(eq(storyboardFrames.id, frameId))
      .limit(1);

    const frame = frameResult[0];

    if (!frame) {
      throw error(404, `Storyboard frame with ID ${frameId} not found.`);
    }

    console.log(`Found frame ${frameId}. Triggering asset generation (Type: ${assetType || 'all'})...`);

    // 2. Call AI services based on assetType
    // Update the type for updateData to include bgmUrl
    const updateData: Partial<Pick<StoryboardFrame, 'mainImageUrl' | 'backgroundImageUrl' | 'narrationAudioUrl' | 'bgmUrl'>> = {};

    if (!assetType || assetType === 'mainImage') {
        console.log("Generating main image...");
        updateData.mainImageUrl = await generateImageReplicate(frame.mainImagePrompt, frameId, '1:1');
        console.log(` -> Main image URL: ${updateData.mainImageUrl}`);
    }
    if (!assetType || assetType === 'backgroundImage') {
        console.log("Generating background image...");
        updateData.backgroundImageUrl = await generateImageReplicate(frame.backgroundImagePrompt, frameId, '16:9');
        console.log(` -> Background image URL: ${updateData.backgroundImageUrl}`);
    }
    if (!assetType || assetType === 'narrationAudio') {
        console.log("Generating narration audio...");
        // Pass the extracted voiceName (or undefined) to the function
        updateData.narrationAudioUrl = await generateNarrationAudioAzure(frame.narration, frameId, voiceName);
        console.log(` -> Narration audio URL: ${updateData.narrationAudioUrl}`);
    }
    if (!assetType || assetType === 'bgmAudio') {
        console.log("Generating BGM audio...");
        // Call the BGM generation function using the fetched bgmPrompt
        updateData.bgmUrl = await generateBackgroundMusicReplicate(frame.bgmPrompt, frameId);
        console.log(` -> BGM audio URL: ${updateData.bgmUrl}`);
    }
    // Add other asset types (video) here if needed in the future

    console.log(`Asset generation results for ${frameId} (Type: ${assetType || 'all'}):`, updateData);

    // 3. Update the database record with the generated results
    if (Object.keys(updateData).length > 0) {
        await db.update(storyboardFrames)
          .set(updateData)
          .where(eq(storyboardFrames.id, frameId));
        console.log(`Updated database record for frame ${frameId} with generated assets.`);
    } else {
        console.log(`No assets were generated or updated for frame ${frameId}.`);
    }

    // 4. Return the updated data (or just a success message)
    // Fetching the updated record again to return it
     const updatedFrameResult = await db.select()
      .from(storyboardFrames)
      .where(eq(storyboardFrames.id, frameId))
      .limit(1);

    return json({
        message: 'Asset generation triggered successfully.',
        updatedFrame: updatedFrameResult[0] || null // Return the updated frame data
    }, { status: 200 });

  } catch (err: any) {
    console.error(`Error generating assets for frame ${frameId}:`, err);
    // Re-throw kit errors, otherwise wrap as internal server error
    if (err.status) {
        throw err;
    }
    throw error(500, `Failed to generate assets: ${err.message || err}`);
  }
};
