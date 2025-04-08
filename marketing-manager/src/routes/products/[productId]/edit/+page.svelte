<script lang="ts">
	import { page } from '$app/stores'; // Keep page store if needed elsewhere, though productId comes from data now
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/button/Button.svelte';
	import ProductForm from '$lib/components/products/ProductForm.svelte'; // Import shared form
	import type { ProductPayload } from '$lib/types/product.types'; // Only need ProductPayload here now
	import { AlertCircle, ArrowLeft, Trash2 } from 'lucide-svelte'; // Import icons
	import type { PageData } from './$types'; // Import PageData type

	// --- Props (from load function) ---
	let { data }: { data: PageData } = $props();
	// Access loaded data: data.product, data.productId

	// --- Component State ---
	let isSubmitting = $state<boolean>(false); // For PUT request
	let isDeleting = $state<boolean>(false); // For DELETE request
	let formErrors = $state<Record<string, any>>({}); // Errors specifically for the form submission
	let pageError = $state<string | null>(null); // For general page errors (like delete failure)

	// Derive product name and ID from load data
	const productName = $derived(data.product?.name ?? '...');
	const productId = $derived(data.productId); // Get ID from load data

	// --- Form Submission (Update) ---
	async function handleUpdateSubmit(payload: ProductPayload) {
		// productId is guaranteed by the load function if we reach here
		formErrors = {}; // Clear previous form errors
		pageError = null; // Clear general page error
		isSubmitting = true;

		// Basic client-side validation (can remain)
		if (!payload.name?.trim()) {
			formErrors = { name: 'Product name is required.' };
			isSubmitting = false;
			return;
		}

		try {
			const response = await fetch(`/api/products/${productId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload) // Send payload from form
			});

			const result = await response.json();

			if (!response.ok) {
				if (response.status === 400 && result.errors) {
					formErrors = result.errors; // API validation errors
				} else {
					formErrors = { server: result.message || 'Failed to update product.' };
				}
				throw new Error(formErrors.server || 'Validation failed');
			}

			goto(`/products/${productId}`); // Redirect to the product detail page on success

		} catch (e: any) {
			console.error('Failed to update product:', e);
			// Ensure page error is set if not already (use pageError now)
			if (!formErrors.server) {
				pageError = e.message || 'An unexpected error occurred during update.';
			}
		} finally {
			isSubmitting = false;
		}
	}

	// --- Delete Logic ---
	async function handleDelete() {
		// Use derived productId
		if (!productId || isDeleting || isSubmitting) return;

		if (!confirm(`Are you sure you want to delete the product "${productName}"? This action cannot be undone.`)) {
			return;
		}

		pageError = null; // Clear general page error
		formErrors = {}; // Clear form errors
		isDeleting = true;

		try {
			const response = await fetch(`/api/products/${productId}`, {
				method: 'DELETE'
			});

			if (response.status === 204 || response.ok) { // Handle 204 No Content or 200 OK
				goto('/products'); // Redirect to product list on successful deletion
			} else {
				const errorData = await response.json().catch(() => ({ message: 'Failed to delete product.' }));
				throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
			}

		} catch (e: any) {
			console.error('Failed to delete product:', e);
			pageError = e.message || 'An unexpected error occurred during deletion.'; // Show general error
		} finally {
			isDeleting = false;
		}
	}

	// --- Cancel Handler ---
	function handleCancel() {
		// Use derived productId
		if (productId) {
			goto(`/products/${productId}`);
		} else {
			// Fallback if productId is somehow null (shouldn't happen with load)
			goto('/products');
		}
	}
</script>

<svelte:head>
	<title>Edit Product: {productName}</title>
</svelte:head>

<div class="container mx-auto p-4 md:p-8 max-w-2xl">
	<!-- Back Button -->
	<div class="mb-6">
		<Button
			href={productId ? `/products/${productId}` : '/products'}
			variant="outline"
			aria-disabled={!productId}
			class={!productId ? 'pointer-events-none opacity-50' : ''}
		>
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to {productId ? 'Product' : 'Products'}
		</Button>
	</div>

	<h1 class="text-2xl font-bold mb-6">Edit Product "{productName}"</h1>

	<!-- SvelteKit's load function handles loading/initial errors, so we just check if data.product exists -->
	{#if data.product}
		<!-- General Error Display (for delete/update errors, use pageError) -->
		{#if pageError}
			<div class="mb-4 flex items-center rounded border border-red-500 bg-red-50 p-3 text-sm text-red-700">
				<AlertCircle class="mr-2 h-4 w-4 flex-shrink-0" />
				<span>{pageError}</span>
			</div>
		{/if}

		<!-- Render the shared ProductForm, keyed by productId -->
		{#key productId}
			<ProductForm
				initialName={data.product.name}
				initialDescription={data.product.description}
				initialImageUrl={data.product.imageUrl}
				initialIndustry={data.product.industry}
				initialOverview={data.product.overview}
				initialDetails={data.product.details}
				initialFeaturesStrengths={data.product.featuresStrengths}
				onSubmit={handleUpdateSubmit}
				onCancel={handleCancel}
				isSubmitting={isSubmitting}
				formErrors={formErrors}
			/>
		{/key}

		<!-- Delete Button Section -->
		<div class="mt-8 pt-6 border-t border-dashed border-red-300">
			<h2 class="text-lg font-semibold text-red-700 mb-2">Danger Zone</h2>
			<p class="text-sm text-gray-600 mb-4">Deleting this product cannot be undone.</p>
			<Button
				type="button"
				variant="destructive"
				onclick={handleDelete}
				disabled={isDeleting || isSubmitting}
			>
				{#if isDeleting}
					Deleting...
				{:else}
					<Trash2 class="mr-2 h-4 w-4" />
					Delete Product
				{/if}
			</Button>
		</div>

	{:else}
		<!-- Error handled by load function, this part might not be strictly needed -->
		<!-- but kept as a fallback just in case data.product is null/undefined -->
		<div class="flex flex-col items-center justify-center rounded border border-dashed border-red-500 bg-red-50 p-12 text-center text-red-700">
			<AlertCircle class="mb-2 h-8 w-8" />
			<h3 class="text-xl font-semibold">Error Loading Product</h3>
			<p class="mb-4 text-sm">Could not load product data.</p>
			<Button href="/products" variant="outline">Back to Products List</Button>
		</div>
	{/if}
</div>
