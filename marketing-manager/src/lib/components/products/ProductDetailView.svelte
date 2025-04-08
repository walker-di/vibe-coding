<script lang="ts">
	import type { products } from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';

	type Product = InferSelectModel<typeof products>;

	// --- Props ---
	type Props = { product: Product };
	let { product }: Props = $props();

	// --- Helper ---
	// Helper to format text with line breaks
	function formatMultilineText(text: string | null | undefined): string {
		return text ? text.replace(/\n/g, '<br>') : '';
	}
</script>

<!-- Display Logic extracted from the page -->
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
</div>
