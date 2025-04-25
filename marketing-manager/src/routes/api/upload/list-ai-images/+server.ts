import { json, error, type RequestEvent } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';

// Define the AI-generated images directory
const AI_IMAGES_DIR = path.join('static', 'uploads', 'gen');

/**
 * GET handler for listing AI-generated images
 */
export const GET = async ({ url }: RequestEvent) => {
  try {
    // Create the directory if it doesn't exist
    try {
      await fs.mkdir(AI_IMAGES_DIR, { recursive: true });
    } catch (err) {
      console.error(`Error ensuring directory ${AI_IMAGES_DIR}:`, err);
    }

    // Read the directory
    const files = await fs.readdir(AI_IMAGES_DIR);
    
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
          const filePath = path.join(AI_IMAGES_DIR, file);
          const stats = await fs.stat(filePath);
          
          return {
            name: file,
            url: `/uploads/gen/${file}`,
            size: stats.size,
            lastModified: stats.mtime,
            isAiGenerated: true // Flag to identify AI-generated images
          };
        } catch (err) {
          console.error(`Error getting stats for ${file}:`, err);
          return {
            name: file,
            url: `/uploads/gen/${file}`,
            size: 0,
            lastModified: new Date(0),
            isAiGenerated: true
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
    console.error('Error listing AI-generated images:', err);
    throw error(500, { message: `Failed to list AI-generated images: ${err.message || 'Unknown error'}` });
  }
};
