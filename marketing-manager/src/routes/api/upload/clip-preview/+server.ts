import { json, error, type RequestEvent } from '@sveltejs/kit'; // Import RequestEvent
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

// Ensure the upload directory exists
const UPLOAD_DIR = path.join('static', 'clip-previews');
await fs.mkdir(UPLOAD_DIR, { recursive: true });

export const POST = async ({ request }: RequestEvent) => { // Use RequestEvent type
  try {
    const body = await request.json();
    const imageDataUrl = body.imageData;
    const clipId = body.clipId; // Expect clipId

    if (!clipId || typeof clipId !== 'number') {
      throw error(400, 'Missing or invalid clipId.');
    }
    if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/png;base64,')) {
      throw error(400, 'Invalid image data format. Expected PNG base64 data URL.');
    }

    // Extract base64 data
    const base64Data = imageDataUrl.replace(/^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Generate filename based on clipId
    const filename = `clip-${clipId}.png`; // Use clipId for consistent filename
    const filePath = path.join(UPLOAD_DIR, filename);

    // Save the file
    await fs.writeFile(filePath, imageBuffer);

    // Construct the public URL
    const imageUrl = `/clip-previews/${filename}`; // Relative URL for client-side use

    return json({ imageUrl });

  } catch (err: any) {
    console.error('Error processing image upload:', err);
    // Check if it's an error thrown by SvelteKit's error() helper
    if (err.status && err.body) {
      throw err; // Re-throw SvelteKit errors
    }
    // Throw a generic internal server error otherwise
    throw error(500, `Failed to process image upload: ${err.message || 'Unknown error'}`);
  }
};
