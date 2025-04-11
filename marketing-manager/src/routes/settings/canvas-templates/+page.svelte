<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '$lib/components/ui/card';
	import { PlusCircle, Edit, Trash2, Copy } from 'lucide-svelte'; // Added Copy icon
	import type { CanvasTemplateListItem } from '$lib/types/canvasTemplate.types';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner'; // Assuming svelte-sonner is used for notifications

	let templates = $state<CanvasTemplateListItem[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let isDuplicating = $state<number | null>(null); // State to track duplication

	async function fetchTemplates() {
		isLoading = true;
		error = null;
		try {
			const response = await fetch('/api/canvas-templates');
			if (!response.ok) {
				throw new Error(`Failed to fetch templates: ${response.statusText}`);
			}
			const data: CanvasTemplateListItem[] = await response.json();
			// Convert timestamps if necessary (Drizzle might return numbers)
			templates = data.map(t => ({
				...t,
				createdAt: new Date(t.createdAt),
				updatedAt: t.updatedAt ? new Date(t.updatedAt) : null
			}));
		} catch (err: any) {
			console.error('Error fetching canvas templates:', err);
			error = err.message || 'An unknown error occurred.';
			toast.error('Failed to load canvas templates.');
		} finally {
			isLoading = false;
		}
	}

	async function deleteTemplate(id: number, name: string) {
		if (!confirm(`Are you sure you want to delete the template "${name}"?`)) {
			return;
		}

		try {
			const response = await fetch(`/api/canvas-templates/${id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				if (response.status === 404) {
					throw new Error('Template not found.');
				}
				throw new Error(`Failed to delete template: ${response.statusText}`);
			}

			// Remove from local state
			templates = templates.filter((t) => t.id !== id);
			toast.success(`Template "${name}" deleted successfully.`);
		} catch (err: any) {
			console.error('Error deleting template:', err);
			error = err.message || 'An unknown error occurred while deleting.';
			toast.error(`Failed to delete template: ${error}`);
		}
	}

	async function handleDuplicate(id: number, name: string) {
		if (isDuplicating) return; // Prevent multiple clicks
		isDuplicating = id;
		error = null; // Clear previous errors

		try {
			const response = await fetch(`/api/canvas-templates/${id}/duplicate`, {
				method: 'POST'
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: response.statusText }));
				throw new Error(errorData.message || `Failed to duplicate template (Status: ${response.status})`);
			}

			const duplicatedTemplate: CanvasTemplateListItem = await response.json();

			toast.success(`Template "${name}" duplicated successfully as "${duplicatedTemplate.name}".`);
			// Refresh the list to show the new template
			await fetchTemplates(); // Re-fetch to get the updated list including the new one

		} catch (err: any) {
			console.error('Error duplicating template:', err);
			error = err.message || 'An unknown error occurred while duplicating.';
			toast.error(`Failed to duplicate template: ${error}`);
		} finally {
			isDuplicating = null; // Reset duplication state
		}
	}

	onMount(() => {
		fetchTemplates();
	});
</script>

<svelte:head>
	<title>Canvas Templates - Settings</title>
</svelte:head>

<div class="container mx-auto p-4 md:p-6 lg:p-8">
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-2xl font-bold">Canvas Templates</h1>
		<Button href="/settings/canvas-templates/new">
			<PlusCircle class="mr-2 h-4 w-4" /> Create New Template
		</Button>
	</div>

	{#if isLoading}
		<p>Loading templates...</p>
	{:else if error}
		<div class="text-red-600 bg-red-100 border border-red-400 p-4 rounded">
			<p>Error loading templates: {error}</p>
			<Button onclick={fetchTemplates} variant="outline" class="mt-2">Retry</Button>
		</div>
	{:else if templates.length === 0}
		<p>No canvas templates found. Create one to get started!</p>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each templates as template (template.id)}
				<Card>
					<CardHeader>
						<CardTitle>{template.name}</CardTitle>
						{#if template.description}
							<CardDescription>{template.description}</CardDescription>
						{/if}
					</CardHeader>
					<CardContent>
						{#if template.previewImageUrl}
							<img
								src={template.previewImageUrl}
								alt="Preview for {template.name}"
								class="w-full h-32 object-cover rounded border mb-2"
								loading="lazy"
							/>
						{:else}
							<div class="w-full h-32 bg-gray-200 rounded border mb-2 flex items-center justify-center text-gray-500">
								No Preview
							</div>
						{/if}
						<div class="mt-2 text-xs text-gray-600 space-y-1">
							{#if template.aspectRatio}
								<div><span class="font-medium">Ratio:</span> {template.aspectRatio}</div>
							{/if}
							{#if template.resolution}
								<div><span class="font-medium">Res:</span> {template.resolution}</div>
							{/if}
						</div>
						<p class="text-xs text-gray-500 mt-2">
							Created: {new Date(template.createdAt).toLocaleDateString()}
							{#if template.updatedAt}
								<br />Updated: {new Date(template.updatedAt).toLocaleDateString()}
							{/if}
						</p>
					</CardContent>
					<CardFooter class="flex justify-end gap-2">
						<Button
							variant="outline"
							size="sm"
							href={`/settings/canvas-templates/${template.id}/edit`}
							title="Edit Template"
						>
							<Edit class="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="sm"
							onclick={() => handleDuplicate(template.id, template.name)}
							title="Duplicate Template"
							disabled={isDuplicating === template.id}
						>
							{#if isDuplicating === template.id}
								<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
							{:else}
								<Copy class="h-4 w-4" />
							{/if}
						</Button>
						<Button
							variant="destructive"
							size="sm"
							onclick={() => deleteTemplate(template.id, template.name)}
							title="Delete Template"
						>
							<Trash2 class="h-4 w-4" />
						</Button>
					</CardFooter>
				</Card>
			{/each}
		</div>
	{/if}
</div>
