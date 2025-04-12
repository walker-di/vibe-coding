import { json, error, type RequestEvent } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto'; // Although not used for filename, keep for potential future use

// Ensure the upload directory exists
const UPLOAD_DIR = path.join('static', 'template-previews');
await fs.mkdir(UPLOAD_DIR, { recursive: true });

export const POST = async ({ request }: RequestEvent) => {
  console.log('=== SERVER: TEMPLATE PREVIEW UPLOAD START ===');
  try {
    const body = await request.json();
    const imageDataUrl = body.imageData;
    const templateId = body.templateId; // Expect templateId

    console.log('Server received template ID:', templateId);
    console.log('Server received image data URL length:', imageDataUrl?.length || 0);
    console.log('Server received image data URL prefix:', imageDataUrl?.substring(0, 100) + '...' || 'null');

    if (!templateId || typeof templateId !== 'number') {
      console.error('Missing or invalid templateId:', templateId);
      throw error(400, 'Missing or invalid templateId.');
    }
    if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/png;base64,')) {
      console.error('Invalid image data format. Expected PNG base64 data URL.');
      throw error(400, 'Invalid image data format. Expected PNG base64 data URL.');
    }

    // Extract base64 data
    const base64Data = imageDataUrl.replace(/^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    console.log('Image buffer size:', imageBuffer.byteLength, 'bytes');

    // Generate filename based on templateId for consistency and overwrite capability
    const filename = `template-${templateId}.png`;
    const filePath = path.join(UPLOAD_DIR, filename);
    console.log('Saving image to path:', filePath);

    // Save the file (overwrites if exists for the same templateId)
    await fs.writeFile(filePath, imageBuffer);
    console.log('File saved successfully');

    // Get file stats to verify the file size
    const stats = await fs.stat(filePath);
    console.log('Saved file size:', stats.size, 'bytes');

    // Construct the public URL (relative path from static folder)
    const imageUrl = `/template-previews/${filename}`;
    console.log('Generated image URL:', imageUrl);

    // Add a timestamp to force browser cache refresh
    const timestampedUrl = `${imageUrl}?t=${Date.now()}`;
    console.log('Timestamped URL:', timestampedUrl);
    console.log('=== SERVER: TEMPLATE PREVIEW UPLOAD END ===');

    // Return only the URL, the frontend will handle updating the template record
    return json({ imageUrl: timestampedUrl });

  } catch (err: any) {
    console.error('Error processing template preview upload:', err);
    if (err.status && err.body) {
      throw err; // Re-throw SvelteKit errors
    }
    throw error(500, `Failed to process template preview upload: ${err.message || 'Unknown error'}`);
  }
};
