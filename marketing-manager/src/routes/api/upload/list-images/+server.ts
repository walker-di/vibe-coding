import { json, error, type RequestEvent } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';

// Define the upload directory
const UPLOAD_DIR = path.join('static', 'uploads', 'image');

/**
 * GET handler for listing uploaded images
 */
export const GET = async ({ url }: RequestEvent) => {
  try {
    // Create the directory if it doesn't exist
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
    } catch (err) {
      console.error(`Error ensuring directory ${UPLOAD_DIR}:`, err);
    }

    // Read the directory
    const files = await fs.readdir(UPLOAD_DIR);
    
    // Filter for image files
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    });

    // Get file stats for each image
    const imageDetails = await Promise.all(
      imageFiles.map(async (file) => {
        try {
          const filePath = path.join(UPLOAD_DIR, file);
          const stats = await fs.stat(filePath);
          
          return {
            name: file,
            url: `/uploads/image/${file}`,
            size: stats.size,
            lastModified: stats.mtime
          };
        } catch (err) {
          console.error(`Error getting stats for ${file}:`, err);
          return {
            name: file,
            url: `/uploads/image/${file}`,
            size: 0,
            lastModified: new Date(0)
          };
        }
      })
    );

    // Sort by last modified date (newest first)
    imageDetails.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

    return json({
      images: imageDetails
    });
  } catch (err: any) {
    console.error('Error listing images:', err);
    throw error(500, { message: `Failed to list images: ${err.message || 'Unknown error'}` });
  }
};
