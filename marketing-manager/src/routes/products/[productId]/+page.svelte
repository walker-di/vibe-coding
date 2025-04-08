<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { products } from '$lib/server/db/schema'; // Use type import
	import Button from '$lib/components/ui/button/Button.svelte';

	type Product = typeof products.$inferSelect;

	let product = $state<Product | null>(null);
	let error = $state<string | null>(null);
	let loading = $state<boolean>(true);
	let productId = $state<number | null>(null);

	// Effect 1: Update productId state from route params and handle invalid ID
	$effect(() => {
		const idParam = $page.params.productId;
		console.log('Effect 1: idParam changed to', idParam); // Debug log

		if (!idParam) {
			// Handle initial load or missing param case
			productId = null;
			loading = true; // Assume loading until we know more
			error = null;
            product = null;
			return;
		}

		const parsedId = parseInt(idParam, 10);
		if (!isNaN(parsedId)) {
			// Valid ID parsed
			if (productId !== parsedId) { // Update state only if changed
				console.log('Effect 1: Setting valid productId', parsedId); // Debug log
				productId = parsedId;
				error = null; // Clear potential previous error
				// Loading will be set by Effect 2
			}
		} else {
			// Invalid ID format
			console.log('Effect 1: Setting invalid productId (null)'); // Debug log
			productId = null;
			error = 'Invalid Product ID in URL.';
			loading = false; // Stop loading
			product = null; // Clear product data
		}
	});

	// Effect 2: Fetch data when productId state changes to a valid number
	$effect(() => {
		const currentId = productId; // Read the state variable
		console.log('Effect 2: productId state is', currentId); // Debug log

		if (currentId !== null) {
			console.log('Effect 2: Triggering fetch for', currentId); // Debug log
			loading = true; // Set loading before fetch
			(async () => {
				await fetchProduct(currentId);
			})();
		} else {
            // If productId becomes null (e.g., invalid ID set by Effect 1),
            // ensure loading stops if it wasn't already stopped by Effect 1 setting an error.
            // Also clear product data if not already cleared.
            if (!error) { // Only adjust if Effect 1 didn't set an error
                 product = null;
                 // loading = false; // Let fetchProduct handle final loading state
            }
        }
	});


	async function fetchProduct(id: number) {
		console.log('fetchProduct called for', id); // Debug log
		// error = null; // Clear previous fetch errors
		// product = null; // Clear previous product data
		// loading = true; // Set loading true at the start of fetch
		try {
			const response = await fetch(`/api/products/${id}`);
			if (response.status === 404) {
				throw new Error('Product not found.');
			}
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			product = await response.json();
		} catch (e: any) {
			console.error(`Failed to fetch product ${id}:`, e);
			error = e.message || 'Failed to load product details.';
		} finally {
			loading = false;
		}
	}

	function editProduct() {
		if (productId) {
			goto(`/products/${productId}/edit`);
		}
	}

    function goToList() {
        goto('/products');
    }

	// Helper to format text with line breaks
	function formatMultilineText(text: string | null | undefined): string {
		return text ? text.replace(/\n/g, '<br>') : '';
	}
</script>

<svelte:head>
	<title>{loading ? 'Loading Product...' : product ? product.name : 'Product Details'}</title>
</svelte:head>

<div class="container mx-auto p-4 md:p-8">
	{#if loading}
		<p>Loading product details...</p>
	{:else if error}
		<div class="text-center">
            <p class="text-red-500 mb-4">Error: {error}</p>
            <Button onclick={goToList} variant="outline">Back to Products List</Button>
        </div>
	{:else if product}
		<div class="mb-6 flex justify-between items-center">
			<h1 class="text-3xl font-bold">{product.name}</h1>
			<div>
                <Button onclick={goToList} variant="outline" class="mr-2">Back to List</Button>
				<Button onclick={editProduct}>Edit Product</Button>
            </div>
		</div>

		<div class="space-y-4">
			{#if product.imageUrl}
				<div class="mb-4">
					<img src={product.imageUrl} alt={product.name} class="max-w-sm rounded shadow" />
				</div>
			{/if}

			{#if product.overview}
				<div>
					<h2 class="text-xl font-semibold mb-1">Overview</h2>
					<p class="text-gray-700 dark:text-gray-300">{product.overview}</p>
				</div>
			{/if}

			{#if product.industry}
				<div>
					<h2 class="text-xl font-semibold mb-1">Industry</h2>
					<p class="text-gray-700 dark:text-gray-300">{product.industry}</p>
				</div>
			{/if}

			{#if product.details}
				<div>
					<h2 class="text-xl font-semibold mb-1">Details</h2>
					<p class="text-gray-700 dark:text-gray-300">{@html formatMultilineText(product.details)}</p>
				</div>
			{/if}

			{#if product.featuresStrengths}
				<div>
					<h2 class="text-xl font-semibold mb-1">Features / Strengths</h2>
					<div class="text-gray-700 dark:text-gray-300">{@html formatMultilineText(product.featuresStrengths)}</div>
				</div>
			{/if}

            {#if product.description}
				<div>
					<h2 class="text-xl font-semibold mb-1">Internal Description</h2>
					<p class="text-gray-700 dark:text-gray-300">{product.description}</p>
				</div>
			{/if}

            <div class="pt-4 text-sm text-gray-500">
                <p>Created: {new Date(product.createdAt).toLocaleString()}</p>
                {#if product.updatedAt}
                    <p>Last Updated: {new Date(product.updatedAt).toLocaleString()}</p>
                {/if}
            </div>

            <!-- Placeholder for Personas List -->
            <div class="mt-8 pt-6 border-t">
                <h2 class="text-2xl font-semibold mb-4">Associated Personas</h2>
                <p class="text-gray-500 italic">(Persona list will be implemented here)</p>
                <!-- TODO: Fetch and display personas linked to this product -->
                 <Button onclick={() => goto(`/products/${productId}/personas/new`)} class="mt-2">Create New Persona</Button>
            </div>
		</div>
	{:else}
		<p>Product data could not be loaded.</p>
         <Button onclick={goToList} variant="outline">Back to Products List</Button>
	{/if}
</div>
