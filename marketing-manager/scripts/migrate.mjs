import 'dotenv/config'; // Load .env file
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..'); // Assumes script is in root/scripts/

console.log('Starting migration script...');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set.');
}

// Ensure the path uses the correct format (remove 'sqlite:')
let dbPath = process.env.DATABASE_URL;
if (dbPath.startsWith('sqlite:')) {
  dbPath = dbPath.substring(7); // Remove 'sqlite:' prefix
}

// Resolve the path relative to the project root if it's relative
if (dbPath.startsWith('./') || dbPath.startsWith('.\\')) {
  dbPath = path.resolve(projectRoot, dbPath);
}

console.log(`Resolved database path: ${dbPath}`);

// Ensure the directory exists before trying to open the database
const dbDir = path.dirname(dbPath);
import fs from 'node:fs';
if (!fs.existsSync(dbDir)) {
  console.log(`Creating database directory: ${dbDir}`);
  fs.mkdirSync(dbDir, { recursive: true });
}

try {
  console.log('Connecting to database...');
  const sqlite = new Database(dbPath); // Use the resolved path
  console.log('Database connection successful.');

  console.log('Initializing Drizzle ORM...');
  const db = drizzle(sqlite);
  console.log('Drizzle ORM initialized.');

  const migrationsFolder = path.resolve(projectRoot, 'drizzle');
  console.log(`Looking for migrations in: ${migrationsFolder}`);

  console.log('Applying migrations...');
  await migrate(db, { migrationsFolder });
  console.log('Migrations applied successfully.');

  console.log('Closing database connection...');
  sqlite.close();
  console.log('Database connection closed.');

  console.log('Migration script finished successfully.');
  process.exit(0);

} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}
