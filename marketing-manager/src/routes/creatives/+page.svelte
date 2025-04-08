<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { PlusCircle, AlertCircle, FileText, Image as ImageIcon, Video, LayoutPanelLeft } from 'lucide-svelte';
	import type { creatives as creativesTable, campaigns as campaignsTable, personas as personasTable, themes as themesTable } from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';

	// Define the type for a creative item in the list, including related data from the API
	type CreativeListItem = InferSelectModel<typeof creativesTable> & {
		campaign: Pick<InferSelectModel<typeof campaignsTable>, 'id' | 'name'> | null;
		persona: Pick<InferSelectModel<typeof personasTable>, 'id' | 'name'> | null;
		theme: Pick<InferSelectModel<typeof themesTable>, 'id' | 'title'> | null;
	};

	let creativesList = $state<CreativeListItem[] | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	$effect(() => {
		async function fetchCreatives() {
			isLoading = true;
			error = null;
			try {
				// TODO: Add query params for filtering later
				const response = await fetch('/api/creatives');
				if (!response.ok) {
					const errResult = await response.json().catch(() => ({}));
					throw new Error(errResult.message || `HTTP error! status: ${response.status}`);
				}
				const data: CreativeListItem[] = await response.json();
				creativesList = data;
			} catch (e: any) {
				console.error('Failed to fetch creatives:', e);
				error = e.message || 'Failed to load creatives. Please try again.';
				creativesList = []; // Set to empty array on error
			} finally {
				isLoading = false;
			}
		}

		fetchCreatives();
	});

	// Helper to get icon based on creative type
	function getIcon(type: CreativeListItem['type']) {
		switch (type) {
			case 'text': return FileText;
			case 'image': return ImageIcon;
			case 'video': return Video;
			case 'lp': return LayoutPanelLeft;
			default: return FileText; // Fallback
		}
	}
</script>

<div class="container mx-auto py-8">
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-2xl font-bold">Creatives</h1>
		<Button href="/creatives/new" variant="outline">
			<PlusCircle class="mr-2 h-4 w-4" />
			New Creative
		</Button>
	</div>

	<!-- TODO: Add Filtering UI here later -->

	{#if isLoading}
		<div class="flex justify-center p-12">
			<p>Loading creatives...</p>
			<!-- TODO: Add spinner -->
		</div>
	{:else if error}
		<div class="flex flex-col items-center justify-center rounded border border-dashed border-red-500 bg-red-50 p-12 text-center text-red-700">
			<AlertCircle class="mb-2 h-8 w-8" />
			<h3 class="text-xl font-semibold">Error Loading Creatives</h3>
			<p class="mb-4 text-sm">{error}</p>
		</div>
	{:else if creativesList && creativesList.length > 0}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each creativesList as creative (creative.id)}
				<a href={`/creatives/${creative.id}`} class="block rounded border p-4 shadow transition hover:shadow-md">
					<div class="mb-2 flex items-center justify-between">
						<h2 class="truncate text-lg font-semibold" title={creative.name}>{creative.name}</h2>
						<svelte:component this={getIcon(creative.type)} class="h-5 w-5 text-muted-foreground" />
					</div>
					<p class="mb-1 truncate text-sm text-muted-foreground" title={creative.description || ''}>
						{creative.description || 'No description'}
					</p>
					<div class="mt-2 space-y-1 text-xs">
						{#if creative.campaign}
							<p><span class="font-medium">Campaign:</span> {creative.campaign.name}</p>
						{/if}
						{#if creative.persona}
							<p><span class="font-medium">Persona:</span> {creative.persona.name}</p>
						{/if}
						{#if creative.theme}
							<p><span class="font-medium">Theme:</span> {creative.theme.title}</p>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div class="flex flex-col items-center justify-center rounded border border-dashed p-12 text-center">
			<!-- TODO: Add relevant icon -->
			<h3 class="text-xl font-semibold">No Creatives Yet</h3>
			<p class="mb-4 text-sm text-muted-foreground">Get started by creating your first creative.</p>
			<Button href="/creatives/new">
				<PlusCircle class="mr-2 h-4 w-4" />
				Create Creative
			</Button>
		</div>
	{/if}
</div>
