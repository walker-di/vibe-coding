// src/lib/db/schema.ts
import { sqliteTable, integer, text, blob } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm'; // Need relations

// --- Define Object Data Types (Refined model reference) ---
export type SceneObjectType = 'static' | 'physical' | 'item' | 'weapon' | 'player';

export type BaseObjectData = {
	x: number;
	y: number;
	z: number;
	rx?: number; // Rotation
	ry?: number;
	rz?: number;
	qx?: number; // Quaternion
	qy?: number;
	qz?: number;
	qw?: number;
	sx?: number; // Scale
	sy?: number;
	sz?: number;
	// Reference to an uploaded model ID or a built-in primitive key
	modelId?: number; // Foreign key to uploadedModels.id
	primitiveType?: 'box' | 'sphere' | 'cylinder' | 'capsule'; // Use if no modelId
	color?: string; // Simple color for primitives
};

// Type-specific data structures (will be stored within the 'data' JSON column)
export type StaticObjectData = BaseObjectData & { /* ... */ };
export type PhysicalObjectData = BaseObjectData & {
	mass: number;
	// How the physics engine represents this object's collision
	// This is crucial when using a custom model (modelId is set)
	collisionShape: 'box' | 'sphere' | 'capsule' | 'hull' | 'mesh'; // Hull/Mesh are advanced
	// Add physics properties
};
// Item, Weapon, Player Data types remain similar, extended with collisionShape if they are physical
export type ItemData = BaseObjectData & { itemId: string; quantity?: number; collisionShape?: 'box' | 'sphere' | 'capsule' | 'hull' | 'mesh'; /* ... */ };
export type WeaponData = ItemData & { damage: number; attackRate: number; collisionShape?: 'box' | 'sphere' | 'capsule' | 'hull' | 'mesh'; /* ... */ };
export type PlayerData = BaseObjectData & {
	name: string;
	health: number;
	maxHealth: number;
	isControllable: boolean;
	collisionShape: 'box' | 'sphere' | 'capsule' | 'hull'; // Players typically use simpler shapes
	// Add inventory, equipment
};


export type SpecificObjectPayload = StaticObjectData | PhysicalObjectData | ItemData | WeaponData | PlayerData;

export type SceneObjectJsonData = {
	type: SceneObjectType;
	data: SpecificObjectPayload;
};


// --- Define Drizzle Schema ---

export const scenes = sqliteTable('scenes', {
	id: integer('id').primaryKey(),
	name: text('name').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const sceneObjects = sqliteTable('scene_objects', {
	id: integer('id').primaryKey(),
	sceneId: integer('scene_id').references(() => scenes.id, { onDelete: 'cascade' }).notNull(),
	data: blob('data', { mode: 'json' }).$type<SceneObjectJsonData>().notNull(),
});

// NEW TABLE for uploaded models
export const uploadedModels = sqliteTable('uploaded_models', {
	id: integer('id').primaryKey(),
	name: text('name').notNull(), // User-provided or derived name
	originalFilename: text('original_filename').notNull(),
	storagePath: text('storage_path').notNull(), // Path on the server file system
	mimeType: text('mime_type'),
	size: integer('size'), // File size in bytes
	createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});


// Define relations
export const scenesRelations = relations(scenes, ({ many }) => ({
	objects: many(sceneObjects),
}));

export const sceneObjectsRelations = relations(sceneObjects, ({ one }) => ({
	scene: one(scenes, { fields: [sceneObjects.sceneId], references: [scenes.id] }),
	// Relation to the model if modelId is used (requires modelId to be a proper FK,
	// but since it's in the JSON data, a direct Drizzle relation isn't clean.
	// You'll join manually or fetch separately)
	// model: one(uploadedModels, { fields: [sceneObjects.data.modelId], references: [uploadedModels.id] }) // Drizzle can't do this easily with JSON column
}));

export const uploadedModelsRelations = relations(uploadedModels, ({ }) => ({
	// No direct relation back to sceneObjects due to modelId being in JSON
}));
