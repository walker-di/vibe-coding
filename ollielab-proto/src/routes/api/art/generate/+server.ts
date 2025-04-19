import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { generatedArtTable, eotsTable } from '$lib/server/db/schema';
import { createId } from '@paralleldrive/cuid2';
import { eq, and } from 'drizzle-orm';

import type { RequestHandler } from './$types';

// POST /api/art/generate - Initiate AI art generation
export const POST: RequestHandler = async ({ request, locals }) => {
	// 1. Check Authentication
	if (!locals.user) {
		error(401, 'Unauthorized');
	}
	const userId = locals.user.id;

	// 2. Parse Request Body
	let data;
	try {
		data = await request.json();
	} catch (e) {
		error(400, 'Invalid JSON body');
	}

	// 3. Validate Input Data
	const { eotId, prompt, style } = data;

	if (!prompt || typeof prompt !== 'string') {
		return json({ error: 'Missing or invalid prompt' }, { status: 400 });
	}
	// Add validation for style if needed

	// 4. Optional: Validate eotId if provided
	if (eotId) {
		if (typeof eotId !== 'string') {
			return json({ error: 'Invalid eotId format' }, { status: 400 });
		}
		// Check if the EOT exists and belongs to the user
		const eot = await db.query.eotsTable.findFirst({
			where: and(eq(eotsTable.id, eotId), eq(eotsTable.userId, userId))
		});
		if (!eot) {
			return json({ error: 'EOT not found or not owned by user' }, { status: 404 });
		}
	}

	// 5. Create Pending Record in Database
	const newArtId = createId();
	const initialStatus = 'pending'; // Start as pending

	try {
		const [createdArtRecord] = await db
			.insert(generatedArtTable)
			.values({
				id: newArtId,
				userId: userId,
				eotId: eotId || null, // Store null if not provided
				prompt: prompt,
				style: style,
				status: initialStatus
				// imageUrl will be updated later by the generation process
				// generatedAt has default value
			})
			.returning(); // Return the created record

		if (!createdArtRecord) {
			error(500, 'Failed to create art generation record');
		}

		// --- Simulation Placeholder ---
		// In a real app, trigger async AI generation here (e.g., queue a job)
		// For now, we just return the pending record.
		// -----------------------------

		// 6. Return Response (the pending record)
		return json(createdArtRecord, { status: 202 }); // 202 Accepted (indicates async processing started)

	} catch (e) {
		console.error('Error creating art generation record:', e);
		error(500, 'Internal Server Error');
	} // <-- Missing brace was here
};
