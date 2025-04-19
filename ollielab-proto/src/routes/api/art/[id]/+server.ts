import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { generatedArtTable } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

import type { RequestHandler } from './$types';

// GET /api/art/{id} - Get status and result of an art generation job
export const GET: RequestHandler = async ({ params, locals }) => {
	// 1. Check Authentication
	if (!locals.user) {
		error(401, 'Unauthorized');
	}
	const userId = locals.user.id;
	const artId = params.id;

	if (!artId) {
		error(400, 'Art ID is required');
	}

	// 2. Query Database
	try {
		const artRecord = await db.query.generatedArtTable.findFirst({
			where: and(eq(generatedArtTable.id, artId), eq(generatedArtTable.userId, userId))
			// Optionally add relations here if needed, e.g., with eot: true
		});

		if (!artRecord) {
			error(404, 'Art generation record not found or not owned by user');
		}

		// --- Simulation Placeholder ---
		// In a real app, if status is 'pending', you might check an external job queue.
		// If 'completed', ensure the imageUrl is present.
		// For now, we just return the record as is.
		// You could add mock logic here to randomly "complete" a pending job after some time:
		/*
		if (artRecord.status === 'pending' && Math.random() > 0.5) {
			// Simulate completion
			const [updatedRecord] = await db.update(generatedArtTable)
				.set({ status: 'completed', imageUrl: `/placeholder-art/${artId}.png` }) // Example URL
				.where(eq(generatedArtTable.id, artId))
				.returning();
			return json(updatedRecord || artRecord);
		}
		*/
		// -----------------------------


		// 3. Return Response
		return json(artRecord);

	} catch (e: any) {
		// Handle potential errors from DB query or simulated completion
		if (e.status) {
			error(e.status, e.body.message);
		}
		console.error(`Error fetching art record ${artId}:`, e);
		error(500, 'Internal Server Error');
	}
};

// Optional: Add PUT/DELETE handlers if needed to update/cancel generation jobs
