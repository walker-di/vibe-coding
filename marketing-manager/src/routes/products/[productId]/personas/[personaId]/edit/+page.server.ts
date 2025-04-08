import { error } from '@sveltejs/kit';
import type { PageServerLoadEvent } from './$types';
import type { personas } from '$lib/server/db/schema'; // Import the type

export async function load({ params, fetch }: PageServerLoadEvent) {
	const productId = params.productId;
	const personaId = params.personaId;

	if (!productId || !personaId) {
		throw error(400, 'Bad Request: Product ID and Persona ID are required.');
	}

	// Construct the API URL dynamically
	// Assuming the API follows the pattern /api/products/:productId/personas/:personaId
	const apiUrl = `/api/products/${productId}/personas/${personaId}`;

	try {
		const response = await fetch(apiUrl);

		if (!response.ok) {
			if (response.status === 404) {
				throw error(404, `Persona with ID ${personaId} not found for Product ${productId}.`);
			}
			// Handle other potential errors from the API
			const errorData = await response.json().catch(() => ({ message: 'Failed to load persona data.' }));
			throw error(response.status, `API Error: ${errorData.message || response.statusText}`);
		}

		const persona: typeof personas.$inferSelect = await response.json();

		if (!persona) {
			throw error(404, `Persona with ID ${personaId} not found.`);
		}

		// Return the fetched persona data
		return {
			persona: persona,
			productId: parseInt(productId, 10), // Pass productId too, parsed as number
			personaId: parseInt(personaId, 10) // Pass personaId too, parsed as number
		};

	} catch (err: any) {
		console.error(`Error loading persona ${personaId} for product ${productId}:`, err);
		// Rethrow SvelteKit errors, handle others
		if (err.status) {
			throw err;
		}
		throw error(500, `Failed to load persona: ${err.message || 'Internal Server Error'}`);
	}
}
