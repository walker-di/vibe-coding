<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/button/Button.svelte';
	import ProductForm from '$lib/components/products/ProductForm.svelte'; // Import shared form
	import type { ProductPayload, ProductInputData } from '$lib/types/product.types'; // Import types
	import { AlertCircle, ArrowLeft, Trash2 } from 'lucide-svelte'; // Import icons

	// --- State ---
	let productId = $state<number | null>(null);
	let initialFormData = $state<ProductInputData | null>(null); // Store fetched data for the form
	let productName = $state<string>(''); // Store name separately for title/confirmation

	let error = $state<string | null>(null);
	let loading = $state<boolean>(true);
	let isSubmitting = $state<boolean>(false); // For PUT request
	let isDeleting = $state<boolean>(false); // For DELETE request
	let formErrors = $state<Record<string, any>>({}); // Errors specifically for the form submission

	// --- Data Fetching ---
	$effect(() => {
		const idParam = $page.params.productId;
		const parsedId = idParam ? parseInt(idParam, 10) : NaN;

		// Reset state for new fetch attempt or invalid ID
		productId = null;
		initialFormData = null;
		productName = '';
		error = null;
		loading = true;

		if (isNaN(parsedId)) {
			error = 'Invalid Product ID format in URL.';
			loading = false;
		} else {
			productId = parsedId;
			// Valid ID, trigger fetch
			(async () => {
				await fetchProduct(productId);
			})();
		}
	});

	async function fetchProduct(id: number) {
		try {
			const response = await fetch(`/api/products/${id}`);
			if (response.status === 404) throw new Error('Product not found.');
			if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

			const productData: ProductInputData & { id: number; name: string } = await response.json();
			initialFormData = productData; // Set data for the form
			productName = productData.name; // Store name for display

		} catch (e: any) {
			console.error(`Failed to fetch product ${id}:`, e);
			error = e.message || 'Failed to load product details.';
			initialFormData = null; // Ensure form data is null on error
		} finally {
			loading = false;
		}
	}

	// --- Form Submission (Update) ---
	async function handleUpdateSubmit(payload: ProductPayload) {
		if (!productId) return; // Should have ID if form is rendered

		formErrors = {}; // Clear previous form errors
		error = null; // Clear general page error
		isSubmitting = true;

		// Basic client-side validation
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
			// Ensure server error is set if not already
			if (!formErrors.server) {
				formErrors = { ...formErrors, server: e.message || 'An unexpected error occurred during update.' };
			}
		} finally {
			isSubmitting = false;
		}
	}

	// --- Delete Logic ---
	async function handleDelete() {
		if (!productId || isDeleting || isSubmitting) return;

		if (!confirm(`Are you sure you want to delete the product "${productName}"? This action cannot be undone.`)) {
			return;
		}

		error = null; // Clear general page error
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
			error = e.message || 'An unexpected error occurred during deletion.'; // Show general error
		} finally {
			isDeleting = false;
		}
	}

	// --- Cancel Handler ---
	function handleCancel() {
		if (productId) {
			goto(`/products/${productId}`);
		} else {
			goto('/products');
		}
	}
</script>

<svelte:head>
	<title>{loading ? 'Loading...' : `Edit Product: ${productName || '...'}`}</title>
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

	<h1 class="text-2xl font-bold mb-6">Edit Product {productName ? `"${productName}"` : ''}</h1>

	{#if loading}
		<p class="text-center">Loading product data...</p>
	{:else if error && !initialFormData}
		<!-- Show initial loading error -->
		<div class="flex flex-col items-center justify-center rounded border border-dashed border-red-500 bg-red-50 p-12 text-center text-red-700">
			<AlertCircle class="mb-2 h-8 w-8" />
			<h3 class="text-xl font-semibold">Error Loading Product</h3>
			<p class="mb-4 text-sm">{error}</p>
			<Button href="/products" variant="outline">Back to Products List</Button>
		</div>
	{:else if initialFormData}
		<!-- General Error Display (for delete/update errors) -->
		{#if error}
			<div class="mb-4 flex items-center rounded border border-red-500 bg-red-50 p-3 text-sm text-red-700">
				<AlertCircle class="mr-2 h-4 w-4 flex-shrink-0" />
				<span>{error}</span>
			</div>
		{/if}

		<!-- Render the shared ProductForm -->
		<ProductForm
			initialData={initialFormData}
			onSubmit={handleUpdateSubmit}
			onCancel={handleCancel}
			isSubmitting={isSubmitting}
			formErrors={formErrors}
		/>

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
		<!-- Fallback if loading finished but initialFormData is still null -->
		<p class="text-center text-red-600">Could not load product data.</p>
	{/if}
</div>
