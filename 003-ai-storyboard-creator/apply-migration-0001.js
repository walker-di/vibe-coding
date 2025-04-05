import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting manual migration application...');

// --- Configuration ---
// Read DATABASE_URL from environment or .env file (basic parsing)
let dbPath = process.env.DATABASE_URL;
if (!dbPath) {
    try {
        const envPath = path.join(__dirname, '.env'); // Assuming .env is in the project root
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/^DATABASE_URL=(.*)$/m);
        if (match && match[1]) {
            dbPath = match[1].trim();
        }
    } catch (err) {
        // Ignore if .env doesn't exist
    }
}

if (!dbPath) {
    console.error('Error: DATABASE_URL is not set in the environment or .env file.');
    process.exit(1);
}

// Use the path directly (better-sqlite3 handles relative paths)
const sqlitePath = dbPath;
console.log(`Using database path: ${sqlitePath}`);
const migrationSqlPath = path.join(__dirname, 'drizzle', '0001_goofy_switch.sql');
// --- End Configuration ---

try {
    console.log(`Reading migration file: ${migrationSqlPath}`);
    const sqlContent = fs.readFileSync(migrationSqlPath, 'utf8');

    // Split SQL statements based on the delimiter Drizzle uses
    const statements = sqlContent.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s.length > 0);

    if (statements.length === 0) {
        console.log('No statements found in the migration file. Exiting.');
        process.exit(0);
    }

    console.log(`Connecting to database: ${sqlitePath}`);
    const db = new Database(sqlitePath); // verbose: console.log }); // Enable verbose logging if needed

    console.log(`Found ${statements.length} statement(s) to execute.`);

    // Execute statements within a transaction
    db.transaction(() => {
        statements.forEach((statement, index) => {
            console.log(`Executing statement ${index + 1}/${statements.length}:`);
            console.log(statement);
            try {
                db.prepare(statement).run();
                console.log(`Statement ${index + 1} executed successfully.`);
            } catch (err) {
                console.error(`Error executing statement ${index + 1}:`, err);
                // Re-throw the error to trigger transaction rollback
                throw err;
            }
        });
    })();

    console.log('Migration applied successfully!');
    db.close();
    console.log('Database connection closed.');

} catch (error) {
    console.error('Failed to apply migration:', error);
    process.exit(1);
}
