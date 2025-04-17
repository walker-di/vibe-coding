<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { AlertCircle, ArrowLeft } from 'lucide-svelte';
	// Import types needed for dropdown data
	import type { campaigns} from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';
	import CreativeForm from '$lib/components/creatives/CreativeForm.svelte'; // Import the shared form component

	// --- Types ---
	type Campaign = Pick<InferSelectModel<typeof campaigns>, 'id' | 'name'>;

	// --- State ---
	// Route params
	let productId: number | null = $state(null);
	let personaId: number | null = $state(null);

	// Dropdown Data
	let campaignsList = $state<Campaign[]>([]);


	// UI State
	let isLoadingDropdowns = $state(true);
	let dropdownError = $state<string | null>(null);
	let isSubmitting = $state(false);
	let formErrors = $state<Record<string, any>>({});
	let routeError = $state<string | null>(null); // For invalid route param errors

	// --- Route Param Handling ---
	$effect(() => {
		const productIdParam = $page.params.productId;
		const personaIdParam = $page.params.personaId;

		const parsedProductId = productIdParam ? parseInt(productIdParam, 10) : NaN;
		const parsedPersonaId = personaIdParam ? parseInt(personaIdParam, 10) : NaN;

		if (isNaN(parsedProductId) || isNaN(parsedPersonaId)) {
			routeError = 'Invalid Product or Persona ID in URL.';
			productId = null;
			personaId = null;
			isLoadingDropdowns = false; // Stop loading if route is invalid
		} else {
			routeError = null;
			productId = parsedProductId;
			personaId = parsedPersonaId;
			// Fetch dropdowns only if IDs are valid
			fetchDropdownData();
		}
	});

	// --- Data Fetching for Dropdowns ---
	async function fetchDropdownData() {
		// Don't fetch if already loading or if route params are invalid
		if (isLoadingDropdowns === false || routeError) return;

		isLoadingDropdowns = true;
		dropdownError = null;
		try {
			// Fetch only necessary lists for the form
			const campaignsRes = await fetch('/api/campaigns');

			if (!campaignsRes.ok) throw new Error(`Failed to load campaigns (${campaignsRes.status})`);

			campaignsList = await campaignsRes.json();

		} catch (e: any) {
			console.error("Failed to load dropdown data:", e);
			dropdownError = e.message || "Failed to load data for dropdowns.";
		} finally {
			isLoadingDropdowns = false;
		}
	}

	// --- Form Submission ---
	async function handleSubmit(formData: Record<string, any>) {
		if (!productId || !personaId) {
			formErrors = { server: 'Cannot submit form due to invalid Product or Persona ID.' };
			return;
		}

		isSubmitting = true;
		formErrors = {}; // Clear previous errors

		// The CreativeForm component includes the personaId in the formData payload

		try {
			const response = await fetch('/api/creatives', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData)
			});

			const result = await response.json();

			if (!response.ok) {
				if (response.status === 400 && result.errors) {
					formErrors = result.errors;
				} else {
					formErrors = { server: result.message || 'An unknown server error occurred.' };
				}
				console.log("Form Errors:", formErrors);
				return;
			}

			// Navigate back to the persona detail page on success
			await goto(`/products/${productId}/personas/${personaId}`);

		} catch (e: any) {
			console.error('Creative submission error:', e);
			formErrors = { server: 'Failed to submit form. Please check your connection or review server logs.' };
		} finally {
			isSubmitting = false;
		}
	}

	// --- Cancel Handler ---
	function handleCancel() {
		if (productId && personaId) {
			goto(`/products/${productId}/personas/${personaId}`);
		} else {
			// Fallback if IDs are somehow invalid, go to products list
			goto('/products');
		}
	}

	// --- Computed Back Link ---
	const backLink = $derived(productId && personaId ? `/products/${productId}/personas/${personaId}` : '/products');

</script>

<div class="container mx-auto max-w-2xl py-8">
	<div class="mb-6">
		<Button href={backLink} variant="outline">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Persona
		</Button>
	</div>

	<h1 class="mb-6 text-2xl font-bold">Create New Creative</h1>
	{#if productId && personaId}
		<p class="mb-4 text-sm text-muted-foreground">For Persona ID: {personaId} (under Product ID: {productId})</p>
	{/if}

	{#if routeError}
		<div class="mb-4 flex items-center rounded border border-red-500 bg-red-50 p-3 text-sm text-red-700">
			<AlertCircle class="mr-2 h-4 w-4 flex-shrink-0" />
			<span>{routeError} Cannot load form.</span>
		</div>
	{:else}
		<!-- Display server errors for the form -->
		{#if formErrors.server}
			<div class="mb-4 flex items-center rounded border border-red-500 bg-red-50 p-3 text-sm text-red-700">
				<AlertCircle class="mr-2 h-4 w-4 flex-shrink-0" />
				<span>{formErrors.server}</span>
			</div>
		{/if}

		<!-- Use the CreativeForm component -->
		<CreativeForm
			{campaignsList}
			{isLoadingDropdowns}
			{dropdownError}
			onSubmit={handleSubmit}
			onCancel={handleCancel}
			isSubmitting={isSubmitting}
			formErrors={formErrors}
			{personaId}
			{productId}
		/>
	{/if}
</div>
