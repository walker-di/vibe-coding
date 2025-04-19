import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { salesTable, nftsTable } from '$lib/server/db/schema';
import { createId } from '@paralleldrive/cuid2';
import { eq, and } from 'drizzle-orm';

import type { RequestHandler } from './$types';

// POST /api/sales - Create a new sales order for an NFT
export const POST: RequestHandler = async ({ request }) => {
	// Note: This endpoint might be called by unauthenticated buyers initially.
	// Authentication might be required later depending on the purchase flow.

	// 1. Parse Request Body
	let data;
	try {
		data = await request.json();
	} catch (e) {
		error(400, 'Invalid JSON body');
	}

	// 2. Validate Input Data
	const { nftId, buyerEmail } = data;

	if (!nftId || typeof nftId !== 'string') {
		return json({ error: 'Missing or invalid nftId' }, { status: 400 });
	}
	// Basic email validation (can be improved)
	if (!buyerEmail || typeof buyerEmail !== 'string' || !buyerEmail.includes('@')) {
		return json({ error: 'Missing or invalid buyerEmail' }, { status: 400 });
	}

	// 3. Find the Listed NFT
	const nftToList = await db.query.nftsTable.findFirst({
		where: and(eq(nftsTable.id, nftId), eq(nftsTable.status, 'listed'))
		// Could also add check: ne(nftsTable.userId, buyerId) if buyer is logged in
	});

	if (!nftToList) {
		return json({ error: 'NFT not found or is not listed for sale' }, { status: 404 });
	}
	if (!nftToList.price || !nftToList.currency) {
		// Should not happen if listed correctly, but good check
		return json({ error: 'NFT listing is incomplete (missing price or currency)' }, { status: 409 }); // Conflict
	}

	// 4. Create Pending Sales Record
	const newSaleId = createId();
	const sellerId = nftToList.userId; // Get seller from the NFT record
	const price = nftToList.price;
	const currency = nftToList.currency;

	try {
		const [createdSale] = await db
			.insert(salesTable)
			.values({
				id: newSaleId,
				nftId: nftId,
				sellerId: sellerId,
				buyerEmail: buyerEmail.toLowerCase(), // Store consistently
				price: price,
				currency: currency,
				paymentStatus: 'pending', // Initial status
				deliveryStatus: 'pending' // Initial status
				// paymentMethod might be set later or determined here
				// createdAt/updatedAt have defaults
			})
			.returning(); // Return the created record

		if (!createdSale) {
			error(500, 'Failed to create sales record');
		}

		// --- Payment Gateway Interaction Placeholder ---
		// TODO:
		// 1. Generate PIX code or payment link based on createdSale details (ID, price, currency).
		// 2. Return payment details (e.g., PIX code, payment URL) along with the sale record.
		// ---------------------------------------------

		// 5. Return Response (including the sale ID needed for payment processing)
		// Add payment details to the response once implemented
		return json(createdSale, { status: 201 }); // 201 Created

	} catch (e) {
		console.error('Error creating sales record:', e);
		error(500, 'Internal Server Error during sales record creation');
	}
};
