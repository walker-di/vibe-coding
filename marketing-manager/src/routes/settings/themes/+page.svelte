<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { themes as themesTable } from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';
	import { AlertCircle, PlusCircle } from 'lucide-svelte';

	type Theme = InferSelectModel<typeof themesTable>;

	let themesList = $state<Theme[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	$effect(() => {
		async function loadThemes() {
			isLoading = true;
			error = null;
			try {
				const response = await fetch('/api/themes');
				if (!response.ok) {
					throw new Error(`Failed to load themes: ${response.statusText}`);
				}
				themesList = await response.json();
			} catch (e: any) {
				console.error("Error loading themes:", e);
				error = e.message || "An unknown error occurred while loading themes.";
			} finally {
				isLoading = false;
			}
		}
		loadThemes();
	});

	function handleEdit(id: number) {
		// TODO: Implement navigation to edit page: goto(`/settings/themes/${id}/edit`);
		alert(`Edit action for Theme ID: ${id} (Not Implemented)`);
	}

	function handleDelete(id: number) {
		// TODO: Implement delete confirmation and API call
		alert(`Delete action for Theme ID: ${id} (Not Implemented)`);
	}

</script>

<div class="container mx-auto py-8">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold">Manage Themes</h1>
		<Button href="/settings/themes/new">
			<PlusCircle class="mr-2 h-4 w-4" /> Create New Theme
		</Button>
	</div>

	{#if isLoading}
		<p>Loading themes...</p>
	{:else if error}
		<div class="flex items-center rounded border border-red-500 bg-red-50 p-3 text-sm text-red-700">
			<AlertCircle class="mr-2 h-4 w-4 flex-shrink-0" />
			<span>Error loading themes: {error}</span>
		</div>
	{:else if themesList.length === 0}
		<p>No themes found. Create one to get started!</p>
	{:else}
		<div class="overflow-x-auto rounded border">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">ID</th>
						<th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Title</th>
						<th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Description</th>
						<th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Associated Pain Point</th>
						<th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					{#each themesList as theme (theme.id)}
						<tr>
							<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{theme.id}</td>
							<td class="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{theme.title}</td>
							<td class="max-w-xs truncate px-6 py-4 text-sm text-gray-500" title={theme.description ?? ''}>{theme.description}</td>
							<td class="max-w-xs truncate px-6 py-4 text-sm text-gray-500" title={theme.associatedPainPoint ?? ''}>{theme.associatedPainPoint}</td>
							<td class="whitespace-nowrap px-6 py-4 text-sm font-medium">
								<!-- Placeholder Actions -->
								<button onclick={() => handleEdit(theme.id)} class="text-indigo-600 hover:text-indigo-900">Edit</button>
								<button onclick={() => handleDelete(theme.id)} class="ml-4 text-red-600 hover:text-red-900">Delete</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
