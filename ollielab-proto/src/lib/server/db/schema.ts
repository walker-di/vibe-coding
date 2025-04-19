import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2'; // For generating EOT IDs

// --- Lucia Auth Tables ---

export const userTable = sqliteTable('user', {
	id: text('id').primaryKey(), // Lucia requires text ID
	email: text('email').notNull().unique(),
	name: text('name') // Optional: Add other user details here
	// Add other fields like email_verified if needed
});

export const sessionTable = sqliteTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => userTable.id),
	expiresAt: integer('expires_at').notNull() // Unix timestamp (seconds)
});

export const keyTable = sqliteTable('key', {
	id: text('id').primaryKey(), // Format: "provider:provider_user_id" e.g., "email:user@example.com"
	userId: text('user_id')
		.notNull()
		.references(() => userTable.id),
	hashedPassword: text('hashed_password') // Store hashed password if using password strategy
	// Add other fields if using different key providers (e.g., oauth tokens)
});

// --- Application Tables ---

export const eotsTable = sqliteTable('eots', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId()), // Use CUID2 for unique IDs
	userId: text('user_id')
		.notNull()
		.references(() => userTable.id, { onDelete: 'cascade' }), // Link to the user who captured it
	videoUrl: text('video_url').notNull(), // URL to the stored video file
	thumbnailUrl: text('thumbnail_url'), // Optional thumbnail image URL
	recordedAt: integer('recorded_at'), // The "When" (Unix timestamp)
	recordedBy: text('recorded_by'), // The "Who" (text field)
	activity: text('activity'), // The "What" (text field)
	location: text('location'), // The "Where" (text field)
	createdAt: integer('created_at')
		.notNull()
		.$defaultFn(() => Math.floor(Date.now() / 1000)), // Unix timestamp (seconds)
	updatedAt: integer('updated_at')
		.notNull()
		.$defaultFn(() => Math.floor(Date.now() / 1000)) // Unix timestamp (seconds)
		.$onUpdate(() => Math.floor(Date.now() / 1000)) // Update timestamp on modification
});

// --- Relations ---

export const userRelations = relations(userTable, ({ many }) => ({
	sessions: many(sessionTable),
	keys: many(keyTable),
	eots: many(eotsTable)
}));

export const sessionRelations = relations(sessionTable, ({ one }) => ({
	user: one(userTable, {
		fields: [sessionTable.userId],
		references: [userTable.id]
	})
}));

export const keyRelations = relations(keyTable, ({ one }) => ({
	user: one(userTable, {
		fields: [keyTable.userId],
		references: [userTable.id]
	})
}));

export const eotsRelations = relations(eotsTable, ({ one }) => ({
	user: one(userTable, {
		fields: [eotsTable.userId],
		references: [userTable.id]
	})
}));
