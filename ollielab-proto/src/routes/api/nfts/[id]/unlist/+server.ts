import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { nftsTable } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

import type { RequestHandler } from './$types';

// POST /api/nfts/{id}/unlist - Remove an NFT from sale listing
export const POST: RequestHandler = async ({ params, locals }) => {
	// 1. Check Authentication
	if (!locals.user) {
		error(401, 'Unauthorized');
	}
	const userId = locals.user.id;
	const nftId = params.id;

	if (!nftId) {
		error(400, 'NFT ID is required');
	}

	// 2. Check Ownership and Current Status
	const nft = await db.query.nftsTable.findFirst({
		where: and(eq(nftsTable.id, nftId), eq(nftsTable.userId, userId))
	});

	if (!nft) {
		error(404, 'NFT not found or not owned by user');
	}
	if (nft.status !== 'listed') {
		return json({ error: 'NFT is not currently listed for sale' }, { status: 400 });
	}

	// 3. Update NFT Record in Database
	const unlistedAtTimestamp = Math.floor(Date.now() / 1000);
	const newStatus = 'minted'; // Revert status back to minted (or another appropriate status)

	try {
		const [updatedNft] = await db
			.update(nftsTable)
			.set({
				price: null, // Clear price
				currency: null, // Clear currency
				status: newStatus,
				listedForSaleAt: null, // Clear listed timestamp
				updatedAt: unlistedAtTimestamp // Update the general updatedAt timestamp
			})
			.where(and(eq(nftsTable.id, nftId), eq(nftsTable.userId, userId))) // Ensure ownership again
			.returning();

		if (!updatedNft) {
			// Should not happen if initial check passed
			error(500, 'Failed to update NFT status during unlisting');
		}

		// 4. Return Response
		return json(updatedNft);

	} catch (e) {
		console.error(`Error unlisting NFT ${nftId}:`, e);
		error(500, 'Internal Server Error');
	} // <-- Missing brace was here
};
