<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft, AlertCircle, Trash2, Edit, FileText, Image as ImageIcon, Video, LayoutPanelLeft } from 'lucide-svelte';
	// Import base and specific types from schema
	import type {
		creatives as creativesTable,
		campaigns as campaignsTable,
		personas as personasTable,
		themes as themesTable,
		creativeText as creativeTextTable,
		creativeImage as creativeImageTable,
		creativeVideo as creativeVideoTable, // Add import
		creativeLp as creativeLpTable, // Add import
		videoTemplates as videoTemplatesTable // Add import
	} from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';
	import CreativeDetailView from '$lib/components/creatives/CreativeDetailView.svelte'; // Import the new component

	// --- Types ---
	// Define a comprehensive type for the creative detail view (matching the component's expected prop type)
	type CreativeDetail = InferSelectModel<typeof creativesTable> & {
		campaign: Pick<InferSelectModel<typeof campaignsTable>, 'id' | 'name'> | null;
		persona: Pick<InferSelectModel<typeof personasTable>, 'id' | 'name' | 'productId'> | null; // Add productId
		theme: Pick<InferSelectModel<typeof themesTable>, 'id' | 'title'> | null;
		textData: InferSelectModel<typeof creativeTextTable> | null;
		imageData: InferSelectModel<typeof creativeImageTable> | null;
		videoData: (InferSelectModel<typeof creativeVideoTable> & { // Add video type
			videoTemplate: Pick<InferSelectModel<typeof videoTemplatesTable>, 'id' | 'name' | 'templateCode'> | null;
		}) | null;
		lpData: InferSelectModel<typeof creativeLpTable> | null; // Add lp type
	};

	// --- State ---
	let creative = $state<CreativeDetail | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let isDeleting = $state(false);

	// --- Data Fetching ---
	$effect(() => {
		const creativeId = $page.params.id;

		async function fetchCreativeDetail() {
			isLoading = true;
			error = null;
			creative = null;

			if (!creativeId || isNaN(parseInt(creativeId, 10))) {
				error = 'Invalid Creative ID';
				isLoading = false;
				return;
			}

			try {
				const response = await fetch(`/api/creatives/${creativeId}`);
				if (response.status === 404) {
					throw new Error('Creative not found');
				}
				if (!response.ok) {
					const errResult = await response.json().catch(() => ({}));
					throw new Error(errResult.message || `HTTP error! status: ${response.status}`);
				}
				const data: CreativeDetail = await response.json();
				creative = data;
			} catch (e: any) {
				console.error('Failed to fetch creative details:', e);
				error = e.message || 'Failed to load creative details.';
			} finally {
				isLoading = false;
			}
		}

		fetchCreativeDetail();
	});

	// --- Delete Logic ---
	async function handleDelete() {
		if (!creative || isDeleting) return;

		if (!confirm(`Are you sure you want to delete the creative "${creative.name}"? This cannot be undone.`)) {
			return;
		}

		isDeleting = true;
		error = null;

		try {
			const response = await fetch(`/api/creatives/${creative.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errResult = await response.json().catch(() => ({}));
				throw new Error(errResult.message || `Failed to delete creative. Status: ${response.status}`);
			}

			await goto('/creatives'); // Navigate back to the list

		} catch (e: any) {
			console.error('Failed to delete creative:', e);
			error = e.message || 'Failed to delete creative.';
		} finally {
			isDeleting = false;
		}
	}

	// Helper functions (formatText, getIcon) are now inside CreativeDetailView

</script>

<div class="container mx-auto max-w-4xl py-8">
	<div class="mb-6">
		<Button href="/creatives" variant="outline">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Creatives
		</Button>
	</div>

	{#if isLoading}
		<div class="flex justify-center p-12">
			<p>Loading creative details...</p>
			<!-- TODO: Add spinner -->
		</div>
	{:else if error}
		<div class="flex flex-col items-center justify-center rounded border border-dashed border-red-500 bg-red-50 p-12 text-center text-red-700">
			<AlertCircle class="mb-2 h-8 w-8" />
			<h3 class="text-xl font-semibold">Error Loading Creative</h3>
			<p class="mb-4 text-sm">{error}</p>
			<Button href="/creatives" variant="outline">Go Back</Button>
		</div>
	{:else if creative}
		<div class="space-y-6 rounded border p-6 shadow">
			<!-- Action buttons remain here -->
			<div class="flex justify-end gap-2">
				<Button variant="outline" href={`/creatives/${creative.id}/edit`}>
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
			<p class="text-muted-foreground">The requested creative could not be found.</p>
		</div>
	{/if}
</div>
