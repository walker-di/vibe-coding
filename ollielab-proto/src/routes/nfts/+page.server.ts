import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

// Load NFTs for the logged-in user
export const load: PageServerLoad = async ({ locals, fetch }) => {
	if (!locals.user) {
		redirect(302, '/login'); // Redirect if not logged in
	}

	try {
		// Fetch NFTs owned by the user (default filter of GET /api/nfts)
		// Could add ?status=minted,listed to explicitly get ownable NFTs
		const response = await fetch('/api/nfts');
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ message: 'Failed to fetch NFTs' }));
			error(response.status, errorData.message || 'Failed to fetch NFTs');
		}
		const nfts = await response.json();
		return { nfts }; // Pass NFTs to the page component
	} catch (e) {
		console.error('Error fetching NFTs via API:', e);
		error(500, 'Failed to load NFTs');
	}
};

export const actions: Actions = {
	// Action to list an NFT for sale
	list: async ({ request, locals, fetch }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const nftId = formData.get('nftId');
		const priceStr = formData.get('price');
		const currency = formData.get('currency');

		// Validate inputs
		if (!nftId || typeof nftId !== 'string') {
			return fail(400, { error: 'Missing NFT ID' });
		}
		if (!priceStr || typeof priceStr !== 'string') {
			return fail(400, { error: 'Missing price', nftId });
		}
		if (!currency || typeof currency !== 'string') {
			return fail(400, { error: 'Missing currency', nftId });
		}

		const price = parseFloat(priceStr);
		if (isNaN(price) || price <= 0) {
			return fail(400, { error: 'Invalid price', nftId, price: priceStr, currency });
		}

		try {
			const response = await fetch(`/api/nfts/${nftId}/list-for-sale`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ price, currency })
			});

			const result = await response.json();

			if (!response.ok) {
				return fail(response.status, {
					error: result.error || 'Failed to list NFT',
					nftId,
					price: priceStr,
					currency
				});
			}

			// Success - the page will reload via invalidate/load function
			return { success: true, listedNft: result };

		} catch (e) {
			console.error(`Error calling list API for NFT ${nftId}:`, e);
			return fail(500, {
				error: 'Internal server error calling API',
				nftId,
				price: priceStr,
				currency
			});
		}
	},

	// Action to unlist an NFT
	unlist: async ({ request, locals, fetch }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const nftId = formData.get('nftId');

		if (!nftId || typeof nftId !== 'string') {
			return fail(400, { error: 'Missing NFT ID' });
		}

		try {
			const response = await fetch(`/api/nfts/${nftId}/unlist`, {
				method: 'POST' // No body needed for unlist
			});

			const result = await response.json();

			if (!response.ok) {
				return fail(response.status, {
					error: result.error || 'Failed to unlist NFT',
					nftId // Pass nftId back for error display context
				});
			}

			// Success - the page will reload via invalidate/load function
			return { success: true, unlistedNft: result };

		} catch (e) {
			console.error(`Error calling unlist API for NFT ${nftId}:`, e);
			return fail(500, {
				error: 'Internal server error calling API',
				nftId
			});
		}
	}
};
