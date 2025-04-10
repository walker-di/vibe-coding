import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { db } from '$lib/server/db';
import { clips } from '$lib/server/db/schema';

/**
 * API endpoint to purge unused clip preview images
 * GET /api/maintenance/purge-clip-previews
 * Query parameters:
 *   - dry_run=true|false (default: false) - If true, only report what would be deleted without actually deleting
 */
export async function GET({ url }) {
  try {
    // Check if this is a dry run
    const dryRun = url.searchParams.get('dry_run') === 'true';
    
    // Get all clips with their image URLs from the database
    const allClips = await db.query.clips.findMany({
      columns: {
        id: true,
        imageUrl: true
      }
    });
    
    // Extract clip IDs from database
    const dbClipIds = new Set();
    allClips.forEach(clip => {
      if (clip.imageUrl) {
        // Extract clip ID from URL if it follows the pattern /clip-previews/clip-XX.png
        const match = clip.imageUrl.match(/\/clip-previews\/clip-(\d+)\.png/);
        if (match) {
          dbClipIds.add(parseInt(match[1], 10));
        }
      }
    });
    
    // Get all files in the clip-previews directory
    const PREVIEW_DIR = path.join('static', 'clip-previews');
    let files;
    try {
      files = await fs.readdir(PREVIEW_DIR);
    } catch (err) {
      return json({ 
        success: false, 
        error: `Error reading directory ${PREVIEW_DIR}: ${err.message}` 
      }, { status: 500 });
    }
    
    // Filter out non-PNG files
    const pngFiles = files.filter(file => file.endsWith('.png'));
    
    // Find unused files
    const unusedFiles = [];
    pngFiles.forEach(file => {
      // Skip placeholder.png
      if (file === 'placeholder.png') {
        return;
      }
      
      // Extract clip ID from filename if it follows the pattern clip-XX.png or clip-XX-timestamp.png
      const match = file.match(/^clip-(\d+)(?:-\d+)?\.png$/);
      if (match) {
        const fileClipId = parseInt(match[1], 10);
        if (!dbClipIds.has(fileClipId)) {
          unusedFiles.push(file);
        }
      } else {
        // Add files that don't match the expected pattern
        unusedFiles.push(file);
      }
    });
    
    // If dry run, just return the list of files that would be deleted
    if (dryRun) {
      return json({
        success: true,
        dryRun: true,
        totalFiles: pngFiles.length,
        unusedFiles: unusedFiles,
        unusedCount: unusedFiles.length,
        message: `Found ${unusedFiles.length} unused files out of ${pngFiles.length} total files.`
      });
    }
    
    // Delete the unused files
    const results = {
      deleted: [],
      errors: []
    };
    
    for (const file of unusedFiles) {
      try {
        await fs.unlink(path.join(PREVIEW_DIR, file));
        results.deleted.push(file);
      } catch (err) {
        results.errors.push({ file, error: err.message });
      }
    }
    
    return json({
      success: true,
      dryRun: false,
      totalFiles: pngFiles.length,
      deletedFiles: results.deleted,
      deletedCount: results.deleted.length,
      errors: results.errors,
      errorCount: results.errors.length,
      message: `Deleted ${results.deleted.length} unused files. Encountered ${results.errors.length} errors.`
    });
    
  } catch (error) {
    console.error('Error in purge-clip-previews API:', error);
    return json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
