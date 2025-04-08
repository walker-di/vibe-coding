<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft, AlertCircle, Trash2, Edit } from 'lucide-svelte';
	// Import base and specific types from schema
	import type {
		creatives as creativesTable,
		campaigns as campaignsTable,
		personas as personasTable,
		themes as themesTable,
		creativeText as creativeTextTable,
		creativeImage as creativeImageTable,
		creativeVideo as creativeVideoTable,
		creativeLp as creativeLpTable,
		videoTemplates as videoTemplatesTable
	} from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';
	import CreativeDetailView from '$lib/components/creatives/CreativeDetailView.svelte'; // Import the shared component

	// --- Types ---
	// Define a comprehensive type matching the one expected by CreativeDetailView
	type CreativeDetail = InferSelectModel<typeof creativesTable> & {
		campaign: Pick<InferSelectModel<typeof campaignsTable>, 'id' | 'name'> | null;
		persona: Pick<InferSelectModel<typeof personasTable>, 'id' | 'name' | 'productId'> | null;
		theme: Pick<InferSelectModel<typeof themesTable>, 'id' | 'title'> | null;
		textData: InferSelectModel<typeof creativeTextTable> | null;
		imageData: InferSelectModel<typeof creativeImageTable> | null;
		videoData: (InferSelectModel<typeof creativeVideoTable> & {
			videoTemplate: Pick<InferSelectModel<typeof videoTemplatesTable>, 'id' | 'name' | 'templateCode'> | null;
		}) | null;
		lpData: InferSelectModel<typeof creativeLpTable> | null;
	};

	// --- State ---
	let creative = $state<CreativeDetail | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null); // For fetch errors or validation errors
	let isDeleting = $state(false);

	// Route params state
	let productId: number | null = $state(null);
	let personaId: number | null = $state(null);
	let creativeId: number | null = $state(null);
	let routeError = $state<string | null>(null);

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
			routeError = 'Invalid Product, Persona, or Creative ID in URL.';
			productId = null;
			personaId = null;
			creativeId = null;
			isLoading = false;
			return;
		}

		// Only update state and fetch if IDs have changed or are initially set
		if (productId !== parsedProductId || personaId !== parsedPersonaId || creativeId !== parsedCreativeId) {
			routeError = null;
			productId = parsedProductId;
			personaId = parsedPersonaId;
			creativeId = parsedCreativeId;
			fetchCreativeDetail(parsedCreativeId, parsedPersonaId); // Pass personaId for validation
		}
	});

	async function fetchCreativeDetail(cId: number, expectedPersonaId: number) {
		isLoading = true;
		error = null;
		creative = null;

		try {
			const response = await fetch(`/api/creatives/${cId}`);
			if (response.status === 404) {
				throw new Error('Creative not found');
			}
			if (!response.ok) {
				const errResult = await response.json().catch(() => ({}));
				throw new Error(errResult.message || `HTTP error! status: ${response.status}`);
			}
			const data: CreativeDetail = await response.json();

			// **Validation Step:** Check if the fetched creative belongs to the expected persona
			if (data.personaId !== expectedPersonaId) {
				console.error(`Creative ${cId} personaId (${data.personaId}) does not match expected personaId (${expectedPersonaId})`);
				throw new Error('This creative does not belong to the specified persona.');
			}

			// Also ensure the persona data includes the correct productId for link generation
			if (data.persona?.productId !== productId) {
				console.warn(`Creative ${cId}'s persona (${data.personaId}) has mismatching productId (${data.persona?.productId}) compared to route productId (${productId}). Links might be incorrect.`);
				// Decide if this should be a hard error or just a warning
				// throw new Error('Creative data inconsistency: Persona does not belong to the specified product.');
			}


			creative = data;
		} catch (e: any) {
			console.error(`Failed to fetch creative details for creative ${cId}:`, e);
			error = e.message || 'Failed to load creative details.';
		} finally {
			isLoading = false;
		}
	}

	// --- Delete Logic ---
	async function handleDelete() {
		// Use state variables for IDs
		if (!creative || !productId || !personaId || !creativeId || isDeleting) return;

		if (!confirm(`Are you sure you want to delete the creative "${creative.name}"? This cannot be undone.`)) {
			return;
		}

		isDeleting = true;
		error = null;

		try {
			const response = await fetch(`/api/creatives/${creativeId}`, { // Use creativeId from state
				method: 'DELETE'
			});

			if (!response.ok) {
				const errResult = await response.json().catch(() => ({}));
				throw new Error(errResult.message || `Failed to delete creative. Status: ${response.status}`);
			}

			// Navigate back to the parent persona page
			await goto(`/products/${productId}/personas/${personaId}`);

		} catch (e: any) {
			console.error('Failed to delete creative:', e);
			error = e.message || 'Failed to delete creative.';
		} finally {
			isDeleting = false;
		}
	}

	// --- Computed Links ---
	const backLink = $derived(productId && personaId ? `/products/${productId}/personas/${personaId}` : '/products');
	const editLink = $derived(productId && personaId && creativeId ? `/products/${productId}/personas/${personaId}/creatives/${creativeId}/edit` : undefined);

</script>

<div class="container mx-auto max-w-4xl py-8">
	<div class="mb-6">
		<Button href={backLink} variant="outline">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Persona
		</Button>
	</div>

	{#if isLoading}
		<div class="flex justify-center p-12">
			<p>Loading creative details...</p>
			<!-- TODO: Add spinner -->
		</div>
	{:else if routeError}
		<div class="flex flex-col items-center justify-center rounded border border-dashed border-red-500 bg-red-50 p-12 text-center text-red-700">
			<AlertCircle class="mb-2 h-8 w-8" />
			<h3 class="text-xl font-semibold">Invalid Route</h3>
			<p class="mb-4 text-sm">{routeError}</p>
			<Button href="/products" variant="outline">Go to Products</Button>
		</div>
	{:else if error}
		<div class="flex flex-col items-center justify-center rounded border border-dashed border-red-500 bg-red-50 p-12 text-center text-red-700">
			<AlertCircle class="mb-2 h-8 w-8" />
			<h3 class="text-xl font-semibold">Error Loading Creative</h3>
			<p class="mb-4 text-sm">{error}</p>
			<Button href={backLink} variant="outline">Go Back</Button>
		</div>
	{:else if creative}
		<div class="space-y-6 rounded border p-6 shadow">
			<!-- Action buttons specific to this nested route -->
			<div class="flex justify-end gap-2">
				<Button variant="outline" href={editLink} disabled={!editLink}>
					<Edit class="mr-2 h-4 w-4" />
					Edit
				</Button>
				<Button variant="destructive" onclick={handleDelete} disabled={isDeleting}>
					{#if isDeleting}
						Deleting...
					{:else}
						<Trash2 class="mr-2 h-4 w-4" />
						Delete
					{/if}
				</Button>
			</div>

			<!-- Use the shared detail view component -->
			<CreativeDetailView {creative} />

		</div>
	{:else}
		<!-- Fallback if not loading and no error, but creative is null -->
		<div class="rounded border border-dashed p-12 text-center">
			<h2 class="text-xl font-semibold">Creative Not Found</h2>
			<p class="text-muted-foreground">The requested creative could not be found or does not belong to this persona.</p>
		</div>
	{/if}
</div>
