// This script will update the database schema using Drizzle ORM
// Run with: node src/lib/server/db/migrations/update-schema.js

const { drizzle } = require('drizzle-orm/better-sqlite3');
const Database = require('better-sqlite3');
const path = require('path');

// Path to the database file
const dbPath = path.join(__dirname, '../../../../data/marketing-manager.db');

// Connect to the database
const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

// Execute the SQL statements directly
sqlite.exec(`
  -- Add audio settings fields to stories table
  ALTER TABLE stories ADD COLUMN narration_volume REAL DEFAULT 1.0;
  ALTER TABLE stories ADD COLUMN bgm_volume REAL DEFAULT 0.5;
  ALTER TABLE stories ADD COLUMN narration_speed REAL DEFAULT 1.0;
`);

console.log('Schema updated successfully');

// Close the database connection
sqlite.close();
