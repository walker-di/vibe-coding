Okay, let's integrate 3D object uploads into the plan. This adds asset management to the project.

---

## Updated Plan: Lego-like Scene Builder with Custom 3D Models

Building upon the previous plan, we add the capability to upload and use custom 3D models.

### 1. Core Concepts (Further Revised)

*   **Scene:** Collection of `SceneObject`s.
*   **SceneObject:** Represents an entity in the scene, linked to an uploaded 3D model or using basic primitive geometry. Has position, rotation, scale, and type-specific data.
*   **Object Types:** Static, Physical, Item, Weapon, Player - these now *use* an uploaded model or a built-in shape.
*   **Uploaded Model:** A 3D model file (like `.glb`, `.obj`) uploaded by the user. Stored on the server's filesystem and referenced in the database.
*   **Asset Management:** The process of uploading, storing, listing, and serving 3D models.
*   **3D Environment & Physics:** Three.js renders visuals, physics engine (Cannon-es/Rapier) handles interactions. Collision shapes for custom models need consideration (basic primitives or derived shapes).
*   **Player Control & Camera:** As before, but players can now use custom models.
*   **Local Storage:** SQLite via Drizzle for scene and uploaded model metadata. File system for model binary data.

### 2. Technology Stack (Extended)

*   **Framework:** SvelteKit
*   **UI:** Svelte 5 (runes)
*   **3D Rendering:** Three.js
*   **Three.js Loaders:** `GLTFLoader`, `OBJLoader`, etc.
*   **Physics Engine:** Cannon-es or Rapier (client-side)
*   **Database ORM:** Drizzle ORM
*   **Database:** SQLite (`better-sqlite3` for server routes).
*   **File System Access:** Node.js `fs` module (used in server routes).
*   **Type Safety:** TypeScript

### 3. Sitemap (Extended)

*   **`/` (Scenes List Page):**
    *   List of saved scenes.
    *   "New Scene" button.
    *   Load/Delete scene actions.
    *   *(Optional)* "Manage Models" button/link to a dedicated asset management page if it grows complex, but let's integrate upload into the scene editor initially for simplicity.

*   **`/scene/[id]` (Scene Page - Editor & Player):**
    *   Loads/creates a scene.
    *   **Modes:** Editor, Player.
    *   **Editor Mode:**
        *   3D Viewport.
        *   **Object Creation/Editing UI:**
            *   Select Object Type (Static, Physical, Player, etc.).
            *   **Model Selector:** A UI element (dropdown, modal, sidebar) to browse and select *uploaded models* or *built-in primitives* for the current object. Fetches list from `/api/models`.
            *   **Model Upload Area:** Maybe a simple drag-and-drop or file input within the selector UI, or a link to an upload modal/page.
            *   Transform controls (move, rotate, scale).
            *   Type-specific property editor (mass for physical, health for player, etc.).
            *   Physics shape selection (e.g., Box, Sphere, or use Mesh/Convex Hull if supported and implemented) when using custom models for Physical/Player objects.
            *   Delete object.
        *   "Save Scene" button.
        *   "Play" button.
        *   "Back to List" button.
    *   **Player Mode:** As before (physics simulation, player control, camera switching). Objects now use their assigned 3D models.

### 4. Database Schema (Drizzle ORM - SQLite - Added `uploadedModels` table)

```typescript
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
	primitiveType?: 'box' | 'sphere' | 'cylinder'; // Use if no modelId
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
```

*   **`uploadedModels` table:** Stores metadata for each uploaded file. `storagePath` is key.
*   **`sceneObjects.data`:** The `BaseObjectData` now includes `modelId?: number;` which references `uploadedModels.id`, or `primitiveType?: ...` if no custom model is used. `PhysicalObjectData` and `PlayerData` gain a `collisionShape` property to define physics behavior independent of the visual model.

### 5. API Routes (Extended - Added Model Routes)

