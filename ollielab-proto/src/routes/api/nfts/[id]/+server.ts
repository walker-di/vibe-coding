import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { nftsTable } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

import type { RequestHandler } from './$types';

// GET /api/nfts/{id} - Get details of a specific NFT
export const GET: RequestHandler = async ({ params, locals }) => {
	// 1. Check Authentication (Optional - depends if NFT details are public or private)
	// If details are public, remove auth check. If private to owner, keep it.
	// Let's assume private for now.
	if (!locals.user) {
		error(401, 'Unauthorized');
	}
	const userId = locals.user.id; // Needed only if checking ownership
	const nftId = params.id;

	if (!nftId) {
		error(400, 'NFT ID is required');
	}

	// 2. Query Database
	try {
		const nftRecord = await db.query.nftsTable.findFirst({
			where: eq(nftsTable.id, nftId), // Find by ID
			// Add ownership check if details are private:
			// where: and(eq(nftsTable.id, nftId), eq(nftsTable.userId, userId)),
			// Include related data:
			with: {
				generatedArt: true, // Include the linked generated art details
				eot: true, // Include the linked EOT details
				user: { // Include owner details (e.g., email, name) - be careful with privacy
					columns: { email: true, name: true } // Select specific columns
				}
			}
		});

		if (!nftRecord) {
			error(404, 'NFT not found');
		}

		// Optional: If details are private, uncomment this check
		/*
		if (nftRecord.userId !== userId) {
			error(403, 'Forbidden: You do not own this NFT');
		}
		*/

		// 3. Return Response
		return json(nftRecord);

	} catch (e: any) {
		if (e.status) {
			error(e.status, e.body.message);
		}
		console.error(`Error fetching NFT ${nftId}:`, e);
		error(500, 'Internal Server Error');
	}
};

// Optional: Add PUT/DELETE handlers if needed for NFT management actions
// (e.g., updating metadata IF mutable, burning NFT - requires blockchain interaction)
