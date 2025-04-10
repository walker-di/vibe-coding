import fs from 'fs/promises';
import path from 'path';
import { db } from '$lib/server/db';
import { clips } from '$lib/server/db/schema';

// Configuration
const PREVIEW_DIR = path.join('static', 'clip-previews');

/**
 * Purges unused clip preview images from the file system
 * @param options Configuration options
 * @returns Results of the purge operation
 */
export async function purgeUnusedClipPreviews(options: {
  verbose?: boolean;
  dryRun?: boolean;
} = {}) {
  const { verbose = false, dryRun = false } = options;

  // Helper function to log messages
  const log = (message: string) => {
    if (verbose) {
      console.log(`[Purge] ${message}`);
    }
  };

  try {
    // Get all clips with their image URLs from the database
    const allClips = await db.query.clips.findMany({
      columns: {
        id: true,
        imageUrl: true
      }
    });

    log(`Found ${allClips.length} clips in the database.`);

    // Extract clip IDs from database
    const dbClipIds = new Set<number>();
    // Also keep track of the exact filenames that are in use
    const dbFilenames = new Set<string>();

    allClips.forEach(clip => {
      if (clip.imageUrl) {
        // Extract clip ID from URL if it follows the pattern /clip-previews/clip-XX.png or /clip-previews/clip-XX-timestamp.png
        const match = clip.imageUrl.match(/\/clip-previews\/clip-(\d+)(?:-\d+)?\.png/);
        if (match) {
          dbClipIds.add(parseInt(match[1], 10));

          // Also extract the filename from the URL
          const urlParts = clip.imageUrl.split('/');
          const filename = urlParts[urlParts.length - 1].split('?')[0]; // Remove any query parameters
          dbFilenames.add(filename);
        }
      }
    });

    // Also add all clip IDs from the database to ensure we don't delete any potential previews
    allClips.forEach(clip => {
      dbClipIds.add(clip.id);
    });

    log(`Clip IDs referenced in database: ${Array.from(dbClipIds).join(', ')}`);

    // Get all files in the clip-previews directory
    let files;
    try {
      files = await fs.readdir(PREVIEW_DIR);
    } catch (err) {
      log(`Error reading directory ${PREVIEW_DIR}: ${err.message}`);
      return {
        success: false,
        error: `Error reading directory ${PREVIEW_DIR}: ${err.message}`
      };
    }

    // Filter out non-PNG files
    const pngFiles = files.filter(file => file.endsWith('.png'));
    log(`Found ${pngFiles.length} PNG files in ${PREVIEW_DIR}`);

    // Find unused files
    const unusedFiles: string[] = [];
    pngFiles.forEach(file => {
      // Skip placeholder.png
      if (file === 'placeholder.png') {
        return;
      }

      // First check if this exact filename is in the database
      if (dbFilenames.has(file)) {
        return; // This file is directly referenced in the database
      }

      // Extract clip ID from filename if it follows the pattern clip-XX.png or clip-XX-timestamp.png
      const match = file.match(/^clip-(\d+)(?:-\d+)?\.png$/);
      if (match) {
        const fileClipId = parseInt(match[1], 10);
        if (!dbClipIds.has(fileClipId)) {
          // Only mark as unused if the clip ID doesn't exist in the database
          unusedFiles.push(file);
        }
      } else {
        // Add files that don't match the expected pattern
        unusedFiles.push(file);
      }
    });

    log(`Found ${unusedFiles.length} unused files.`);

    if (unusedFiles.length === 0) {
      log('No files to delete.');
      return {
        success: true,
        dryRun,
        totalFiles: pngFiles.length,
        unusedFiles: [],
        unusedCount: 0,
        message: 'No unused files found.'
      };
    }

    // Display the list of files to be deleted
    if (verbose) {
      log('Files to be deleted:');
      unusedFiles.forEach(file => log(`- ${file}`));
    }

    // Delete the unused files if not in dry run mode
    if (!dryRun) {
      log('Deleting unused files...');
      const results = {
        deleted: [] as string[],
        errors: [] as { file: string; error: string }[]
      };

      for (const file of unusedFiles) {
        try {
          await fs.unlink(path.join(PREVIEW_DIR, file));
          results.deleted.push(file);
          log(`Deleted: ${file}`);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          results.errors.push({ file, error: errorMessage });
          log(`Error deleting ${file}: ${errorMessage}`);
        }
      }

      return {
        success: true,
        dryRun: false,
        totalFiles: pngFiles.length,
        deletedFiles: results.deleted,
        deletedCount: results.deleted.length,
        errors: results.errors,
        errorCount: results.errors.length,
        message: `Deleted ${results.deleted.length} unused files. Encountered ${results.errors.length} errors.`
      };
    } else {
      return {
        success: true,
        dryRun: true,
        totalFiles: pngFiles.length,
        unusedFiles,
        unusedCount: unusedFiles.length,
        message: `Found ${unusedFiles.length} unused files out of ${pngFiles.length} total files.`
      };
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Error in purge process: ${errorMessage}`);
    return {
      success: false,
      error: errorMessage
    };
  }
}
