import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { scenes } from '$lib/server/db/schema';

// Define the expected structure of a scene item for the list
type SceneListItem = {
    id: number;
    name: string;
    createdAt: Date;
    updatedAt: Date;
};

export const load: PageServerLoad = async () => {
	try {
        // Fetch only necessary fields for the list view
		const sceneList: SceneListItem[] = await db.select({
            id: scenes.id,
            name: scenes.name,
            createdAt: scenes.createdAt,
            updatedAt: scenes.updatedAt
        })
        .from(scenes)
        .orderBy(scenes.updatedAt); // Order by most recently updated

		return {
            scenes: sceneList
        };
	} catch (err) {
		console.error('Error loading scene list:', err);
		// Don't crash the page, return an empty list or handle error gracefully
		// throw error(500, 'Failed to load scene list');
        return {
            scenes: [] as SceneListItem[],
            error: 'Failed to load scene list'
        };
	}
};
