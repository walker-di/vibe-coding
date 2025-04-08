<script lang="ts">
	import { onMount } from 'svelte';
	import type { products } from '$lib/server/db/schema'; // Import the type
	import Button from '$lib/components/ui/button/Button.svelte';
	import { goto } from '$app/navigation';

	type Product = typeof products.$inferSelect; // Use inferred type

	let productList = $state<Product[]>([]);
	let error = $state<string | null>(null);
	let loading = $state<boolean>(true);

	onMount(async () => {
		try {
			const response = await fetch('/api/products');
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			productList = await response.json();
		} catch (e: any) {
			console.error('Failed to fetch products:', e);
			error = e.message || 'Failed to load products.';
		} finally {
			loading = false;
		}
	});

	function viewProduct(id: number) {
		goto(`/products/${id}`);
	}

	function editProduct(id: number) {
		goto(`/products/${id}/edit`);
	}

	function createNewProduct() {
		goto('/products/new');
	}
</script>

<svelte:head>
	<title>Products</title>
</svelte:head>

<div class="container mx-auto p-4 md:p-8">
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-2xl font-bold">Products</h1>
		<Button onclick={createNewProduct}>Create New Product</Button>
	</div>

	{#if loading}
		<p>Loading products...</p>
	{:else if error}
		<p class="text-red-500">Error: {error}</p>
	{:else if productList.length === 0}
		<p>No products found. Create one!</p>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each productList as product (product.id)}
				<div class="border rounded-lg p-4 shadow hover:shadow-md transition-shadow">
					<h2 class="text-xl font-semibold mb-2">{product.name}</h2>
					{#if product.overview}
						<p class="text-gray-600 dark:text-gray-400 mb-1 line-clamp-2">{product.overview}</p>
					{/if}
                    {#if product.industry}
						<p class="text-sm text-gray-500 dark:text-gray-500 mb-3">Industry: {product.industry}</p>
					{/if}
					<div class="flex justify-end space-x-2 mt-4">
						<Button variant="outline" onclick={() => viewProduct(product.id)}>View</Button>
						<Button variant="secondary" onclick={() => editProduct(product.id)}>Edit</Button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
