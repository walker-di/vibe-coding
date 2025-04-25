// Re-exporting or redefining types for frontend usage
// This avoids directly importing server-only schema code into the client bundle

// Import the original types from the schema
import type {
	SceneObjectType as SchemaSceneObjectType,
	BaseObjectData as SchemaBaseObjectData,
	StaticObjectData as SchemaStaticObjectData,
	PhysicalObjectData as SchemaPhysicalObjectData,
	ItemData as SchemaItemData,
	WeaponData as SchemaWeaponData,
	PlayerData as SchemaPlayerData,
	SpecificObjectPayload as SchemaSpecificObjectPayload,
	SceneObjectJsonData as SchemaSceneObjectJsonData,
} from './server/db/schema';

// Re-export or redefine types for frontend consumption
export type SceneObjectType = SchemaSceneObjectType;
export type BaseObjectData = SchemaBaseObjectData;
export type StaticObjectData = SchemaStaticObjectData;
export type PhysicalObjectData = SchemaPhysicalObjectData;
export type ItemData = SchemaItemData;
export type WeaponData = SchemaWeaponData;
export type PlayerData = SchemaPlayerData;
export type SpecificObjectPayload = SchemaSpecificObjectPayload;
export type SceneObjectJsonData = SchemaSceneObjectJsonData;

// Define the type for the data structure of scene objects as stored in the DB
// (matching the structure within the JSON blob)
export type SceneObjectRecord = {
	id: number;
	sceneId: number;
	data: SceneObjectJsonData;
};

// Define the type for the full scene data structure including objects
export type SceneData = {
	id: number;
	name: string;
	createdAt?: Date; // Drizzle maps timestamp to Date by default
	updatedAt?: Date;
	objects: SceneObjectRecord[];
};

// Define the type for uploaded model metadata
export type UploadedModel = {
	id: number;
	name: string;
	originalFilename: string;
	storagePath: string; // Path relative to project root (e.g., 'static/uploads/models/model.glb')
	mimeType: string | null;
	size: number | null;
	createdAt: Date; // Drizzle maps timestamp to Date by default
};
