import { json, error, type RequestEvent } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto'; // Although not used for filename, keep for potential future use

// Ensure the upload directory exists
const UPLOAD_DIR = path.join('static', 'template-previews');
await fs.mkdir(UPLOAD_DIR, { recursive: true });

export const POST = async ({ request }: RequestEvent) => {
  try {
    const body = await request.json();
    const imageDataUrl = body.imageData;
    const templateId = body.templateId; // Expect templateId

    if (!templateId || typeof templateId !== 'number') {
      throw error(400, 'Missing or invalid templateId.');
    }
    if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/png;base64,')) {
      throw error(400, 'Invalid image data format. Expected PNG base64 data URL.');
    }

    // Extract base64 data
    const base64Data = imageDataUrl.replace(/^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Generate filename based on templateId for consistency and overwrite capability
    const filename = `template-${templateId}.png`;
    const filePath = path.join(UPLOAD_DIR, filename);

    // Save the file (overwrites if exists for the same templateId)
    await fs.writeFile(filePath, imageBuffer);

    // Construct the public URL (relative path from static folder)
    const imageUrl = `/template-previews/${filename}`;

    // Return only the URL, the frontend will handle updating the template record
    return json({ imageUrl });

  } catch (err: any) {
    console.error('Error processing template preview upload:', err);
    if (err.status && err.body) {
      throw err; // Re-throw SvelteKit errors
    }
    throw error(500, `Failed to process template preview upload: ${err.message || 'Unknown error'}`);
  }
};