*   **Scene Routes (`src/routes/api/scenes/+server.ts`):**
    *   `GET /api/scenes`: List scenes.
    *   `GET /api/scenes/:id`: Get single scene *and* its objects. (No change in functionality, but now objects reference `modelId`).
    *   `POST /api/scenes`: Create scene with objects.
    *   `PUT /api/scenes/:id`: Update scene with objects.
    *   `DELETE /api/scenes/:id`: Delete scene and objects (cascading delete).

*   **Model Routes (`src/routes/api/models/+server.ts`):**
    *   `POST /api/models/upload`:
        *   **Purpose:** Receive and store an uploaded 3D model file.
        *   **Request:** `POST` request with `FormData` containing the file.
        *   **Response:** `201 Created` with the new model's metadata `{ id, name, storagePath, ... }` or `400/500` on error.
        *   **Server Logic:** Use `request.formData()`. Get the file. Validate file type/size (optional but recommended). Generate a unique safe filename and a path within your designated uploads directory (e.g., using `path` and `crypto` modules). Save the file using `fs.writeFile` or streams. Insert metadata (`originalFilename`, `storagePath`, `mimeType`, `size`, `name` - maybe derive name from filename or get from form data) into the `uploadedModels` table using Drizzle.
    *   `GET /api/models`:
        *   **Purpose:** Get a list of all uploaded models (metadata).
        *   **Request:** None.
        *   **Response:** `200 OK` with `[{ id, name, originalFilename, size, createdAt, ... }, ...]`. Does *not* send file data.
        *   **DB:** `db.select().from(uploadedModels).all()`.
    *   `GET /api/models/:id/file`:
        *   **Purpose:** Serve the actual 3D model file data.
        *   **Request:** URL parameter `:id`.
        *   **Response:** `200 OK` with the file content and `Content-Type` header set correctly (using `mimeType` from DB), or `404 Not Found`.
        *   **Server Logic:** Get `id` from params. Look up model in `uploadedModels` table. If found, read the file from `storagePath` using `fs.readFile`. Set the `Content-Type` header. Return the file buffer/stream. *Crucially*, sanitize the `storagePath` retrieved from the DB or ensure the logic can *only* read from the designated uploads directory to prevent path traversal vulnerabilities.
    *   `DELETE /api/models/:id`:
        *   **Purpose:** Delete an uploaded model file and its database record.
        *   **Request:** URL parameter `:id`.
        *   **Response:** `200 OK` (or 204) or `404 Not Found`.
        *   **Server Logic:** Get `id`. Look up model in `uploadedModels`. If found, get `storagePath`. Delete the file using `fs.unlink`. Delete the record from `uploadedModels` using Drizzle. *Consideration:* What happens to `sceneObjects` that referenced this model? They will effectively become invalid or rely on fallback logic (e.g., render a red box). You might add a check here to prevent deleting models that are still used, or add a `onDelete: 'SET NULL'` to a formal ForeignKey if you restructure schema. With JSON data, you'd need to manually check scenes for references before allowing deletion, or handle missing models client-side. Handling missing models client-side is simpler initially.

### 6. Core Logic Flow (Integration Points)

*   **Frontend - Scene Page (Editor):**
    *   Fetch the list of uploaded models on mount or when the Model Selector is opened (`GET /api/models`). Store this list in Svelte `$state`.
    *   Implement the Model Selector UI, populating it with the names from the fetched list. Add a "Built-in Primitives" option.
    *   Implement the file upload UI and handle submitting `FormData` to `POST /api/models/upload`. On success, add the new model to the local `$state` list of models and potentially select it.
    *   When creating or editing a `SceneObject`, update its `modelId` or `primitiveType` based on the user's selection in the Model Selector. If `modelId` is set, prompt/allow selection of `collisionShape` for physical objects.
*   **Frontend - Scene Page (Loading):**
    *   When loading a scene: Iterate through `scene.objects`.
    *   If an object has `primitiveType`, create Three.js geometry (BoxGeometry, SphereGeometry, etc.) and physics shape accordingly.
    *   If an object has `modelId`:
        *   Check if the model is already loaded/cached.
        *   If not, fetch the model file data from `GET /api/models/[modelId]/file`.
        *   Use the appropriate Three.js loader (e.g., `GLTFLoader`) to parse the data and create the visual mesh. Handle loading errors (e.g., display a fallback).
        *   Based on the object's `collisionShape` property, create the corresponding physics shape (e.g., `new Box()` or `new Sphere()`). If `collisionShape` is 'hull' or 'mesh' and you've implemented that, generate it from the loaded geometry.
        *   Create the physics body.
        *   Add the mesh to the Three.js scene and the body to the physics world. Link them.
