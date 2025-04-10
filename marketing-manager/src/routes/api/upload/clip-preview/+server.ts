import { json, error, type RequestEvent } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { purgeUnusedClipPreviews } from '$lib/server/utils/purgeClipPreviews';

// Ensure the upload directory exists
const UPLOAD_DIR = path.join('static', 'clip-previews');
await fs.mkdir(UPLOAD_DIR, { recursive: true });

/**
 * POST handler for uploading clip preview images
 */
export const POST = async ({ request }: RequestEvent) => {
  try {
    const body = await request.json();
    const imageDataUrl = body.imageData;
    const clipId = body.clipId; // Expect clipId

    if (!clipId || typeof clipId !== 'number') {
      console.error('clip-preview API: Missing or invalid clipId');
      throw error(400, { message: 'Missing or invalid clipId.' });
    }
    if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/png;base64,')) {
      console.error('clip-preview API: Invalid image data format');
      throw error(400, { message: 'Invalid image data format. Expected PNG base64 data URL.' });
    }

    // Extract base64 data
    const base64Data = imageDataUrl.replace(/^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Generate filename based on clipId
    // We use a consistent filename format to ensure we can find and update existing previews
    const filename = `clip-${clipId}.png`;
    const filePath = path.join(UPLOAD_DIR, filename);

    await fs.writeFile(filePath, imageBuffer);

    // Construct the public URL
    const imageUrl = `/clip-previews/${filename}`; // Relative URL for client-side use

    // Add a timestamp query parameter to force browser cache refresh
    const timestampedUrl = `${imageUrl}?t=${Date.now()}`;

    // Run the purge process in the background
    // We don't await this to avoid delaying the response
    purgeUnusedClipPreviews({ verbose: false, dryRun: false })
      .then(result => {
        if (result.success && 'deletedCount' in result && result.deletedCount > 0) {
          console.log(`[Purge] Successfully purged ${result.deletedCount} unused clip preview files.`);
        }
      })
      .catch(err => {
        console.error('[Purge] Error during automatic purge:', err);
      });

    return json({
      data: { imageUrl: timestampedUrl },
      message: 'Clip preview uploaded successfully'
    }, { status: 200 });

  } catch (err: any) {
    console.error('Error processing image upload:', err);
    // Check if it's an error thrown by SvelteKit's error() helper
    if (err.status && err.body) {
      throw err; // Re-throw SvelteKit errors
    }
    // Throw a generic internal server error otherwise
    throw error(500, { message: `Failed to process image upload: ${err.message || 'Unknown error'}` });
  }
};
