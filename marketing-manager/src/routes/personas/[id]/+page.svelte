<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft, AlertCircle, Trash2, Edit, User } from 'lucide-svelte';
	import type { personas as personasTable } from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';
	import PersonaDetailView from '$lib/components/personas/PersonaDetailView.svelte'; // Import the new component

	type Persona = InferSelectModel<typeof personasTable>;

	// --- State ---
	let persona = $state<Persona | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let isDeleting = $state(false);

	// --- Data Fetching ---
	$effect(() => {
		const personaId = $page.params.id;

		async function fetchPersona() {
			isLoading = true;
			error = null;
			persona = null;

			if (!personaId || isNaN(parseInt(personaId, 10))) {
				error = 'Invalid Persona ID';
				isLoading = false;
				return;
			}

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
				persona = data;
			} catch (e: any) {
				console.error('Failed to fetch persona:', e);
				error = e.message || 'Failed to load persona details.';
			} finally {
				isLoading = false;
			}
		}

		fetchPersona();
	});

	// --- Delete Logic ---
	async function handleDelete() {
		if (!persona || isDeleting) return;

		if (!confirm(`Are you sure you want to delete the persona "${persona.name}"? This cannot be undone.`)) {
			return;
		}

		isDeleting = true;
		error = null;

		try {
			const response = await fetch(`/api/personas/${persona.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errResult = await response.json().catch(() => ({}));
				throw new Error(errResult.message || `Failed to delete persona. Status: ${response.status}`);
			}

			await goto('/personas'); // Navigate back to the list

		} catch (e: any) {
			console.error('Failed to delete persona:', e);
			error = e.message || 'Failed to delete persona.';
		} finally {
			isDeleting = false;
		}
	}

</script>

<div class="container mx-auto max-w-4xl py-8">
	<div class="mb-6">
		<Button href="/personas" variant="outline">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Personas
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
			<Button href="/personas" variant="outline">Go Back</Button>
		</div>
	{:else if persona}
		<div class="rounded border p-6 shadow">
			<!-- Action Buttons (kept here for route context) -->
			<div class="mb-6 flex justify-end gap-2">
				<Button variant="outline" href={`/personas/${persona.id}/edit`}>
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

			<!-- Use the PersonaDetailView component, hiding the creatives section -->
			<PersonaDetailView {persona} showCreativesSection={false} />
		</div>
	{:else}
		<!-- Fallback if not loading and no error, but persona is null -->
		<div class="rounded border border-dashed p-12 text-center">
			<h2 class="text-xl font-semibold">Persona Not Found</h2>
			<p class="text-muted-foreground">The requested persona could not be found.</p>
		</div>
	{/if}
</div>
