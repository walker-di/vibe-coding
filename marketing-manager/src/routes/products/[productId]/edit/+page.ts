import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types'; // Import PageLoad type

export const load: PageLoad = async ({ params, fetch }) => { // Use imported type
	const idParam = params.productId;
	const productId = idParam ? parseInt(idParam, 10) : NaN;

	if (isNaN(productId)) {
		throw error(400, 'Invalid Product ID format in URL.'); // Use SvelteKit error helper
	}

	try {
		const response = await fetch(`/api/products/${productId}`); // Use load's fetch

		if (response.status === 404) {
			throw error(404, 'Product not found.'); // Use SvelteKit error helper
		}
		if (!response.ok) {
			// Attempt to get error message from API response body
			let apiErrorMsg = `HTTP error! status: ${response.status}`;
			try {
				const errData = await response.json();
				if (errData.message) {
					apiErrorMsg = errData.message;
				}
			} catch (e) { /* Ignore parsing error */ }
			throw new Error(apiErrorMsg); // Throw generic error for other non-ok statuses
		}

		const productData = await response.json();

		// Return the fetched product data
		return {
			product: productData,
            productId: productId // Pass the validated ID as well
		};

	} catch (e: unknown) { // Type e as unknown
		console.error(`Failed to load product ${productId} for edit page:`, e);
		// Type checking for error object
		let errorMessage = 'Failed to load product details.';
		if (e instanceof Error) {
			// If it's already a SvelteKit HttpError, rethrow it
			if ('status' in e && typeof e.status === 'number') {
				throw e;
			}
			errorMessage = e.message;
		}
		// Otherwise, throw a generic 500 error
		throw error(500, errorMessage);
	}
};
