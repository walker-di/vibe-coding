<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { videoTemplates as videoTemplatesTable } from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';
	import { AlertCircle, PlusCircle } from 'lucide-svelte';

	type VideoTemplate = InferSelectModel<typeof videoTemplatesTable>;

	let templatesList = $state<VideoTemplate[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	$effect(() => {
		async function loadVideoTemplates() {
			isLoading = true;
			error = null;
			try {
				const response = await fetch('/api/video-templates');
				if (!response.ok) {
					throw new Error(`Failed to load video templates: ${response.statusText}`);
				}
				templatesList = await response.json();
			} catch (e: any) {
				console.error("Error loading video templates:", e);
				error = e.message || "An unknown error occurred while loading video templates.";
			} finally {
				isLoading = false;
			}
		}
		loadVideoTemplates();
	});

	function handleEdit(id: number) {
		// TODO: Implement navigation to edit page: goto(`/settings/video-templates/${id}/edit`);
		alert(`Edit action for Video Template ID: ${id} (Not Implemented)`);
	}

	function handleDelete(id: number) {
		// TODO: Implement delete confirmation and API call
		alert(`Delete action for Video Template ID: ${id} (Not Implemented)`);
	}

</script>

<div class="container mx-auto py-8">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold">Manage Video Templates</h1>
		<Button href="/settings/video-templates/new">
			<PlusCircle class="mr-2 h-4 w-4" /> Create New Template
		</Button>
	</div>

	{#if isLoading}
		<p>Loading video templates...</p>
	{:else if error}
		<div class="flex items-center rounded border border-red-500 bg-red-50 p-3 text-sm text-red-700">
			<AlertCircle class="mr-2 h-4 w-4 flex-shrink-0" />
			<span>Error loading video templates: {error}</span>
		</div>
	{:else if templatesList.length === 0}
		<p>No video templates found. Create one to get started!</p>
	{:else}
		<div class="overflow-x-auto rounded border">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">ID</th>
						<th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Code</th>
						<th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
						<th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Duration</th>
						<th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Aspect Ratio</th>
						<th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Preview</th>
						<th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					{#each templatesList as template (template.id)}
						<tr>
							<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{template.id}</td>
							<td class="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{template.templateCode}</td>
							<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{template.name}</td>
							<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{template.durationSeconds}s</td>
							<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{template.aspectRatio}</td>
							<td class="px-6 py-4 text-sm text-gray-500">
								{#if template.previewUrl}
									<a href={template.previewUrl} target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">View</a>
								{:else}
									<span>N/A</span>
								{/if}
							</td>
							<td class="whitespace-nowrap px-6 py-4 text-sm font-medium">
								<!-- Placeholder Actions -->
								<button onclick={() => handleEdit(template.id)} class="text-indigo-600 hover:text-indigo-900">Edit</button>
								<button onclick={() => handleDelete(template.id)} class="ml-4 text-red-600 hover:text-red-900">Delete</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
