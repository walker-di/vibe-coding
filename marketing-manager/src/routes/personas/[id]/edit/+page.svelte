<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import PersonaForm from '$lib/components/personas/PersonaForm.svelte'; // Import the shared form
	import { type personas as personasTable } from '$lib/server/db/schema';
	import { ArrowLeft, AlertCircle } from 'lucide-svelte';
	import type { InferSelectModel } from 'drizzle-orm';

	type Persona = InferSelectModel<typeof personasTable>;

	// --- State ---
	let personaId: number | null = $state(null);
	let loadedPersona = $state<Persona | null>(null); // State to hold the fetched persona data
	let isLoading = $state(true);
	let error = $state<string | null>(null); // For fetch errors
	let isInitialLoad = $state(true); // Track initial load

	// --- Data Fetching ---
	$effect(() => {
		const idParam = $page.params.id;
		const parsedId = idParam ? parseInt(idParam, 10) : NaN;

		async function fetchPersonaData() {
			isLoading = true;
			error = null;
			// Don't reset loadedPersona here, keep previous data while refetching if ID changes later
			// loadedPersona = null;

			if (isNaN(parsedId)) {
				error = 'Invalid Persona ID in URL.';
				personaId = null;
				isLoading = false;
				isInitialLoad = false;
				return;
			}

			// Only update state and fetch if ID has changed or is initially set
			if (personaId !== parsedId || isInitialLoad) {
				personaId = parsedId; // Update personaId state

				try {
					const response = await fetch(`/api/personas/${personaId}`);
					if (response.status === 404) {
						throw new Error('Persona not found');
					}
					if (!response.ok) {
						const errResult = await response.json().catch(() => ({}));
						throw new Error(errResult.message || `HTTP error! status: ${response.status}`);
					}
					const data: Persona = await response.json();
					loadedPersona = data; // Store fetched data

				} catch (e: any) {
					console.error('Failed to fetch persona data:', e);
					error = e.message || 'Failed to load persona data.';
					loadedPersona = null; // Ensure it's null on error
				} finally {
					isLoading = false;
					isInitialLoad = false; // Mark initial load as complete
				}
			} else {
				// ID hasn't changed and it's not initial load, no need to refetch
				isLoading = false; // Ensure loading is false if we skip fetch
			}
		}

		fetchPersonaData();
	});

	// --- Props for PersonaForm ---
	const apiBaseUrl = '/api/personas'; // Base URL for PUT request
	const cancelUrl = $derived(personaId ? `/personas/${personaId}` : '/personas'); // Back to detail page

	// Success URL function (navigates back to the detail page of the *edited* persona)
	function getSuccessUrl(id: number): string {
		return `/personas/${id}`;
	}

	// Generate API URL (not used in edit mode, but required by the component prop type)
	const generateApiUrl = '';

</script>

<div class="container mx-auto max-w-3xl py-8">
	<div class="mb-6">
		<Button href={cancelUrl} variant="outline">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Persona
		</Button>
	</div>

	<h1 class="mb-6 text-2xl font-bold">Edit Persona {personaId ? `(#${personaId})` : ''}</h1>

	{#if isLoading}
		<div class="flex justify-center p-12">
			<p>Loading persona data...</p>
			<!-- TODO: Add spinner -->
		</div>
	{:else if error} <!-- Handle fetch errors or invalid ID errors -->
		<div class="flex flex-col items-center justify-center rounded border border-dashed border-red-500 bg-red-50 p-12 text-center text-red-700">
			<AlertCircle class="mb-2 h-8 w-8" />
			<h3 class="text-xl font-semibold">Error Loading Data</h3>
			<p class="mb-4 text-sm">{error}</p>
			<Button href="/personas" variant="outline">Go To Personas List</Button>
		</div>
	{:else if loadedPersona} <!-- Only render form if loading is done, no error, and data exists -->
		<PersonaForm
			personaData={loadedPersona}
			{apiBaseUrl}
			{generateApiUrl}
			{cancelUrl}
			successUrl={getSuccessUrl}
		/>
	{:else} <!-- Fallback if not loading, no error, but no data -->
		<div class="flex flex-col items-center justify-center rounded border border-dashed border-gray-300 p-12 text-center text-gray-500">
			<p>Could not load persona data. The persona may not exist or the ID might be incorrect.</p>
		</div>
	{/if}
</div>
