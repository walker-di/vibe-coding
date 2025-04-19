import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { scenes, sceneObjects, type SceneObjectJsonData } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/scenes - List all scenes (metadata only)
export const GET: RequestHandler = async () => {
	try {
		const allScenes = await db.select({
            id: scenes.id,
            name: scenes.name,
            createdAt: scenes.createdAt,
            updatedAt: scenes.updatedAt
        }).from(scenes).orderBy(scenes.createdAt);
		return json(allScenes);
	} catch (err) {
		console.error('Error fetching scenes:', err);
		throw error(500, 'Failed to fetch scenes');
	}
};

// POST /api/scenes - Create a new scene (optionally with objects)
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const sceneName = body.name;
		const objectsPayload: { data: SceneObjectJsonData }[] = body.objects ?? []; // Expect objects to be { data: {...} }

		if (!sceneName || typeof sceneName !== 'string' || sceneName.trim() === '') {
			throw error(400, 'Scene name is required');
		}

        // Validate objects payload structure (basic check)
        if (!Array.isArray(objectsPayload)) {
             throw error(400, 'Invalid objects format. Expected an array.');
        }
        for (const obj of objectsPayload) {
            if (!obj.data || typeof obj.data !== 'object' || !obj.data.type || !obj.data.data) {
                 throw error(400, `Invalid object data structure: ${JSON.stringify(obj)}`);
            }
            // TODO: Add more specific validation based on obj.data.type if needed
        }


		// Use a transaction to insert scene and its objects
		const newScene = await db.transaction(async (tx) => {
			// Insert the scene
			const [insertedScene] = await tx
				.insert(scenes)
				.values({ name: sceneName.trim() })
				.returning();

			if (!insertedScene) {
				tx.rollback(); // Explicit rollback needed in older Drizzle versions? Check docs. Usually implicit on error.
				throw new Error('Failed to insert scene'); // Will cause transaction rollback
			}

			// Insert objects if provided
			if (objectsPayload.length > 0) {
                const objectsToInsert = objectsPayload.map(obj => ({
                    sceneId: insertedScene.id,
                    data: obj.data // Directly use the validated data part
                }));

				await tx.insert(sceneObjects).values(objectsToInsert);
			}

			// Re-fetch the scene with objects to return the complete data
            // Note: Drizzle doesn't easily return nested relations on insert/update in tx yet.
            // Fetching separately after commit might be simpler, or just return the scene metadata.
            // Let's return the full scene data by fetching after insert.
            const finalScene = await tx.query.scenes.findFirst({
                where: eq(scenes.id, insertedScene.id),
                with: {
                    objects: true
                }
            });

            if (!finalScene) {
                 throw new Error('Failed to fetch newly created scene with objects');
            }

			return finalScene;
		});


		return json(newScene, { status: 201 });

	} catch (err: any) {
		console.error('Error creating scene:', err);
		if (err.status) { // Re-throw SvelteKit errors
			throw err;
		}
		throw error(500, 'Failed to create scene');
	}
};
