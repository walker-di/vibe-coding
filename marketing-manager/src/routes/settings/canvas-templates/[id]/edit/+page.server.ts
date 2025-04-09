import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { canvasTemplates } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		throw error(400, 'Invalid template ID');
	}

	try {
		const template = await db
			.select() // Select all fields, including canvasData
			.from(canvasTemplates)
			.where(eq(canvasTemplates.id, id))
			.limit(1);

		if (!template || template.length === 0) {
			throw error(404, 'Canvas template not found');
		}

		// Return the full template data, including canvasData
		return {
			template: template[0]
		};
	} catch (err: any) {
		console.error(`Error loading canvas template ${id} for edit:`, err);
		if (err.status) {
			throw err; // Re-throw SvelteKit errors
		}
		throw error(500, 'Failed to load canvas template for editing');
	}
};
