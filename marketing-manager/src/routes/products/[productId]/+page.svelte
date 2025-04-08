<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { products, personas as personasTable } from '$lib/server/db/schema'; // Use type import, add personas
	import Button from '$lib/components/ui/button/Button.svelte';
	import { User } from 'lucide-svelte'; // Add User icon import

	type Product = typeof products.$inferSelect;
	// Define a basic type for the persona list items
	type PersonaListItem = {
		id: number;
		name: string;
		personaTitle: string | null;
		imageUrl: string | null;
		// Add other fields if needed for display
	};

	let product = $state<Product | null>(null);
	let error = $state<string | null>(null);
	let loading = $state<boolean>(true);
	// let productId = $state<number | null>(null); // No longer needed as separate state

	// State for associated personas
	let associatedPersonas = $state<PersonaListItem[]>([]);
	let personasLoading = $state<boolean>(true);
	let personasError = $state<string | null>(null);

	// Single effect to handle route parameter changes and data fetching
	$effect(() => {
		const idParam = $page.params.productId;
		console.log('Effect: idParam changed to', idParam); // Debug log

		// Reset state for new fetch attempt or invalid ID
		product = null;
		associatedPersonas = []; // Reset personas list
		error = null;
		personasError = null;
		loading = true; // Assume loading until fetch completes or fails
		personasLoading = true;

		if (!idParam) {
			console.log('Effect: No idParam found.'); // Debug log
			error = 'Product ID missing from URL.';
			loading = false;
			personasLoading = false; // Also stop persona loading
			return; // Stop processing if no ID
		}

		const parsedId = parseInt(idParam, 10);

		if (isNaN(parsedId)) {
			console.log('Effect: Invalid idParam format:', idParam); // Debug log
			error = 'Invalid Product ID format in URL.';
			loading = false;
			personasLoading = false; // Also stop persona loading
		} else {
			console.log('Effect: Valid productId parsed:', parsedId); // Debug log
			// Valid ID, trigger fetches for product and personas in parallel
			(async () => {
				// Use Promise.all to run fetches concurrently
				await Promise.all([
					fetchProduct(parsedId),
					fetchPersonas(parsedId)
				]);
				// Overall loading is false only after both complete (handled within functions)
			})();
		}
	});

	async function fetchProduct(id: number) {
		console.log('fetchProduct called for', id); // Debug log
		// Resetting product-specific state here is fine, or rely on $effect reset
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
			error = e.message || 'Failed to load product details.'; // Set main error
		} finally {
			loading = false; // Mark product loading as done
		}
	}

	async function fetchPersonas(productId: number) {
		console.log('fetchPersonas called for productId', productId); // Debug log
		personasError = null; // Reset persona-specific error
		personasLoading = true; // Explicitly set loading true for personas fetch
		try {
			const response = await fetch(`/api/products/${productId}/personas`);
			if (!response.ok) {
				// Don't throw 404 as an error, just means no personas
				if (response.status === 404) {
					associatedPersonas = [];
					return;
				}
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			associatedPersonas = await response.json();
		} catch (e: any) {
			console.error(`Failed to fetch personas for product ${productId}:`, e);
			personasError = e.message || 'Failed to load associated personas.'; // Set persona-specific error
			associatedPersonas = []; // Ensure list is empty on error
		} finally {
			personasLoading = false; // Mark persona loading as done
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

            <!-- Section for Associated Personas -->
            <div class="mt-8 pt-6 border-t">
                 <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-semibold">Associated Personas</h2>
                     {#if product} <!-- Only show button if product loaded -->
                        <Button
                            onclick={() => {
                                if (product) { // Add null check inside handler
                                    goto(`/products/${product.id}/personas/new`);
                                }
                            }}
                        >
                            Create New Persona
                        </Button>
                     {/if}
                 </div>

                {#if personasLoading}
                    <p>Loading personas...</p>
                {:else if personasError}
                    <p class="text-red-500">Error loading personas: {personasError}</p>
                {:else if associatedPersonas.length === 0}
                    <p class="text-gray-500 italic">No personas associated with this product yet.</p>
                {:else}
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {#each associatedPersonas as persona (persona.id)}
                            <div class="border rounded-lg p-4 shadow hover:shadow-md transition-shadow flex flex-col justify-between">
                                <div class="flex items-center mb-3">
                                    {#if persona.imageUrl}
                                        <img src={persona.imageUrl} alt={persona.name} class="w-12 h-12 rounded-full mr-3 object-cover border"/>
                                    {:else}
                                        <div class="w-12 h-12 rounded-full mr-3 bg-gray-200 flex items-center justify-center border">
                                            <User class="w-6 h-6 text-gray-500" />
                                        </div>
                                    {/if}
                                    <div>
                                        <h3 class="text-lg font-semibold leading-tight">{persona.name}</h3>
                                        {#if persona.personaTitle}
                                            <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{persona.personaTitle}</p>
                                        {/if}
                                    </div>
                                </div>
                                <div class="flex justify-end mt-2">
                                     <Button
                                        href={`/products/${product.id}/personas/${persona.id}`}
                                        variant="outline"
                                        class="text-sm px-3 py-1"
                                    >
                                        View Details
                                    </Button>
                                </div>
                            </div>
                        {/each}
                    </div>
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
