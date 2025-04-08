<script lang="ts">
	import { page } from '$app/stores'; // Ensure page is imported
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { AlertCircle, ArrowLeft } from 'lucide-svelte';
	// Import types
	import type {
		creatives as creativesTable,
		campaigns as campaignsTable,
		personas as personasTable,
		themes as themesTable,
		videoTemplates as videoTemplatesTable,
		creativeText as creativeTextTable,
		creativeImage as creativeImageTable,
		creativeVideo as creativeVideoTable,
		creativeLp as creativeLpTable
	} from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';
	import CreativeForm from '$lib/components/creatives/CreativeForm.svelte'; // Import shared form

	// --- Types ---
	type Campaign = Pick<InferSelectModel<typeof campaignsTable>, 'id' | 'name'>;
	type Persona = Pick<InferSelectModel<typeof personasTable>, 'id' | 'name'>; // Only need id/name for list
	type Theme = Pick<InferSelectModel<typeof themesTable>, 'id' | 'title'>;
	type VideoTemplate = Pick<InferSelectModel<typeof videoTemplatesTable>, 'id' | 'name' | 'templateCode' | 'previewUrl'>;

	// Type for the data fetched initially
	type CreativeEditData = InferSelectModel<typeof creativesTable> & {
		textData: InferSelectModel<typeof creativeTextTable> | null;
		imageData: InferSelectModel<typeof creativeImageTable> | null;
		videoData: InferSelectModel<typeof creativeVideoTable> | null;
		lpData: InferSelectModel<typeof creativeLpTable> | null;
	};

	// --- State ---
	// Route params
	let productId: number | null = $state(null);
	let personaId: number | null = $state(null);
	let creativeId: number | null = $state(null);

	// Dropdown Data
	let campaignsList = $state<Campaign[]>([]);
	let themesList = $state<Theme[]>([]);
	let videoTemplatesList = $state<VideoTemplate[]>([]);

	// UI State
	let isLoading = $state(true);
	let isLoadingDropdowns = $state(true);
	let dropdownError = $state<string | null>(null);
	let isSubmitting = $state(false);
	let formErrors = $state<Record<string, any>>({});
	let fetchError = $state<string | null>(null); // For initial fetch or validation errors
	let initialFormData = $state<CreativeEditData | null>(null);

	// --- Data Fetching & Validation ---
	$effect(() => {
		const productIdParam = $page.params.productId;
		const personaIdParam = $page.params.personaId;
		const creativeIdParam = $page.params.creativeId;

		const parsedProductId = productIdParam ? parseInt(productIdParam, 10) : NaN;
		const parsedPersonaId = personaIdParam ? parseInt(personaIdParam, 10) : NaN;
		const parsedCreativeId = creativeIdParam ? parseInt(creativeIdParam, 10) : NaN;

		// Validate all IDs first
		if (isNaN(parsedProductId) || isNaN(parsedPersonaId) || isNaN(parsedCreativeId)) {
			fetchError = 'Invalid Product, Persona, or Creative ID in URL.';
			productId = null;
			personaId = null;
			creativeId = null;
			isLoading = false;
			isLoadingDropdowns = false;
			return;
		}

		// Only update state and fetch if IDs have changed or are initially set
		if (productId !== parsedProductId || personaId !== parsedPersonaId || creativeId !== parsedCreativeId) {
			fetchError = null; // Clear previous errors
			dropdownError = null;
			productId = parsedProductId;
			personaId = parsedPersonaId;
			creativeId = parsedCreativeId;
			loadInitialData(parsedCreativeId, parsedPersonaId); // Pass personaId for validation
		}
	});

	async function loadInitialData(cId: number, expectedPersonaId: number) {
		isLoading = true;
		isLoadingDropdowns = true;
		fetchError = null;
		dropdownError = null;
		formErrors = {};
		initialFormData = null;

		try {
			// Fetch creative details and dropdown data concurrently
			const [creativeRes, campaignsRes, themesRes, videoTemplatesRes] = await Promise.all([
				fetch(`/api/creatives/${cId}`),
				fetch('/api/campaigns'),
				fetch('/api/themes'),
				fetch('/api/video-templates')
				// No need to fetch personas list for this form
			]);

			// Handle dropdown errors first
			let dropdownFetchError = null;
			if (!campaignsRes.ok) dropdownFetchError = `Failed to load campaigns (${campaignsRes.status})`;
			if (!themesRes.ok) dropdownFetchError = `Failed to load themes (${themesRes.status})`;
			if (!videoTemplatesRes.ok) dropdownFetchError = `Failed to load video templates (${videoTemplatesRes.status})`;

			if (dropdownFetchError) {
				throw new Error(dropdownFetchError);
			}

			campaignsList = await campaignsRes.json();
			themesList = await themesRes.json();
			videoTemplatesList = await videoTemplatesRes.json();
			isLoadingDropdowns = false;

			// Handle creative fetch error
			if (creativeRes.status === 404) throw new Error('Creative not found');
			if (!creativeRes.ok) {
				const errResult = await creativeRes.json().catch(() => ({}));
				throw new Error(errResult.message || `HTTP error! status: ${creativeRes.status}`);
			}

			const data: CreativeEditData = await creativeRes.json();

			// **Validation Step:** Check if the fetched creative belongs to the expected persona
			if (data.personaId !== expectedPersonaId) {
				console.error(`Creative ${cId} personaId (${data.personaId}) does not match expected personaId (${expectedPersonaId})`);
				throw new Error('This creative does not belong to the specified persona.');
			}

			initialFormData = data; // Store fetched data for passing to the form component

		} catch (e: any) {
			console.error('Failed to load edit data:', e);
			if (isLoadingDropdowns) {
				dropdownError = e.message || 'Failed to load dropdown data.';
			} else {
				fetchError = e.message || 'Failed to load creative data.';
			}
		} finally {
			isLoading = false;
			isLoadingDropdowns = false; // Ensure this is false even on error
		}
	}

	// --- Form Submission ---
	async function handleSubmit(formData: Record<string, any>) {
		if (!creativeId || !productId || !personaId) return; // Guard against invalid state

		isSubmitting = true;
		formErrors = {};
		fetchError = null;

		// Ensure the correct personaId is included (should already be in formData from CreativeForm)
		// formData.personaId = personaId; // This line is redundant if CreativeForm includes it

		try {
			const response = await fetch(`/api/creatives/${creativeId}`, {
				method: 'PUT',
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

			// Navigate back to the nested creative detail page
			await goto(`/products/${productId}/personas/${personaId}/creatives/${creativeId}`);

		} catch (e: any) {
			console.error('Creative update error:', e);
			formErrors = { server: 'Failed to submit form. Please check your connection.' };
		} finally {
			isSubmitting = false;
		}
	}

	// --- Cancel Handler ---
	function handleCancel() {
		if (productId && personaId && creativeId) {
			goto(`/products/${productId}/personas/${personaId}/creatives/${creativeId}`);
		} else if (productId && personaId) {
			// Fallback to persona page if creativeId is somehow missing
			goto(`/products/${productId}/personas/${personaId}`);
		} else {
			goto('/products'); // Absolute fallback
		}
	}

	// --- Computed Back Link ---
	const backLink = $derived(productId && personaId && creativeId ? `/products/${productId}/personas/${personaId}/creatives/${creativeId}` :
							  productId && personaId ? `/products/${productId}/personas/${personaId}` : '/products');

</script>

<div class="container mx-auto max-w-2xl py-8">
	<div class="mb-6">
		<Button href={backLink} variant="outline">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Creative
		</Button>
	</div>

	<h1 class="mb-6 text-2xl font-bold">Edit Creative</h1>

	{#if isLoading}
		<div class="flex justify-center p-12">
			<p>Loading creative data...</p>
		</div>
	{:else if fetchError}
		<div class="flex flex-col items-center justify-center rounded border border-dashed border-red-500 bg-red-50 p-12 text-center text-red-700">
			<AlertCircle class="mb-2 h-8 w-8" />
			<h3 class="text-xl font-semibold">Error Loading Data</h3>
			<p class="mb-4 text-sm">{fetchError}</p>
			<Button href={backLink} variant="outline">Go Back</Button>
		</div>
	{:else if initialFormData}
		{#if formErrors.server}
			<div class="mb-4 flex items-center rounded border border-red-500 bg-red-50 p-3 text-sm text-red-700">
				<AlertCircle class="mr-2 h-4 w-4 flex-shrink-0" />
				<span>{formErrors.server}</span>
			</div>
		{/if}

		<CreativeForm
			initialData={initialFormData}
			{campaignsList}
			{themesList}
			{videoTemplatesList}
			{isLoadingDropdowns}
			{dropdownError}
			onSubmit={handleSubmit}
			onCancel={handleCancel}
			isSubmitting={isSubmitting}
			formErrors={formErrors}
			{personaId}
			{productId}
		/>
	{:else}
		<div class="flex justify-center p-12">
			<p>Creative data not available.</p>
		</div>
	{/if}
</div>
