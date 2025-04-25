import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { nftsTable, generatedArtTable } from '$lib/server/db/schema';
import { createId } from '@paralleldrive/cuid2';
import { eq, and } from 'drizzle-orm';

import type { RequestHandler } from './$types';

// POST /api/nfts/mint - Initiate NFT Minting
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
	const { generatedArtId, eotId } = data; // eotId might be passed for direct linking

	if (!generatedArtId || typeof generatedArtId !== 'string') {
		return json({ error: 'Missing or invalid generatedArtId' }, { status: 400 });
	}

	// 4. Validate Generated Art Record
	const artRecord = await db.query.generatedArtTable.findFirst({
		where: and(eq(generatedArtTable.id, generatedArtId), eq(generatedArtTable.userId, userId))
	});

	if (!artRecord) {
		return json({ error: 'Generated art not found or not owned by user' }, { status: 404 });
	}
	if (artRecord.status !== 'completed') {
		// In a real scenario, check for 'completed' status
		// return json({ error: 'Art generation is not complete' }, { status: 400 });
		console.warn(`Minting art with status: ${artRecord.status}. Ensure generation is complete.`);
	}
	if (!artRecord.imageUrl) {
		// In a real scenario, image URL is essential for metadata
		// return json({ error: 'Art image URL is missing' }, { status: 400 });
		console.warn(`Minting art without an imageUrl.`);
	}

	// --- Blockchain Interaction Placeholder ---
	// TODO:
	// 1. Upload image/video to IPFS (if not already done) -> get imageCid
	// 2. Construct metadata JSON (name, description, image: ipfs://imageCid, attributes...)
	// 3. Upload metadata JSON to IPFS -> get metadataCid / metadataUrl (ipfs://metadataCid)
	// 4. Call smart contract's mint function (e.g., mint(userAddress, metadataUrl)) -> get tokenId, contractAddress, chainId
	// 5. Handle potential errors from blockchain interaction
	// -----------------------------------------

	// 5. Create NFT Record in Database (with placeholder data)
	const newNftId = createId();
	const placeholderTokenId = `SIM-${Math.floor(Math.random() * 100000)}`;
	const placeholderContract = '0xSIMULATED_CONTRACT_ADDRESS';
	const placeholderChain = 'SIMULATED_CHAIN';
	const placeholderMetadataUrl = `ipfs://SIMULATED_METADATA_CID/${newNftId}`;
	const mintedAtTimestamp = Math.floor(Date.now() / 1000);

	try {
		// Use transaction to ensure both NFT creation and Art status update succeed or fail together
		const [createdNft] = await db.transaction(async (tx) => {
			const [nft] = await tx
				.insert(nftsTable)
				.values({
					id: newNftId,
					userId: userId,
					generatedArtId: generatedArtId,
					eotId: artRecord.eotId || eotId || null, // Use art's eotId first, then request's
					tokenId: placeholderTokenId,
					contractAddress: placeholderContract,
					chainId: placeholderChain,
					metadataUrl: placeholderMetadataUrl,
					mintedAt: mintedAtTimestamp,
					status: 'minted' // Default status from schema
					// createdAt/updatedAt have defaults
				})
				.returning();

			// Update the generated art status to 'minted'
			await tx
				.update(generatedArtTable)
				.set({ status: 'minted' })
				.where(eq(generatedArtTable.id, generatedArtId));

			return [nft]; // Return the created NFT record from the transaction
		});


		if (!createdNft) {
			error(500, 'Failed to create NFT record');
		}

		// 6. Return Response (the newly created NFT record)
		return json(createdNft, { status: 201 }); // 201 Created

	} catch (e) {
		console.error('Error creating NFT record:', e);
		error(500, 'Internal Server Error during NFT creation');
	}
};
