<script lang="ts">
	// Define a type for the video template data expected from the API
	// Based on schema.ts and Image 12
	type VideoTemplate = {
		id: number;
		templateCode: string | null;
		name: string | null;
		durationSeconds: number | null;
		materialCount: number | null;
		aspectRatio: string | null; // Assuming enum comes as string
		sceneCount: number | null;
		recommendedPlatforms: string[] | null; // Assuming JSON array comes parsed or as string[]
		resolution: string | null;
		previewUrl: string | null;
		createdAt: number | null; // Assuming timestamp comes as number
		updatedAt?: number | null; // Optional update timestamp
	};

	// Placeholder for video template management logic
	// TODO: Fetch templates, implement add/edit/delete functionality
	let videoTemplates = $state<VideoTemplate[]>([]); // Use the VideoTemplate type
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	console.log('Video Template settings page loaded (placeholder)');
</script>

<div class="container mx-auto py-8">
	<h1 class="mb-6 text-2xl font-bold">Manage Video Templates</h1>

	{#if isLoading}
		<p>Loading video templates...</p>
	{:else if error}
		<p class="text-red-500">Error loading templates: {error}</p>
	{:else}
		<div class="mb-4">
			<!-- TODO: Add "New Template" button -->
			<button class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
				New Template (Not Implemented)
			</button>
		</div>

		{#if videoTemplates.length === 0}
			<p>No video templates found.</p>
		{:else}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each videoTemplates as template (template.id)}
					<div class="rounded border p-4">
						{#if template.previewUrl}
							<img src={template.previewUrl} alt={template.name || 'Template Preview'} class="mb-2 h-32 w-full rounded object-cover" />
						{:else}
							<div class="mb-2 flex h-32 w-full items-center justify-center rounded bg-gray-200 text-gray-500">No Preview</div>
						{/if}
						<h2 class="font-semibold">{template.name || `Template ${template.templateCode || template.id}`}</h2>
						<p class="text-sm text-gray-600">Code: {template.templateCode || 'N/A'}</p>
						<p class="text-sm text-gray-600">Duration: {template.durationSeconds ? `${template.durationSeconds}s` : 'N/A'}</p>
						<p class="text-sm text-gray-600">Aspect Ratio: {template.aspectRatio || 'N/A'}</p>
						<!-- TODO: Add Edit/Delete buttons -->
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>
