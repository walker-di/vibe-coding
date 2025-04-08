<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft, AlertCircle, Trash2, Edit, User, FileText, Image, Video, Link as LinkIcon } from 'lucide-svelte'; // Add creative icons
	import type { personas as personasTable, creatives as creativesTable } from '$lib/server/db/schema'; // Add creatives table type
	import type { InferSelectModel } from 'drizzle-orm';
	import PersonaDetailView from '$lib/components/personas/PersonaDetailView.svelte'; // Import the new component

	type Persona = InferSelectModel<typeof personasTable>;
	// Basic type for creative list items
	type CreativeListItem = {
		id: number;
		name: string;
		type: typeof creativesTable.$inferSelect.type; // Use enum type
		description: string | null;
	};

	// --- State ---
	let persona = $state<Persona | null>(null);
	let isLoading = $state(true); // Loading state for persona
	let error = $state<string | null>(null); // Error state for persona
	let isDeleting = $state(false);

	// State for associated creatives
	let associatedCreatives = $state<CreativeListItem[]>([]);
	let creativesLoading = $state<boolean>(true);
	let creativesError = $state<string | null>(null);

	// Store route params
	let productId: number | null = $state(null);
	let personaId: number | null = $state(null);

	// --- Data Fetching ---
	$effect(() => {
		const productIdParam = $page.params.productId;
		const personaIdParam = $page.params.personaId;

		const parsedProductId = productIdParam ? parseInt(productIdParam, 10) : NaN;
		const parsedPersonaId = personaIdParam ? parseInt(personaIdParam, 10) : NaN;

		// Update state only if IDs change and are valid
		let needsFetch = false;
		if (!isNaN(parsedProductId) && productId !== parsedProductId) {
			productId = parsedProductId;
			needsFetch = true;
		}
		if (!isNaN(parsedPersonaId) && personaId !== parsedPersonaId) {
			personaId = parsedPersonaId;
			needsFetch = true;
		}

		// Handle invalid ID cases early
		if (isNaN(parsedProductId) || isNaN(parsedPersonaId)) {
			error = 'Invalid Product or Persona ID in URL';
			isLoading = false;
			persona = null;
			productId = isNaN(parsedProductId) ? null : productId; // Keep valid ID if one exists
			personaId = isNaN(parsedPersonaId) ? null : personaId;
			return; // Stop effect if IDs are invalid
		}

		// Trigger fetches if IDs are valid and changed
		if (needsFetch) {
			// Reset creative list state when IDs change
			associatedCreatives = [];
			creativesError = null;
			creativesLoading = true;

			// Fetch persona and creatives
			fetchPersona(parsedProductId, parsedPersonaId);
			// We fetch creatives *after* persona is confirmed to exist and belong to product
		}
	});

	async function fetchPersona(prodId: number, persId: number) {
		isLoading = true;
		error = null;
		persona = null; // Clear previous data
		// Reset creative state as well, as it depends on the persona
		associatedCreatives = [];
		creativesError = null;
		creativesLoading = true;

		try {
			// Use nested API endpoint
			const response = await fetch(`/api/products/${prodId}/personas/${persId}`);
			if (response.status === 404) {
				throw new Error('Persona not found for this product');
			}
			if (!response.ok) {
				const errResult = await response.json().catch(() => ({}));
				throw new Error(errResult.message || `HTTP error! status: ${response.status}`);
			}
			const data: Persona = await response.json();
			// Double-check if the fetched persona matches the expected product ID (API should enforce this too)
			if (data.productId !== prodId) {
				throw new Error('Persona does not belong to the specified product.');
			}
			persona = data;
			// If persona fetch was successful, fetch creatives
			await fetchCreatives(persId);
		} catch (e: any) {
			console.error(`Failed to fetch persona ${persId} for product ${prodId}:`, e);
			error = e.message || 'Failed to load persona details.';
			creativesLoading = false; // Stop creative loading if persona fails
		} finally {
			isLoading = false; // Mark persona loading as done
		}
	}

	async function fetchCreatives(personaId: number) {
		console.log('fetchCreatives called for personaId', personaId);
		creativesError = null;
		creativesLoading = true; // Ensure loading is true before fetch
		try {
			// Use the top-level creatives API with a query parameter
			const response = await fetch(`/api/creatives?personaId=${personaId}`);
			if (!response.ok) {
				// Allow 404 (no creatives found)
				if (response.status === 404) {
					associatedCreatives = [];
					return;
				}
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			associatedCreatives = await response.json();
		} catch (e: any) {
			console.error(`Failed to fetch creatives for persona ${personaId}:`, e);
			creativesError = e.message || 'Failed to load associated creatives.';
			associatedCreatives = [];
		} finally {
			creativesLoading = false;
		}
	}


	// --- Delete Logic ---
	async function handleDelete() {
		// Use state variables for IDs
		if (!persona || !productId || !personaId || isDeleting) return;

		if (!confirm(`Are you sure you want to delete the persona "${persona.name}"? This cannot be undone.`)) {
			return;
		}

		isDeleting = true;
		error = null;

		try {
			// Use nested API endpoint
			const response = await fetch(`/api/products/${productId}/personas/${personaId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errResult = await response.json().catch(() => ({}));
				throw new Error(errResult.message || `Failed to delete persona. Status: ${response.status}`);
			}

			// Navigate back to the product detail page
			await goto(`/products/${productId}`);

		} catch (e: any) {
			console.error('Failed to delete persona:', e);
			error = e.message || 'Failed to delete persona.';
		} finally {
			isDeleting = false;
		}
	}

	// --- Computed properties for navigation ---
	const backLink = $derived(productId ? `/products/${productId}` : '/products');
	// Return undefined for href if IDs are missing, causing Button to render a <button>
	const editLink = $derived(productId && personaId ? `/products/${productId}/personas/${personaId}/edit` : undefined);

</script>

<div class="container mx-auto max-w-4xl py-8">
	<div class="mb-6">
		<!-- Use derived back link -->
		<Button href={backLink} variant="outline">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Product
		</Button>
	</div>

	{#if isLoading}
		<div class="flex justify-center p-12">
			<p>Loading persona details...</p>
			<!-- TODO: Add spinner -->
		</div>
	{:else if error}
		<div class="flex flex-col items-center justify-center rounded border border-dashed border-red-500 bg-red-50 p-12 text-center text-red-700">
			<AlertCircle class="mb-2 h-8 w-8" />
			<h3 class="text-xl font-semibold">Error Loading Persona</h3>
			<p class="mb-4 text-sm">{error}</p>
			<!-- Use derived back link -->
			<Button href={backLink} variant="outline">Go Back</Button>
		</div>
	{:else if persona}
		<div class="rounded border p-6 shadow">
			<!-- Action Buttons (kept here for route context) -->
			<div class="mb-6 flex justify-end gap-2">
				<Button variant="outline" href={editLink} disabled={!editLink}>
					<Edit class="mr-2 h-4 w-4" />
					Edit
				</Button>
				<Button variant="destructive" onclick={handleDelete} disabled={isDeleting || !productId || !personaId}>
					{#if isDeleting}
						Deleting...
					{:else}
						<Trash2 class="mr-2 h-4 w-4" />
						Delete
					{/if}
				</Button>
			</div>

			<!-- Use the PersonaDetailView component -->
			<PersonaDetailView
				{persona}
				{associatedCreatives}
				{creativesLoading}
				{creativesError}
				{productId}
				{personaId}
				showCreativesSection={true}
			/>

			<!-- "Create New Creative" button remains here, outside the detail view component -->
			<div class="mt-8 pt-6 border-t">
				<div class="flex justify-end items-center">
					{#if productId && personaId}
						<Button href={`/products/${productId}/personas/${personaId}/creatives/new`}>
							Create New Creative
						</Button>
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<!-- Fallback if not loading and no error, but persona is null -->
		<div class="rounded border border-dashed p-12 text-center">
			<h2 class="text-xl font-semibold">Persona Not Found</h2>
			<p class="text-muted-foreground">The requested persona could not be found.</p>
		</div>
	{/if}
</div>
