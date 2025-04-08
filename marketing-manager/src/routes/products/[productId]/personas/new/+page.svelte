<script lang="ts">
	import { page } from '$app/stores';
	import PersonaForm from '$lib/components/personas/PersonaForm.svelte';
	import { AlertCircle } from 'lucide-svelte';

	let productId: number | null = $state(null);
	let errorMessage = $state<string | null>(null);

	// Extract productId from route params
	$effect(() => {
		const idParam = $page.params.productId;
		const parsedId = idParam ? parseInt(idParam, 10) : NaN;
		if (!isNaN(parsedId)) {
			productId = parsedId;
			errorMessage = null; // Clear error if ID is valid
		} else {
			productId = null;
			errorMessage = 'Invalid or missing Product ID in the URL.';
			console.error(errorMessage);
		}
	});

	// Define dynamic URLs based on productId
	let apiBaseUrl = $derived(productId ? `/api/products/${productId}/personas` : '');
	let generateApiUrl = $derived(productId ? `/api/products/${productId}/personas/generate` : '');
	let cancelUrl = $derived(productId ? `/products/${productId}` : '/products'); // Fallback

	// Define the success URL function for this context
	function getSuccessUrl(id: number): string {
		// Ensure productId is available when constructing the URL
		const currentProductId = productId; // Capture current value
		if (currentProductId) {
			return `/products/${currentProductId}/personas/${id}`;
		}
		// Fallback, though should ideally not happen if submission succeeded
		console.error("ProductId missing when constructing success URL");
		return `/products`;
	}

</script>

<svelte:head>
	<title>Create New Persona {productId ? `for Product ${productId}` : ''}</title>
</svelte:head>

<div class="container mx-auto max-w-3xl py-8">
	<h1 class="mb-6 text-2xl font-bold">Create New Persona {productId ? `(for Product ${productId})` : ''}</h1>

	{#if errorMessage}
		<div class="mb-4 flex items-center rounded border border-red-500 bg-red-50 p-3 text-sm text-red-700">
			<AlertCircle class="mr-2 h-4 w-4 flex-shrink-0" />
			<span>{errorMessage}</span>
		</div>
	{:else if productId !== null} <!-- Only render form if productId is valid -->
		<PersonaForm
			{productId}
			{apiBaseUrl}
			{generateApiUrl}
			{cancelUrl}
			successUrl={getSuccessUrl}
		/>
	{:else}
		<!-- Optional: Show a loading state while productId is being parsed -->
		<p>Loading product context...</p>
	{/if}
</div>