*   **Frontend - Scene Page (Saving):** Ensure the `$state.scene.objects` array correctly includes the `modelId` or `primitiveType` and `collisionShape` for each object before sending to the PUT/POST /api/scenes endpoint.

### 7. Key Considerations (Added Asset Management)

*   **3D Model Loading:** Three.js loaders are asynchronous. You need to manage loading states and potentially cache loaded geometries/materials if the same model is used multiple times.
*   **File Storage Security:** The directory where models are stored on the server must be outside the public `static` directory. Access should only be via the authenticated (if applicable) and validated `GET /api/models/:id/file` endpoint. Sanitize user-provided filenames and database paths strictly.
*   **Supported Formats:** Start with `.glb` as it's efficient and well-supported by Three.js. Add other formats (like `.obj`) if necessary, requiring different loaders.
*   **Collision Shapes for Custom Models:** This is complex. Implementing 'hull' or 'mesh' collision shapes requires significant effort and understanding of the physics engine. Starting with allowing users to select a primitive shape (Box, Sphere) that approximates their model when placing a 'physical' or 'player' object using a custom model is highly recommended for initial implementation. The `collisionShape` property in your schema and state is designed to accommodate this.
*   **Scalability of Local Storage:** SQLite and local file storage are great for a single-user local application. If you ever wanted multi-user or cloud deployment, this storage strategy would need significant changes.
*   **Model Previews:** For a better user experience in the Model Selector UI, generating small preview images when a model is uploaded (server-side, possibly requiring additional libraries) is a common feature, but adds complexity.

### 8. Next Steps (Incorporating Upload)

Steps 1-7 from the previous plan (Setup, DB config, Schema, API routes for Scenes, List Page, Scene Page basics) remain valid. Then:

8.  **Update DB Schema:** Add the `uploadedModels` table and relations. Update `SceneObjectJsonData` types (`BaseObjectData`, `PhysicalObjectData`, `PlayerData`) to include `modelId`, `primitiveType`, and `collisionShape`. Run Drizzle migrations.
9.  **Implement Model API Routes:** Create `src/routes/api/models/+server.ts` and implement the `POST /upload`, `GET /`, `GET /:id/file`, and `DELETE /:id` endpoints using Drizzle and Node.js `fs`. Set up a dedicated uploads directory.
10. **Enhance Scene Page (Editor UI):**
    *   Fetch the list of models using `GET /api/models` and store it.
    *   Implement the Model Selector UI component (displaying the list).
    *   Add basic UI for selecting `collisionShape` when relevant object types and custom models are chosen.
    *   Implement the file upload form/area within or linked from the editor, calling `POST /api/models/upload`.
11. **Enhance Scene Page (3D Logic):**
    *   Modify the object loading logic (when scene data arrives) to handle both `primitiveType` (create simple geometry) and `modelId` (fetch from `GET /api/models/[modelId]/file` using Three.js loaders). Implement caching for loaded geometries/materials.
    *   Modify the physics body creation logic to use the `collisionShape` property, generating the appropriate physics shape (Box, Sphere, Capsule, Hull/Mesh if implemented).
12. **Refine Interaction:** Ensure object selection, movement, saving correctly handle and persist the `modelId`/`primitiveType` and `collisionShape`.
13. **Add Error Handling:** Handle file upload errors, model loading errors (e.g., missing file on server, invalid file format), display fallback objects.
14. **Polish:** Add visual feedback for selected objects, better transform controls, grid helper, snapping, advanced physics shapes, player animations (linked to model).

This revised plan provides a clear path to adding custom 3D model uploads and integration into your scene builder, keeping in mind the complexities of asset management and physics.