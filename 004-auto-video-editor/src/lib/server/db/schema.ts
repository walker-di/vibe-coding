import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const projects = sqliteTable('projects', {
	// Using text for UUID as SQLite doesn't have a native UUID type.
	// We'll generate the UUID in the application code before insertion.
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	// Storing timestamps as Unix epoch integers.
	// Using sql`(unixepoch())` for default value which returns seconds since 1970-01-01.
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(cast(strftime('%s', 'now') as integer) * 1000)`), // milliseconds
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(cast(strftime('%s', 'now') as integer) * 1000)`) // milliseconds
	// userId: text('user_id') // Optional: Add later if user accounts are implemented
});

// Example of how to define relations if needed later:
// export const usersRelations = relations(users, ({ many }) => ({
//  posts: many(posts),
// }));
