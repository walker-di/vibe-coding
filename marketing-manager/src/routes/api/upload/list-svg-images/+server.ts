import { json, error, type RequestEvent } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';

// Define the SVG images directory
const SVG_IMAGES_DIR = path.join('static', 'svg');

/**
 * GET handler for listing SVG images
 */
export const GET = async ({ url }: RequestEvent) => {
  try {
    // Create the directory if it doesn't exist
    try {
      await fs.mkdir(SVG_IMAGES_DIR, { recursive: true });
    } catch (err) {
      console.error(`Error ensuring directory ${SVG_IMAGES_DIR}:`, err);
    }

    // Read the directory
    const files = await fs.readdir(SVG_IMAGES_DIR);
    
    // Filter for SVG files
    const svgFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ext === '.svg';
    });

    // Get file stats for each SVG
    const svgDetails = await Promise.all(
      svgFiles.map(async (file) => {
        try {
          const filePath = path.join(SVG_IMAGES_DIR, file);
          const stats = await fs.stat(filePath);
          
          // Read a small portion of the file to extract a title or description if available
          let name = file;
          try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            // Try to extract title from SVG
            const titleMatch = fileContent.match(/<title>(.*?)<\/title>/);
            if (titleMatch && titleMatch[1]) {
              name = titleMatch[1];
            } else {
              // If no title, try to extract description
              const descMatch = fileContent.match(/<desc>(.*?)<\/desc>/);
              if (descMatch && descMatch[1]) {
                name = descMatch[1];
              }
            }
          } catch (readErr) {
            console.error(`Error reading SVG file ${file}:`, readErr);
          }
          
          return {
            name: name,
            url: `/svg/${file}`,
            size: stats.size,
            lastModified: stats.mtime,
            isSvg: true, // Flag to identify SVG images
            isAiGenerated: true // Also mark as AI-generated for filtering purposes
          };
        } catch (err) {
          console.error(`Error getting stats for ${file}:`, err);
          return {
            name: file,
            url: `/svg/${file}`,
            size: 0,
            lastModified: new Date(0),
            isSvg: true,
            isAiGenerated: true
          };
        }
      })
    );

    // Sort by last modified date (newest first)
    svgDetails.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

    return json({
      images: svgDetails
    });
  } catch (err: any) {
    console.error('Error listing SVG images:', err);
    throw error(500, { message: `Failed to list SVG images: ${err.message || 'Unknown error'}` });
  }
};
