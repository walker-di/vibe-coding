<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { PlusCircle, AlertCircle, User } from 'lucide-svelte'; // Added User icon
	import type { personas as personasTable } from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';

	// Infer the persona type from the Drizzle schema table
	// Use a subset for the list view based on API response
	type PersonaListItem = Pick<
		InferSelectModel<typeof personasTable>,
		'id' | 'name' | 'personaTitle' | 'imageUrl' | 'createdAt'
	>;

	let personasList = $state<PersonaListItem[] | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	$effect(() => {
		async function fetchPersonas() {
			isLoading = true;
			error = null;
			try {
				const response = await fetch('/api/personas');
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				const data: PersonaListItem[] = await response.json();
				personasList = data;
			} catch (e: any) {
				console.error('Failed to fetch personas:', e);
				error = e.message || 'Failed to load personas. Please try again.';
				personasList = []; // Set to empty array on error
			} finally {
				isLoading = false;
			}
		}

		fetchPersonas();
	});
</script>

<div class="container mx-auto py-8">
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-2xl font-bold">Personas</h1>
		<Button href="/personas/new" variant="outline">
			<PlusCircle class="mr-2 h-4 w-4" />
			New Persona
		</Button>
	</div>

	{#if isLoading}
		<div class="flex justify-center p-12">
			<p>Loading personas...</p>
			<!-- TODO: Add a spinner component -->
		</div>
	{:else if error}
		<div class="flex flex-col items-center justify-center rounded border border-dashed border-red-500 bg-red-50 p-12 text-center text-red-700">
			<AlertCircle class="mb-2 h-8 w-8" />
			<h3 class="text-xl font-semibold">Error Loading Personas</h3>
			<p class="mb-4 text-sm">{error}</p>
		</div>
	{:else if personasList && personasList.length > 0}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each personasList as persona (persona.id)}
				<a href={`/personas/${persona.id}`} class="block rounded border p-4 shadow transition hover:shadow-md">
					{#if persona.imageUrl}
						<img src={persona.imageUrl} alt={persona.name} class="mb-2 h-32 w-full rounded object-cover" />
					{:else}
						<div class="mb-2 flex h-32 w-full items-center justify-center rounded bg-gray-200 text-gray-500">
							<User class="h-16 w-16" />
						</div>
					{/if}
					<h2 class="mb-1 truncate text-lg font-semibold" title={persona.name}>{persona.name}</h2>
					<p class="truncate text-sm text-gray-600" title={persona.personaTitle || ''}>
						{persona.personaTitle || 'No title'}
					</p>
					<!-- TODO: Add link to detail page -->
					<!-- <a href={`/personas/${persona.id}`} class="text-sm text-blue-500 hover:underline">View Details</a> -->
				</a>
			{/each}
		</div>
	{:else}
		<div class="flex flex-col items-center justify-center rounded border border-dashed p-12 text-center">
			<User class="mb-4 h-12 w-12 text-muted-foreground" />
			<h3 class="text-xl font-semibold">No Personas Yet</h3>
			<p class="mb-4 text-sm text-muted-foreground">Get started by creating your first persona.</p>
			<Button href="/personas/new">
				<PlusCircle class="mr-2 h-4 w-4" />
				Create Persona
			</Button>
		</div>
	{/if}
</div>

<style>
	/* Add any specific styles if needed */
</style>
