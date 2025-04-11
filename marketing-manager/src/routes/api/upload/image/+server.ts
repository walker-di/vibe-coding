import { json, error, type RequestEvent } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

// Ensure the upload directory exists
const UPLOAD_DIR = path.join('static', 'uploads', 'image');

// Create the directory if it doesn't exist
try {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  console.log(`Directory created/verified: ${UPLOAD_DIR}`);
} catch (err) {
  console.error(`Error creating directory ${UPLOAD_DIR}:`, err);
}

/**
 * POST handler for uploading images
 * Accepts multipart/form-data with a file field
 */
export const POST = async ({ request }: RequestEvent) => {
  try {
    // Log the request content type for debugging
    const contentType = request.headers.get('content-type') || '';
    console.log('Upload request content type:', contentType);

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
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw error(400, {
        message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      });
    }

    // Generate a unique filename to prevent overwriting
    const fileExtension = file.name.split('.').pop() || 'png';
    const filename = `${randomUUID()}.${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save the file
    try {
      await fs.writeFile(filePath, buffer);
      console.log(`File saved successfully: ${filePath}`);
    } catch (writeErr) {
      console.error('Error writing file:', writeErr);
      throw error(500, { message: `Failed to save file: ${writeErr.message}` });
    }

    // Construct the public URL
    const imageUrl = `/uploads/image/${filename}`;
    console.log('Generated image URL:', imageUrl);

    return json({
      success: true,
      imageUrl,
      message: 'Image uploaded successfully'
    });

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
