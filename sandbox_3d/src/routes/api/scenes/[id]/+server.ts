import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { scenes, sceneObjects, type SceneObjectJsonData } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

// GET /api/scenes/:id - Get a single scene with its objects
export const GET: RequestHandler = async ({ params }) => {
	const sceneId = parseInt(params.id ?? '', 10);
	if (isNaN(sceneId)) {
		throw error(400, 'Invalid scene ID');
	}

	try {
		const sceneData = await db.query.scenes.findFirst({
			where: eq(scenes.id, sceneId),
			with: {
				objects: true, // Eager load objects
			},
		});

		if (!sceneData) {
			throw error(404, 'Scene not found');
		}

        // Ensure objects array exists
        const result = {
            ...sceneData,
            objects: sceneData.objects ?? []
        };

		return json(result);

	} catch (err: any) {
		console.error(`Error fetching scene ${sceneId}:`, err);
		if (err.status) {
			throw err;
		}
		throw error(500, 'Failed to fetch scene');
	}
};

// PUT /api/scenes/:id - Update a scene (name and objects)
export const PUT: RequestHandler = async ({ params, request }) => {
	const sceneId = parseInt(params.id ?? '', 10);
	if (isNaN(sceneId)) {
		throw error(400, 'Invalid scene ID');
	}

	try {
		const body = await request.json();
		const sceneName = body.name;
        // Expect objects to be the full SceneObjectRecord structure from the client state,
        // but we only need the 'data' part for insertion.
		const objectsPayload: { data: SceneObjectJsonData }[] = body.objects ?? [];

		if (!sceneName || typeof sceneName !== 'string' || sceneName.trim() === '') {
			throw error(400, 'Scene name is required');
		}
        // Basic validation for objects payload
        if (!Array.isArray(objectsPayload)) {
             throw error(400, 'Invalid objects format. Expected an array.');
        }
         for (const obj of objectsPayload) {
            if (!obj.data || typeof obj.data !== 'object' || !obj.data.type || !obj.data.data) {
                 throw error(400, `Invalid object data structure in update: ${JSON.stringify(obj)}`);
            }
            // TODO: Add more specific validation based on obj.data.type if needed
        }


		const updatedScene = await db.transaction(async (tx) => {
			// 1. Update scene name and updatedAt timestamp
			const [updatedSceneMeta] = await tx
				.update(scenes)
				.set({
                    name: sceneName.trim(),
                    updatedAt: sql`CURRENT_TIMESTAMP` // Update timestamp
                 })
				.where(eq(scenes.id, sceneId))
                .returning({ id: scenes.id, name: scenes.name, updatedAt: scenes.updatedAt }); // Return updated fields

            if (!updatedSceneMeta) {
                throw error(404, 'Scene not found for update'); // Scene might have been deleted between check and update
            }

			// 2. Delete existing objects for this scene
            // Cascading delete should handle this if the relation is set up correctly,
            // but explicit deletion is safer if unsure or for fine-grained control.
            // Let's rely on the cascade for now as defined in schema.ts (onDelete: 'cascade')
            // If cascade wasn't set, we'd do: await tx.delete(sceneObjects).where(eq(sceneObjects.sceneId, sceneId));
            // Correction: The cascade applies when the *scene* is deleted. We need to manually delete objects when *updating* the scene's objects.
            await tx.delete(sceneObjects).where(eq(sceneObjects.sceneId, sceneId));


			// 3. Insert new objects if provided
			if (objectsPayload.length > 0) {
                 const objectsToInsert = objectsPayload.map(obj => ({
                    sceneId: sceneId, // Use the existing sceneId
                    data: obj.data // Use the data part
                }));
				await tx.insert(sceneObjects).values(objectsToInsert);
			}

            // 4. Fetch the final updated scene with objects
            const finalScene = await tx.query.scenes.findFirst({
                where: eq(scenes.id, sceneId),
                with: {
                    objects: true
                }
            });

             if (!finalScene) {
                 throw new Error('Failed to fetch updated scene with objects');
            }

			return finalScene;
		});

		return json(updatedScene);

	} catch (err: any) {
		console.error(`Error updating scene ${sceneId}:`, err);
		if (err.status) {
			throw err;
		}
		throw error(500, 'Failed to update scene');
	}
};

// DELETE /api/scenes/:id - Delete a scene and its objects
export const DELETE: RequestHandler = async ({ params }) => {
	const sceneId = parseInt(params.id ?? '', 10);
	if (isNaN(sceneId)) {
		throw error(400, 'Invalid scene ID');
	}

	try {
        // Drizzle doesn't automatically check if the row exists before deleting,
        // but it returns the deleted rows. We check the result length.
		const deleteResult = await db.delete(scenes).where(eq(scenes.id, sceneId)).returning({ id: scenes.id });

        if (deleteResult.length === 0) {
            throw error(404, 'Scene not found');
        }

        // The 'onDelete: cascade' in schema.ts should handle deleting associated sceneObjects automatically.

		return new Response(null, { status: 204 }); // No Content success status

	} catch (err: any) {
		console.error(`Error deleting scene ${sceneId}:`, err);
		if (err.status) {
			throw err;
		}
		throw error(500, 'Failed to delete scene');
	}
};
