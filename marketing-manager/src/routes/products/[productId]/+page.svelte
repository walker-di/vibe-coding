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
	// let productId = $state<number | null>(null); // No longer needed as separate state

	// Single effect to handle route parameter changes and data fetching
	$effect(() => {
		const idParam = $page.params.productId;
		console.log('Effect: idParam changed to', idParam); // Debug log

		// Reset state for new fetch attempt or invalid ID
		product = null;
		error = null;
		loading = true; // Assume loading until fetch completes or fails

		if (!idParam) {
			console.log('Effect: No idParam found.'); // Debug log
			error = 'Product ID missing from URL.';
			loading = false;
			return; // Stop processing if no ID
		}

		const parsedId = parseInt(idParam, 10);

		if (isNaN(parsedId)) {
			console.log('Effect: Invalid idParam format:', idParam); // Debug log
			error = 'Invalid Product ID format in URL.';
			loading = false;
		} else {
			console.log('Effect: Valid productId parsed:', parsedId); // Debug log
			// Valid ID, trigger fetch
			(async () => {
				await fetchProduct(parsedId);
			})();
		}
	});

	async function fetchProduct(id: number) {
		console.log('fetchProduct called for', id); // Debug log
		// State reset is now handled in the $effect before calling fetchProduct
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
        // Use the parsed ID directly from the page store params if product exists
		if (product && $page.params.productId) {
			goto(`/products/${$page.params.productId}/edit`);
		} else {
            console.warn("Attempted to edit product without a valid product loaded or ID in params.");
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
                 {#if product} <!-- Only show button if product loaded -->
                    <Button
                        onclick={() => {
                            if (product) { // Add null check inside handler
                                goto(`/products/${product.id}/personas/new`);
                            }
                        }}
                        class="mt-2"
                    >
                        Create New Persona
                    </Button>
                 {/if}
            </div>
		</div>
	{:else if !loading && !error} <!-- Added condition to avoid showing this when loading or error already shown -->
		<div class="text-center">
            <p class="text-gray-500 mb-4">Product data could not be loaded or does not exist.</p>
            <Button onclick={goToList} variant="outline">Back to Products List</Button>
        </div>
	{/if}
</div>
