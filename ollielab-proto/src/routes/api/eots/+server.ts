import { json, error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eotsTable } from '$lib/server/db/schema';
import { createId } from '@paralleldrive/cuid2'; // Already in schema, but good practice if needed here

import type { RequestHandler } from './$types';

// POST /api/eots - Create a new EOT
export const POST: RequestHandler = async ({ request, locals }) => {
	// 1. Check Authentication
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	// 2. Parse Request Body
	let data;
	try {
		data = await request.json();
	} catch (e) {
		error(400, 'Invalid JSON body');
	}

	// 3. Validate Input Data (Basic Example)
	const { videoUrl, recordedAt, recordedBy, activity, location, thumbnailUrl } = data;

	if (!videoUrl || typeof videoUrl !== 'string') {
		return json({ error: 'Missing or invalid videoUrl' }, { status: 400 });
	}
	// Add more specific validation as needed for other fields
	// Ensure recordedAt is a valid timestamp format if provided, etc.

	// 4. Insert into Database
	const newEotId = createId();
	const userId = locals.user.id; // Get user ID from session

	try {
		const [createdEot] = await db
			.insert(eotsTable)
			.values({
				id: newEotId,
				userId: userId,
				videoUrl: videoUrl,
				thumbnailUrl: thumbnailUrl, // Optional
				recordedAt: recordedAt ? Math.floor(new Date(recordedAt).getTime() / 1000) : null, // Store as Unix timestamp
				recordedBy: recordedBy,
				activity: activity,
				location: location
				// createdAt and updatedAt have default values in schema
			})
			.returning(); // Return the created record

		if (!createdEot) {
			error(500, 'Failed to create EOT record');
		}

		// 5. Return Response
		return json(createdEot, { status: 201 }); // 201 Created

	} catch (e) {
		console.error('Error creating EOT:', e);
		error(500, 'Internal Server Error');
	}
};

// GET /api/eots - List EOTs for the current user
export const GET: RequestHandler = async ({ locals }) => {
	// 1. Check Authentication
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const userId = locals.user.id;

	try {
		// 2. Query Database
		const userEots = await db.query.eotsTable.findMany({
			where: (eots, { eq }) => eq(eots.userId, userId),
			orderBy: (eots, { desc }) => [desc(eots.createdAt)] // Order by newest first
		});

		// 3. Return Response
		return json(userEots);

	} catch (e) {
		console.error('Error fetching EOTs:', e);
		error(500, 'Internal Server Error');
	} // <-- Missing brace was here
};
