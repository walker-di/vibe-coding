<script lang="ts">
	import { FileText, Image as ImageIcon, Video, LayoutPanelLeft } from 'lucide-svelte';
	// Import base and specific types from schema
	import type {
		creatives as creativesTable,
		campaigns as campaignsTable,
		personas as personasTable,
		themes as themesTable,
		creativeText as creativeTextTable,
		creativeImage as creativeImageTable,
		creativeVideo as creativeVideoTable, // Import video type
		creativeLp as creativeLpTable, // Import lp type
		videoTemplates as videoTemplatesTable // Import template type for video
	} from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';

	// --- Type for Prop ---
	// Define a comprehensive type for the creative detail view prop
	// Includes potential nested data for all types
	type CreativeDetail = InferSelectModel<typeof creativesTable> & {
		campaign: Pick<InferSelectModel<typeof campaignsTable>, 'id' | 'name'> | null;
		persona: Pick<InferSelectModel<typeof personasTable>, 'id' | 'name' | 'productId'> | null; // Added productId for context
		theme: Pick<InferSelectModel<typeof themesTable>, 'id' | 'title'> | null;
		textData: InferSelectModel<typeof creativeTextTable> | null;
		imageData: InferSelectModel<typeof creativeImageTable> | null;
		videoData: (InferSelectModel<typeof creativeVideoTable> & {
			videoTemplate: Pick<InferSelectModel<typeof videoTemplatesTable>, 'id' | 'name' | 'templateCode'> | null;
		}) | null;
		lpData: InferSelectModel<typeof creativeLpTable> | null;
	};

	// Correctly type the destructured prop
	let { creative }: { creative: CreativeDetail } = $props();

	// --- Helper ---
	// Add explicit return type
	function formatText(text: string | null | undefined): string {
		return text || '-';
	}

	function formatJson(json: any | null | undefined): string {
		if (!json) return '-';
		try {
			// Pretty print JSON if it's an object/array
			if (typeof json === 'object') {
				return JSON.stringify(json, null, 2);
			}
			return String(json); // Fallback for non-object JSON (e.g., stringified array)
		} catch {
			return String(json); // Fallback if not valid JSON
		}
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

	// Determine the correct persona link based on context (standalone vs nested)
	const personaLink = $derived(() => {
		if (!creative.persona) return '#'; // Return fallback string '#' if no persona
		// If persona has productId, assume nested route structure
		if (creative.persona.productId) {
			return `/products/${creative.persona.productId}/personas/${creative.persona.id}`;
		}
		// Otherwise, assume standalone route
		return `/personas/${creative.persona.id}`; // Always returns a string now
	});

</script>

<!-- Header -->
<div class="mb-6 flex flex-col items-start justify-between gap-4 border-b pb-4 md:flex-row md:items-center">
	<div class="flex-grow">
		<div class="mb-1 flex items-center gap-2">
			<svelte:component this={getIcon(creative.type)} class="h-6 w-6 text-muted-foreground" />
			<h1 class="text-3xl font-bold">{creative.name}</h1>
		</div>
		<p class="text-sm text-muted-foreground">Type: {creative.type.toUpperCase()}</p>
	</div>
	<!-- Action buttons (Edit/Delete/Back) are kept in the parent page -->
</div>

<!-- Common Details -->
<section class="space-y-3">
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
				<!-- Explicitly call the derived signal to get value -->
				{@const link = personaLink()}
				{#if link && link !== '#'}
					<a href={link} class="text-blue-600 hover:underline">
						{creative.persona.name}
					</a>
				{:else}
					<!-- Handle cases where link is '#' or null/undefined -->
					{creative.persona.name} (Link unavailable)
				{/if}
			{:else}
				-
			{/if}
		</dd>
	</div>
	{#if creative.theme}
	<div>
		<dt class="text-sm font-medium text-muted-foreground">Linked Theme</dt>
		<dd class="mt-1 text-base">
			<!-- Assuming theme settings are under /settings/themes/[id] -->
			<a href={`/settings/themes/${creative.theme.id}`} class="text-blue-600 hover:underline">
				{creative.theme.title}
			</a>
		</dd>
	</div>
	{/if}
</section>

<!-- Type-Specific Details -->
<section class="mt-6 border-t pt-4">
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
					<a href={creative.imageData.imageUrl} target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline break-all">
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
	{:else if creative.type === 'video' && creative.videoData}
		<dl class="space-y-3">
			<div>
				<dt class="text-sm font-medium text-muted-foreground">Video URL</dt>
				<dd class="mt-1 text-base">
					{#if creative.videoData.videoUrl}
						<a href={creative.videoData.videoUrl} target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline break-all">
							{creative.videoData.videoUrl}
						</a>
						<!-- Basic video preview if URL exists -->
						<!-- <video controls src={creative.videoData.videoUrl} class="mt-2 max-h-60 rounded border"></video> -->
					{:else}
						-
					{/if}
				</dd>
			</div>
			<div>
				<dt class="text-sm font-medium text-muted-foreground">Platform</dt>
				<dd class="mt-1 text-base">{formatText(creative.videoData.platform)}</dd>
			</div>
			<div>
				<dt class="text-sm font-medium text-muted-foreground">Format</dt>
				<dd class="mt-1 text-base">{formatText(creative.videoData.format)}</dd>
			</div>
			<div>
				<dt class="text-sm font-medium text-muted-foreground">Duration</dt>
				<dd class="mt-1 text-base">{creative.videoData.duration ? `${creative.videoData.duration} seconds` : '-'}</dd>
			</div>
			<div>
				<dt class="text-sm font-medium text-muted-foreground">Appeal Feature</dt>
				<dd class="mt-1 text-base">{formatText(creative.videoData.appealFeature)}</dd>
			</div>
			<div>
				<dt class="text-sm font-medium text-muted-foreground">Stimulating Emotion</dt>
				<dd class="mt-1 text-base">{formatText(creative.videoData.emotion)}</dd>
			</div>
			<div>
				<dt class="text-sm font-medium text-muted-foreground">Video Template</dt>
				<dd class="mt-1 text-base">
					{#if creative.videoData.videoTemplate}
						<!-- Assuming template settings are under /settings/video-templates/[id] -->
						<a href={`/settings/video-templates/${creative.videoData.videoTemplate.id}`} class="text-blue-600 hover:underline">
							{creative.videoData.videoTemplate.name || creative.videoData.videoTemplate.templateCode || `Template ${creative.videoData.videoTemplate.id}`}
						</a>
					{:else}
						-
					{/if}
				</dd>
			</div>
		</dl>
	{:else if creative.type === 'lp' && creative.lpData}
		<dl class="space-y-3">
			<div>
				<dt class="text-sm font-medium text-muted-foreground">Page URL</dt>
				<dd class="mt-1 text-base">
					<a href={creative.lpData.pageUrl} target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline break-all">
						{creative.lpData.pageUrl}
					</a>
				</dd>
			</div>
			<div>
				<dt class="text-sm font-medium text-muted-foreground">Headline</dt>
				<dd class="mt-1 text-base">{formatText(creative.lpData.headline)}</dd>
			</div>
			<div>
				<dt class="text-sm font-medium text-muted-foreground">Key Sections</dt>
				<dd class="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-2 text-sm font-mono">{formatJson(creative.lpData.keySections)}</dd>
			</div>
		</dl>
	{:else}
		<p class="text-muted-foreground">No specific data available for this creative type.</p>
	{/if}
</section>
