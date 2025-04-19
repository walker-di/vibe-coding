import { error, type ServerLoad } from '@sveltejs/kit'; // Correct type is ServerLoad
import { db } from '$lib/server/db';
import { scenes } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: ServerLoad = async ({ params }) => { // Correctly destructure params from ServerLoadEvent
	const sceneIdParam = params.id; // params.id will be string | undefined here

	if (sceneIdParam === 'new') {
		// Prepare data for a new scene
		return {
			scene: null, // Indicate it's a new scene
            isNew: true,
		};
	}

    // Although SvelteKit routing should ensure id is defined here,
    // TypeScript needs explicit handling.
    if (sceneIdParam === undefined) {
        throw error(400, 'Scene ID is missing');
    }

	const sceneId = parseInt(sceneIdParam, 10);
	if (isNaN(sceneId)) {
		throw error(400, 'Invalid scene ID format');
	}

	try {
		// Fetch the existing scene and its related objects
		const sceneData = await db.query.scenes.findFirst({
			where: eq(scenes.id, sceneId),
			with: {
				objects: true, // Eager load objects using the defined relation
			},
		});

		if (!sceneData) {
			throw error(404, 'Scene not found');
		}

		// Ensure objects array exists, even if empty
		const sceneResult = {
			...sceneData,
			objects: sceneData.objects ?? [],
		};

		return {
			scene: sceneResult,
            isNew: false,
		};

	} catch (err: any) {
		console.error(`Error loading scene ${sceneId}:`, err);
		if (err.status) { // Re-throw SvelteKit errors
			throw err;
		}
		throw error(500, 'Failed to load scene data');
	}
};
