import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db'; // Direct DB access might be simpler here than internal fetch
import { eotsTable } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// Load EOTs for the logged-in user
export const load: PageServerLoad = async ({ locals, fetch }) => {
	if (!locals.user) {
		redirect(302, '/login'); // Redirect if not logged in
	}

	const userId = locals.user.id;

	// Option 1: Direct DB query (simpler for server load)
	try {
		const userEots = await db.query.eotsTable.findMany({
			where: eq(eotsTable.userId, userId),
			orderBy: [desc(eotsTable.createdAt)]
		});
		return { eots: userEots };
	} catch (e) {
		console.error('Error loading EOTs:', e);
		error(500, 'Failed to load EOTs');
	} // <-- Missing brace was here

	// Option 2: Internal Fetch (demonstrates API usage, but slightly more complex)
	/*
	try {
		const response = await fetch('/api/eots'); // Use internal fetch
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ message: 'Failed to fetch EOTs' }));
			error(response.status, errorData.message || 'Failed to fetch EOTs');
		}
		const eots = await response.json();
		return { eots };
	} catch (e) {
		console.error('Error fetching EOTs via API:', e);
		error(500, 'Failed to load EOTs');
	}
	*/
};

export const actions: Actions = {
	// Action to create a new EOT
	create: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}
		const userId = locals.user.id;
		const formData = await request.formData();

		const videoUrl = formData.get('videoUrl');
		const activity = formData.get('activity');
		const location = formData.get('location');
		// Add other fields like recordedAt, recordedBy if needed in the form

		if (!videoUrl || typeof videoUrl !== 'string') {
			return fail(400, { error: 'Video URL is required', videoUrl, activity, location });
		}
		if (!activity || typeof activity !== 'string') {
			return fail(400, { error: 'Activity is required', videoUrl, activity, location });
		}

		try {
			await db.insert(eotsTable).values({
				id: createId(),
				userId: userId,
				videoUrl: videoUrl,
				activity: activity,
				location: location as string | undefined // Cast as optional
				// Add other fields here
			});
			// No need to return data on success, load function will refetch
			return { success: true };
		} catch (e) {
			console.error('Error creating EOT:', e);
			return fail(500, { error: 'Failed to create EOT', videoUrl, activity, location });
		}
	},

	// Action to delete an EOT
	delete: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}
		const userId = locals.user.id;
		const formData = await request.formData();
		const eotId = formData.get('eotId');

		if (!eotId || typeof eotId !== 'string') {
			return fail(400, { error: 'Invalid EOT ID' });
		}

		try {
			// Verify ownership and delete
			const result = await db
				.delete(eotsTable)
				.where(and(eq(eotsTable.id, eotId), eq(eotsTable.userId, userId)));

			// Check if a row was actually deleted (better-sqlite3 might return changes > 0)
			// console.log(result); // Inspect result if needed
			// if (result.? === 0) { // Check based on driver specifics
			// 	return fail(404, { error: 'EOT not found or not owned by user' });
			// }

			return { success: true }; // Reload will update the list
		} catch (e) {
			console.error('Error deleting EOT:', e);
			return fail(500, { error: 'Failed to delete EOT' });
		}
	}
};
