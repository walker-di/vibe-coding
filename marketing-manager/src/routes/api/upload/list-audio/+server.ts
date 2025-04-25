import { json, error, type RequestEvent } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';

// Define the upload directory
const UPLOAD_DIR = path.join('static', 'uploads', 'audio');

/**
 * GET handler for listing uploaded audio files
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
    
    // Filter for audio files
    const audioExtensions = ['.mp3', '.wav', '.ogg'];
    const audioFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return audioExtensions.includes(ext);
    });
    
    // Get file stats for each audio file
    const audioFilesWithStats = await Promise.all(
      audioFiles.map(async (filename) => {
        try {
          const filePath = path.join(UPLOAD_DIR, filename);
          const stats = await fs.stat(filePath);
          
          return {
            filename,
            url: `/uploads/audio/${filename}`,
            size: stats.size,
            createdAt: stats.birthtime
          };
        } catch (err) {
          console.error(`Error getting stats for ${filename}:`, err);
          return {
            filename,
            url: `/uploads/audio/${filename}`,
            size: 0,
            createdAt: new Date(0)
          };
        }
      })
    );
    
    // Sort by creation date (newest first)
    audioFilesWithStats.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return json({
      success: true,
      files: audioFilesWithStats
    });
    
  } catch (err: any) {
    console.error('Error listing audio files:', err);
    throw error(500, { message: `Failed to list audio files: ${err.message}` });
  }
};
