import { error, fail, redirect } from '@sveltejs/kit'; // Add fail
import type { PageServerLoad, Actions } from './$types'; // Add Actions

// Load the specific art generation record
export const load: PageServerLoad = async ({ locals, params, fetch }) => {
	if (!locals.user) {
		redirect(302, '/login'); // Redirect if not logged in
	}

	const artId = params.id;
	if (!artId) {
		error(400, 'Art ID is required');
	}

	try {
		const response = await fetch(`/api/art/${artId}`); // Use internal fetch

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ message: `Failed to fetch art record ${artId}` }));
			// Handle specific errors like 404 (Not Found) or 403 (Forbidden) if API returns them
			if (response.status === 404) {
				error(404, 'Art record not found or you do not have permission.');
			}
			error(response.status, errorData.message || `Failed to fetch art record ${artId}`);
		}

		const artRecord = await response.json();
		return { artRecord }; // Pass the record to the page component

	} catch (e) {
		console.error(`Error fetching art record ${artId} via API:`, e);
		error(500, 'Failed to load art record');
	}
};

// Actions for this page
export const actions: Actions = {
	mint: async ({ request, locals, fetch }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const generatedArtId = formData.get('generatedArtId');
		// Could potentially get eotId from form too if needed for direct linking

		if (!generatedArtId || typeof generatedArtId !== 'string') {
			return fail(400, { error: 'Missing generatedArtId' });
		}

		try {
			const response = await fetch('/api/nfts/mint', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ generatedArtId }) // Pass the art ID to the mint API
			});

			const result = await response.json();

			if (!response.ok) {
				return fail(response.status, { error: result.error || 'Failed to mint NFT' });
			}

			// Return the newly created NFT record on success
			return { success: true, mintedNft: result };

		} catch (e) {
			console.error(`Error calling mint API for art ${generatedArtId}:`, e);
			return fail(500, { error: 'Internal server error calling mint API' });
		}
	}
};
