import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { nftsTable } from '$lib/server/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm'; // Import desc and inArray

import type { RequestHandler } from './$types';

// GET /api/nfts - Get list of user's NFTs (owned, listed, sold)
export const GET: RequestHandler = async ({ locals, url }) => {
	// 1. Check Authentication
	if (!locals.user) {
		error(401, 'Unauthorized');
	}
	const userId = locals.user.id;

	// 2. Get Query Parameters (for filtering)
	const statusFilter = url.searchParams.get('status'); // e.g., ?status=listed or ?status=owned,sold

	// 3. Build Query Conditions
	const conditions = [eq(nftsTable.userId, userId)]; // Base condition: user owns the NFT

	if (statusFilter) {
		const statuses = statusFilter.split(',').map(s => s.trim()).filter(Boolean);
		if (statuses.length > 0) {
			// Validate statuses if necessary (e.g., ensure they are 'minted', 'listed', 'sold')
			conditions.push(inArray(nftsTable.status, statuses));
		}
	} else {
		// Default: If no status filter, maybe return all non-sold? Or all? Let's return all for now.
		// Or adjust default: conditions.push(ne(nftsTable.status, 'sold'));
	}

	// 4. Query Database
	try {
		const userNfts = await db.query.nftsTable.findMany({
			where: and(...conditions),
			orderBy: [desc(nftsTable.createdAt)], // Order by newest first
			// Optionally include related data:
			// with: {
			//  generatedArt: true, // Include the linked generated art details
			//  eot: true // Include the linked EOT details
			// }
		});

		// 5. Return Response
		return json(userNfts);

	} catch (e) {
		console.error('Error fetching NFTs:', e);
		error(500, 'Internal Server Error');
	}
};
