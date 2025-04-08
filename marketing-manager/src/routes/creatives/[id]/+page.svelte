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
		creativeImage as creativeImageTable
		// Import video/lp types later
	} from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';

	// --- Types ---
	// Define a comprehensive type for the creative detail view
	type CreativeDetail = InferSelectModel<typeof creativesTable> & {
		campaign: Pick<InferSelectModel<typeof campaignsTable>, 'id' | 'name'> | null;
		persona: Pick<InferSelectModel<typeof personasTable>, 'id' | 'name'> | null;
		theme: Pick<InferSelectModel<typeof themesTable>, 'id' | 'title'> | null;
		textData: InferSelectModel<typeof creativeTextTable> | null;
		imageData: InferSelectModel<typeof creativeImageTable> | null;
		// videoData: InferSelectModel<typeof creativeVideoTable> | null; // Add later
		// lpData: InferSelectModel<typeof creativeLpTable> | null; // Add later
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

	// --- Helper ---
	function formatText(text: string | null | undefined): string {
		return text || '-';
	}

	function getIcon(type: CreativeDetail['type'] | undefined) {
		if (!type) return FileText;
		switch (type) {
			case 'text': return FileText;
			case 'image': return ImageIcon;
			case 'video': return Video;
			case 'lp': return LayoutPanelLeft;
			default: return FileText;
		}
	}

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
			<!-- Header -->
			<div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
				<div class="flex-grow">
					<div class="mb-1 flex items-center gap-2">
						<svelte:component this={getIcon(creative.type)} class="h-6 w-6 text-muted-foreground" />
						<h1 class="text-3xl font-bold">{creative.name}</h1>
					</div>
					<p class="text-sm text-muted-foreground">Type: {creative.type.toUpperCase()}</p>
				</div>
				<div class="flex flex-shrink-0 gap-2 self-start md:self-center">
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
			</div>

			<!-- Common Details -->
			<section class="space-y-3 border-t pt-4">
				<h2 class="text-lg font-semibold">Details</h2>
				<div>
					<dt class="text-sm font-medium text-muted-foreground">Description</dt>
					<dd class="mt-1 text-base whitespace-pre-wrap">{formatText(creative.description)}</dd>
				</div>
				<div>
					<dt class="text-sm font-medium text-muted-foreground">Linked Campaign</dt>
					<dd class="mt-1 text-base">
						{#if creative.campaign}
							<a href={`/campaigns/${creative.campaign.id}`} class="text-blue-600 hover:underline">
								{creative.campaign.name}
							</a>
						{:else}
							-
						{/if}
					</dd>
				</div>
				<div>
					<dt class="text-sm font-medium text-muted-foreground">Linked Persona</dt>
					<dd class="mt-1 text-base">
						{#if creative.persona}
							<a href={`/personas/${creative.persona.id}`} class="text-blue-600 hover:underline">
								{creative.persona.name}
							</a>
						{:else}
							-
						{/if}
					</dd>
				</div>
				<!-- TODO: Add Linked Theme later -->
				<!-- {#if creative.theme}
				<div>
					<dt class="text-sm font-medium text-muted-foreground">Linked Theme</dt>
					<dd class="mt-1 text-base">
						<a href={`/settings/themes/${creative.theme.id}`} class="text-blue-600 hover:underline">
							{creative.theme.title}
						</a>
					</dd>
				</div>
				{/if} -->
			</section>

			<!-- Type-Specific Details -->
			<section class="border-t pt-4">
				<h2 class="mb-3 text-lg font-semibold">{creative.type.charAt(0).toUpperCase() + creative.type.slice(1)} Specific Data</h2>

				{#if creative.type === 'text' && creative.textData}
					<dl class="space-y-3">
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Headline</dt>
							<dd class="mt-1 text-base">{formatText(creative.textData.headline)}</dd>
						</div>
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Body</dt>
							<dd class="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-2 text-base">{formatText(creative.textData.body)}</dd>
						</div>
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Call to Action</dt>
							<dd class="mt-1 text-base">{formatText(creative.textData.callToAction)}</dd>
						</div>
					</dl>
				{:else if creative.type === 'image' && creative.imageData}
					<dl class="space-y-3">
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Image URL</dt>
							<dd class="mt-1 text-base">
								<a href={creative.imageData.imageUrl} target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">
									{creative.imageData.imageUrl}
								</a>
							</dd>
							<img src={creative.imageData.imageUrl} alt={creative.imageData.altText ?? 'Creative Image'} class="mt-2 max-h-60 rounded border" />
						</div>
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Alt Text</dt>
							<dd class="mt-1 text-base">{formatText(creative.imageData.altText)}</dd>
						</div>
						{#if creative.imageData.width && creative.imageData.height}
							<div>
								<dt class="text-sm font-medium text-muted-foreground">Dimensions</dt>
								<dd class="mt-1 text-base">{creative.imageData.width} x {creative.imageData.height}</dd>
							</div>
						{/if}
					</dl>
				{:else}
					<p class="text-muted-foreground">No specific data available for this creative type yet.</p>
				{/if}
				<!-- TODO: Add display for Video/LP data later -->
			</section>

		</div>
	{:else}
		<!-- Fallback if not loading and no error, but creative is null -->
		<div class="rounded border border-dashed p-12 text-center">
			<h2 class="text-xl font-semibold">Creative Not Found</h2>
			<p class="text-muted-foreground">The requested creative could not be found.</p>
		</div>
	{/if}
</div>
