<script lang="ts">
	// Define a type for the theme data expected from the API
	type Theme = {
		id: number;
		title: string;
		description: string | null;
		associatedPainPoint: string | null;
		createdAt: number | null; // Assuming timestamp comes as number
		updatedAt?: number | null; // Optional update timestamp
	};

	// Placeholder for theme management logic
	// TODO: Fetch themes, implement add/edit/delete functionality
	let themes = $state<Theme[]>([]); // Use the Theme type
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	console.log('Theme settings page loaded (placeholder)');
</script>

<div class="container mx-auto py-8">
	<h1 class="mb-6 text-2xl font-bold">Manage Themes</h1>

	{#if isLoading}
		<p>Loading themes...</p>
	{:else if error}
		<p class="text-red-500">Error loading themes: {error}</p>
	{:else}
		<div class="mb-4">
			<!-- TODO: Add "New Theme" button -->
			<button class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
				New Theme (Not Implemented)
			</button>
		</div>

		{#if themes.length === 0}
			<p>No themes found.</p>
		{:else}
			<ul class="space-y-2">
				{#each themes as theme (theme.id)}
					<li class="rounded border p-3">
						<h2 class="font-semibold">{theme.title}</h2>
						<p class="text-sm text-gray-600">{theme.description || 'No description'}</p>
						<p class="text-sm text-gray-500">Pain Point: {theme.associatedPainPoint || 'N/A'}</p>
						<!-- TODO: Add Edit/Delete buttons -->
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>
