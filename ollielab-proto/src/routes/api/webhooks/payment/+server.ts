import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { salesTable, nftsTable } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

import type { RequestHandler } from './$types';

// POST /api/webhooks/payment - Simulate receiving payment confirmation
export const POST: RequestHandler = async ({ request }) => {
	// --- Webhook Security Placeholder ---
	// TODO: Implement webhook signature verification here
	// const signature = request.headers.get('X-Signature'); // Example header
	// const isValid = verifySignature(await request.text(), signature); // Need actual verification logic
	// if (!isValid) {
	//  error(401, 'Invalid webhook signature');
	// }
	// For now, assume the request is valid. Re-parse body after verification.
	// ------------------------------------

	// 1. Parse Request Body (Simulated Payload)
	let payload;
	try {
		// Re-parse after verification if needed, or parse directly if no verification yet
		payload = await request.json();
	} catch (e) {
		error(400, 'Invalid JSON body');
	}

	// 2. Validate Simulated Payload
	const { saleId, transactionId, status } = payload; // Assuming gateway sends saleId, transactionId, status

	if (!saleId || typeof saleId !== 'string') {
		return json({ error: 'Missing or invalid saleId' }, { status: 400 });
	}
	if (!transactionId || typeof transactionId !== 'string') {
		// In real scenario, might be optional depending on gateway/status
		return json({ error: 'Missing or invalid transactionId' }, { status: 400 });
	}
	if (status !== 'completed') {
		// For this placeholder, only handle 'completed' status
		// Real webhook would handle 'failed', 'pending', etc.
		console.log(`Webhook received for sale ${saleId} with status ${status}. Ignoring.`);
		return json({ message: 'Webhook received, status not processed by placeholder.' });
	}

	// 3. Find the Pending Sale Record
	const saleRecord = await db.query.salesTable.findFirst({
		where: and(eq(salesTable.id, saleId), eq(salesTable.paymentStatus, 'pending'))
		// Also include NFT details to update it later
		// with: { nft: true } // This might require adjusting relations or doing a separate query
	});

	if (!saleRecord) {
		console.warn(`Webhook received for unknown or already processed sale ID: ${saleId}`);
		// Return success to the webhook provider even if we can't process it,
		// to prevent retries for non-recoverable errors.
		return json({ message: 'Sale not found or already processed.' });
	}

	// 4. Update Database Records in a Transaction
	const paymentCompletedAt = Math.floor(Date.now() / 1000);
	const nftId = saleRecord.nftId; // Get NFT ID from the sale record

	try {
		await db.transaction(async (tx) => {
			// Update Sale Record
			await tx
				.update(salesTable)
				.set({
					paymentStatus: 'completed',
					paymentTransactionId: transactionId,
					paymentMethod: 'PIX', // Assuming PIX for now
					updatedAt: paymentCompletedAt
					// Could also set deliveredAt if delivery is instant/part of this process
				})
				.where(eq(salesTable.id, saleId));

			// Update NFT Record
			await tx
				.update(nftsTable)
				.set({
					status: 'sold',
					// Clear listing info if desired
					// price: null,
					// currency: null,
					// listedForSaleAt: null,
					updatedAt: paymentCompletedAt
					// Potentially update ownerId if transferring ownership here
				})
				.where(eq(nftsTable.id, nftId));

			// --- Delivery Trigger Placeholder ---
			// TODO: Trigger email notification or on-chain transfer here
			console.log(`Sale ${saleId} completed. Triggering delivery for NFT ${nftId}.`);
			// ----------------------------------
		});

		// 5. Return Success Response to Webhook Provider
		return json({ message: 'Webhook processed successfully' });

	} catch (e) {
		console.error(`Error processing webhook for sale ${saleId}:`, e);
		// Return error to webhook provider? Might cause retries.
		// Consider logging the error and returning success if it's a non-retryable DB issue.
		error(500, 'Internal Server Error processing webhook');
	}
};
