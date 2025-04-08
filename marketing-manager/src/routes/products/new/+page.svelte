<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/button/Button.svelte'; // Keep Button for potential use outside form
	import ProductForm from '$lib/components/products/ProductForm.svelte'; // Import shared form
	import type { ProductPayload } from '$lib/types/product.types'; // Import payload type from types file
	import type { products } from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm'; // Import InferSelectModel

	type Product = InferSelectModel<typeof products>; // Use InferSelectModel

	// State managed by the page, passed to the form
	let formErrors = $state<Record<string, any>>({}); // Includes potential server errors
	let isSubmitting = $state<boolean>(false);

	// Client-side submission logic passed to the form
	async function handleSubmit(payload: ProductPayload) {
		formErrors = {}; // Clear previous errors
		isSubmitting = true;

		// Basic client-side validation (can be expanded)
		if (!payload.name?.trim()) {
			formErrors = { name: 'Product name is required.' };
			isSubmitting = false;
			return;
		}

		try {
			const response = await fetch('/api/products', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			const result = await response.json();

			if (!response.ok) {
				if (response.status === 400 && result.errors) {
					// Handle potential validation errors from API
					formErrors = result.errors;
				} else {
					formErrors = { server: result.message || 'Failed to create product. Please try again.' };
				}
				throw new Error(formErrors.server || 'Validation failed');
			}

			const newProduct: Product = result;
			goto(`/products/${newProduct.id}`); // Redirect on success

		} catch (e: any) {
			console.error('Failed to create product:', e);
			// Ensure server error is set if not already from response handling
			if (!formErrors.server) {
				formErrors = { ...formErrors, server: e.message || 'An unexpected error occurred.' };
			}
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		goto('/products'); // Navigate back to products list
	}
</script>

<svelte:head>
	<title>Create New Product</title>
</svelte:head>

<div class="container mx-auto p-4 md:p-8 max-w-2xl">
	<h1 class="text-2xl font-bold mb-6">Create New Product</h1>

	<!-- Render the shared ProductForm -->
	<ProductForm
		onSubmit={handleSubmit}
		onCancel={handleCancel}
		{isSubmitting}
		{formErrors}
		initialData={null}
	/>
</div>
