import { json, error, type RequestEvent } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

// Ensure the upload directory exists
const UPLOAD_DIR = path.join('static', 'uploads', 'audio');

// Create the directory if it doesn't exist
try {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  console.log(`Directory created/verified: ${UPLOAD_DIR}`);
} catch (err) {
  console.error(`Error creating directory ${UPLOAD_DIR}:`, err);
}

/**
 * POST handler for uploading audio files
 * Accepts multipart/form-data with a file field
 */
export const POST = async ({ request }: RequestEvent) => {
  try {
    // Log the request content type for debugging
    const contentType = request.headers.get('content-type') || '';
    console.log('Audio upload request content type:', contentType);

    // Check if the request is multipart/form-data
    if (!contentType.includes('multipart/form-data')) {
      console.error('Invalid content type:', contentType);
      throw error(400, { message: 'Expected multipart/form-data' });
    }

    // Parse the form data
    const formData = await request.formData();
    console.log('Form data keys:', [...formData.keys()]);

    const file = formData.get('file');
    console.log('File object type:', file ? typeof file : 'null', file instanceof File ? 'is File' : 'not File');

    if (!file || !(file instanceof File)) {
      console.error('No file or invalid file in request');
      throw error(400, { message: 'No file uploaded or invalid file' });
    }

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-wav'];
    if (!allowedTypes.includes(file.type)) {
      throw error(400, {
        message: `Invalid file type. Allowed types: MP3, WAV, OGG`
      });
    }

    // Generate a unique filename to prevent overwriting
    const fileExtension = file.name.split('.').pop() || 'mp3';
    const filename = `${randomUUID()}.${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save the file
    try {
      await fs.writeFile(filePath, buffer);
      console.log(`Audio file saved successfully: ${filePath}`);
    } catch (writeErr) {
      console.error('Error writing file:', writeErr);
      throw error(500, { message: `Failed to save file: ${writeErr.message}` });
    }

    // Construct the public URL
    const audioUrl = `/uploads/audio/${filename}`;
    console.log('Generated audio URL:', audioUrl);

    return json({
      success: true,
      audioUrl,
      audioName: file.name, // Return the original file name
      message: 'Audio uploaded successfully'
    });

  } catch (err: any) {
    console.error('Error processing audio upload:', err);
    // Check if it's an error thrown by SvelteKit's error() helper
    if (err.status && err.body) {
      throw err; // Re-throw SvelteKit errors
    }
    // Throw a generic internal server error otherwise
    throw error(500, { message: `Failed to process audio upload: ${err.message || 'Unknown error'}` });
  }
};
