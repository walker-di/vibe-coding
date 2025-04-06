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
		.default(sql`(cast(strftime('%s', 'now') as integer) * 1000)`), // milliseconds
	// userId: text('user_id'), // Optional: Add later if user accounts are implemented
	// Store timeline state as a JSON string
	timeline: text('timeline')
});

export const media = sqliteTable('media', {
	id: text('id').primaryKey(), // UUID generated in code
	projectId: text('project_id')
		.notNull()
		.references(() => projects.id, { onDelete: 'cascade' }), // Foreign key to projects
	name: text('name').notNull(), // Original filename or user-defined
	type: text('type', { enum: ['video', 'audio'] }).notNull(),
	// Store the path relative to the static dir, e.g., '/uploads/projectId/filename.mp4'
	// The actual storage location (local vs cloud) might change, but the path stored can remain consistent.
	sourcePath: text('source_path').notNull(),
	thumbnailUrl: text('thumbnail_url'), // Optional: URL to the generated thumbnail
	duration: integer('duration'), // Duration in seconds (optional for now)
	uploadedAt: integer('uploaded_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(cast(strftime('%s', 'now') as integer) * 1000)`), // milliseconds
	// metadata: text('metadata'), // Store as JSON string if needed later
});


// Example of how to define relations if needed later:
// export const projectsRelations = relations(projects, ({ many }) => ({
//   mediaItems: many(media),
// }));

// export const mediaRelations = relations(media, ({ one }) => ({
//   project: one(projects, {
//     fields: [media.projectId],
//     references: [projects.id],
//   }),
// }));
