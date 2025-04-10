const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Open the database
const db = new sqlite3.Database('./data.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the database.');
});

// Get all clips with their image URLs
db.all('SELECT id, image_url FROM clips', [], (err, rows) => {
  if (err) {
    console.error('Error querying database:', err.message);
    db.close();
    process.exit(1);
  }
  
  console.log('Clips in database:');
  console.log(JSON.stringify(rows, null, 2));
  
  // Get all files in the clip-previews directory
  const previewDir = path.join('static', 'clip-previews');
  fs.readdir(previewDir, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err.message);
      db.close();
      process.exit(1);
    }
    
    // Filter out non-PNG files
    const pngFiles = files.filter(file => file.endsWith('.png'));
    console.log(`\nFound ${pngFiles.length} PNG files in ${previewDir}`);
    
    // Extract clip IDs from database
    const dbClipIds = new Set();
    rows.forEach(row => {
      if (row.image_url) {
        // Extract clip ID from URL if it follows the pattern /clip-previews/clip-XX.png
        const match = row.image_url.match(/\/clip-previews\/clip-(\d+)\.png/);
        if (match) {
          dbClipIds.add(parseInt(match[1], 10));
        }
      }
    });
    
    console.log(`\nClip IDs referenced in database: ${Array.from(dbClipIds).join(', ')}`);
    
    // Find unused files
    const unusedFiles = [];
    pngFiles.forEach(file => {
      // Extract clip ID from filename if it follows the pattern clip-XX.png
      const match = file.match(/^clip-(\d+)(?:-\d+)?\.png$/);
      if (match) {
        const fileClipId = parseInt(match[1], 10);
        if (!dbClipIds.has(fileClipId)) {
          unusedFiles.push(file);
        }
      } else if (file !== 'placeholder.png') {
        // Add files that don't match the expected pattern (except placeholder)
        unusedFiles.push(file);
      }
    });
    
    console.log(`\nUnused files (${unusedFiles.length}):`);
    console.log(JSON.stringify(unusedFiles, null, 2));
    
    db.close();
  });
});
