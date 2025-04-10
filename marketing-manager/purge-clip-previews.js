import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs/promises';

// Configuration
const DB_PATH = './data.db';
const PREVIEW_DIR = path.join('static', 'clip-previews');
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// Helper function to log messages
function log(message, isVerbose = false) {
  if (!isVerbose || (isVerbose && VERBOSE)) {
    console.log(message);
  }
}

// Open the database
const sqlite = sqlite3.verbose();
const db = new sqlite.Database(DB_PATH, async (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  log('Connected to the database.');

  try {
    // Get all clips with their image URLs
    const rows = await queryDatabase('SELECT id, image_url FROM clips');
    log(`Found ${rows.length} clips in the database.`);

    // Extract clip IDs from database
    const dbClipIds = new Set();
    // Also keep track of the exact filenames that are in use
    const dbFilenames = new Set();

    rows.forEach(row => {
      if (row.image_url) {
        // Extract clip ID from URL if it follows the pattern /clip-previews/clip-XX.png or /clip-previews/clip-XX-timestamp.png
        const match = row.image_url.match(/\/clip-previews\/clip-(\d+)(?:-\d+)?\.png/);
        if (match) {
          dbClipIds.add(parseInt(match[1], 10));

          // Also extract the filename from the URL
          const urlParts = row.image_url.split('/');
          const filename = urlParts[urlParts.length - 1].split('?')[0]; // Remove any query parameters
          dbFilenames.add(filename);
        }
      }
    });

    // Also add all clip IDs from the database to ensure we don't delete any potential previews
    rows.forEach(row => {
      dbClipIds.add(row.id);
    });

    log(`Clip IDs referenced in database: ${Array.from(dbClipIds).join(', ')}`, true);

    // Get all files in the clip-previews directory
    let files;
    try {
      files = await fs.readdir(PREVIEW_DIR);
    } catch (err) {
      console.error(`Error reading directory ${PREVIEW_DIR}:`, err.message);
      db.close();
      process.exit(1);
    }

    // Filter out non-PNG files
    const pngFiles = files.filter(file => file.endsWith('.png'));
    log(`Found ${pngFiles.length} PNG files in ${PREVIEW_DIR}`);

    // Find unused files
    const unusedFiles = [];
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
      log('No files to delete. Exiting.');
      db.close();
      return;
    }

    // Display the list of files to be deleted
    if (VERBOSE || DRY_RUN) {
      log('\nFiles to be deleted:');
      unusedFiles.forEach(file => log(`- ${file}`));
    }

    // Delete the unused files if not in dry run mode
    if (!DRY_RUN) {
      log('\nDeleting unused files...');
      let deletedCount = 0;
      let errorCount = 0;

      for (const file of unusedFiles) {
        try {
          await fs.unlink(path.join(PREVIEW_DIR, file));
          deletedCount++;
          log(`Deleted: ${file}`, true);
        } catch (err) {
          errorCount++;
          console.error(`Error deleting ${file}:`, err.message);
        }
      }

      log(`\nPurge complete: ${deletedCount} files deleted, ${errorCount} errors.`);
    } else {
      log('\nDRY RUN: No files were actually deleted.');
      log(`Would have deleted ${unusedFiles.length} files.`);
    }

    db.close();
    log('Database connection closed.');
  } catch (error) {
    console.error('Error:', error.message);
    db.close();
    process.exit(1);
  }
});

// Promise-based wrapper for db.all
function queryDatabase(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}
