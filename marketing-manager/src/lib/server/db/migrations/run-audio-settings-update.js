const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Path to the database file
const dbPath = path.join(__dirname, '../../../../data/marketing-manager.db');

// Path to the SQL migration file
const sqlPath = path.join(__dirname, 'update-audio-settings.sql');

// Read the SQL file
const sql = fs.readFileSync(sqlPath, 'utf8');

// Connect to the database
const db = new sqlite3.Database(dbPath);

// Execute the SQL statements
db.exec(sql, (err) => {
  if (err) {
    console.error('Error executing SQL:', err);
    process.exit(1);
  }
  
  console.log('Audio settings update migration completed successfully');
  
  // Close the database connection
  db.close();
});
