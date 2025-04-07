import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { env } from '$env/dynamic/private';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

if (!env.DATABASE_URL) {
	throw new Error('DATABASE_URL environment variable is not set.');
}

// --- Path Resolution & Directory Creation Logic ---
let dbPath = env.DATABASE_URL;

// Resolve relative path based on project root (adjust if needed)
// Assuming this file is at src/lib/server/db/index.ts
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../../../'); // Go up 4 levels

if (dbPath.startsWith('./') || dbPath.startsWith('.\\')) {
	dbPath = path.resolve(projectRoot, dbPath);
}

console.log(`[DB Init] Resolved database path: ${dbPath}`);

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
	console.log(`[DB Init] Creating database directory: ${dbDir}`);
	fs.mkdirSync(dbDir, { recursive: true });
}
// --- End Logic ---

console.log(`[DB Init] Connecting to database at: ${dbPath}`);
const client = new Database(dbPath); // Use the resolved and verified path
console.log('[DB Init] Database connection successful.');

export const db = drizzle(client, { schema });
console.log('[DB Init] Drizzle ORM initialized.');
