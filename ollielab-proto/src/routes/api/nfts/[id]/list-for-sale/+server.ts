import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { nftsTable } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

import type { RequestHandler } from './$types';

// POST /api/nfts/{id}/list-for-sale - List an owned NFT for sale
export const POST: RequestHandler = async ({ params, request, locals }) => {
	// 1. Check Authentication
	if (!locals.user) {
		error(401, 'Unauthorized');
	}
	const userId = locals.user.id;
	const nftId = params.id;

	if (!nftId) {
		error(400, 'NFT ID is required');
	}

	// 2. Parse Request Body
	let data;
	try {
		data = await request.json();
	} catch (e) {
		error(400, 'Invalid JSON body');
	}

	// 3. Validate Input Data
	const { price, currency } = data;

	if (price === undefined || typeof price !== 'number' || price <= 0) {
		return json({ error: 'Missing or invalid price' }, { status: 400 });
	}
	if (!currency || typeof currency !== 'string') {
		// Basic validation, could check against allowed currencies
		return json({ error: 'Missing or invalid currency' }, { status: 400 });
	}

	// 4. Check Ownership and Current Status
	const nft = await db.query.nftsTable.findFirst({
		where: and(eq(nftsTable.id, nftId), eq(nftsTable.userId, userId))
	});

	if (!nft) {
		error(404, 'NFT not found or not owned by user');
	}
	// Optional: Check if already listed or sold
	if (nft.status === 'listed') {
		return json({ error: 'NFT is already listed for sale' }, { status: 409 }); // Conflict
	}
	if (nft.status === 'sold') {
		return json({ error: 'Cannot list an NFT that has already been sold' }, { status: 400 });
	}

	// 5. Update NFT Record in Database
	const listedAtTimestamp = Math.floor(Date.now() / 1000);
	const newStatus = 'listed';

	try {
		const [updatedNft] = await db
			.update(nftsTable)
			.set({
				price: price,
				currency: currency.toUpperCase(), // Store currency consistently
				status: newStatus,
				listedForSaleAt: listedAtTimestamp,
				updatedAt: listedAtTimestamp // Also update the general updatedAt timestamp
			})
			.where(and(eq(nftsTable.id, nftId), eq(nftsTable.userId, userId))) // Ensure ownership again
			.returning();

		if (!updatedNft) {
			// Should not happen if initial check passed, but good safety measure
			error(500, 'Failed to update NFT listing status');
		}

		// 6. Return Response
		return json(updatedNft);

	} catch (e) {
		console.error(`Error listing NFT ${nftId} for sale:`, e);
		error(500, 'Internal Server Error');
	}
};
