import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eotsTable } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

import type { RequestHandler } from './$types';

// Helper function to get EOT and check ownership
async function getEotAndCheckOwnership(eotId: string, userId: string) {
	const eot = await db.query.eotsTable.findFirst({
		where: and(eq(eotsTable.id, eotId), eq(eotsTable.userId, userId))
	});
	if (!eot) {
		error(404, 'EOT not found or you do not have permission to access it');
	}
	return eot;
}

// GET /api/eots/{id} - Get details of a specific EOT
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}
	const eotId = params.id;
	const userId = locals.user.id;

	try {
		const eot = await getEotAndCheckOwnership(eotId, userId);
		return json(eot);
	} catch (e: any) {
		// Handle potential errors from getEotAndCheckOwnership (like 404)
		if (e.status) {
			error(e.status, e.body.message);
		}
		console.error(`Error fetching EOT ${eotId}:`, e);
		error(500, 'Internal Server Error');
	}
};

// PUT /api/eots/{id} - Update metadata of an EOT
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}
	const eotId = params.id;
	const userId = locals.user.id;

	// 1. Check ownership first
	await getEotAndCheckOwnership(eotId, userId); // Throws error if not found/owned

	// 2. Parse Request Body
	let data;
	try {
		data = await request.json();
	} catch (e) {
		error(400, 'Invalid JSON body');
	}

	// 3. Validate and Prepare Update Data (Allow updating specific fields)
	const { recordedAt, recordedBy, activity, location, thumbnailUrl } = data;
	const updateData: Partial<typeof eotsTable.$inferInsert> = {}; // Use Partial for updates

	if (recordedAt !== undefined) updateData.recordedAt = recordedAt ? Math.floor(new Date(recordedAt).getTime() / 1000) : null;
	if (recordedBy !== undefined) updateData.recordedBy = recordedBy;
	if (activity !== undefined) updateData.activity = activity;
	if (location !== undefined) updateData.location = location;
	if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl;

	// Add updatedAt manually or rely on schema's $onUpdate if configured correctly for PUT
	updateData.updatedAt = Math.floor(Date.now() / 1000);

	if (Object.keys(updateData).length <= 1) { // Only updatedAt added
		return json({ error: 'No valid fields provided for update' }, { status: 400 });
	}

	// 4. Perform Update
	try {
		const [updatedEot] = await db
			.update(eotsTable)
			.set(updateData)
			.where(and(eq(eotsTable.id, eotId), eq(eotsTable.userId, userId))) // Double check ownership in where
			.returning();

		if (!updatedEot) {
			// This shouldn't happen if getEotAndCheckOwnership passed, but good safety check
			error(404, 'EOT not found during update');
		}

		return json(updatedEot);

	} catch (e) {
		console.error(`Error updating EOT ${eotId}:`, e);
		error(500, 'Internal Server Error');
	}
};

// DELETE /api/eots/{id} - Delete an EOT
export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}
	const eotId = params.id;
	const userId = locals.user.id;

	// 1. Check ownership first
	await getEotAndCheckOwnership(eotId, userId); // Throws error if not found/owned

	// 2. Perform Deletion
	try {
		const result = await db
			.delete(eotsTable)
			.where(and(eq(eotsTable.id, eotId), eq(eotsTable.userId, userId))); // Double check ownership

		// Drizzle delete doesn't return the deleted record by default.
		// Check if any rows were affected (specific drivers might offer this)
		// For better-sqlite3, result might contain { changes: number }
		// console.log('Delete result:', result);

		// Assuming success if no error is thrown after ownership check
		return json({ message: 'EOT deleted successfully' }, { status: 200 });

	} catch (e) {
		console.error(`Error deleting EOT ${eotId}:`, e);
		error(500, 'Internal Server Error');
	}
};
