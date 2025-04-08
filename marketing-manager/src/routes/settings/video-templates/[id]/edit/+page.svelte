<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { AlertCircle } from 'lucide-svelte';
	import { videoFormats, videoPlatforms } from '$lib/constants';
	import type { videoTemplates as videoTemplatesTable } from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';

	type VideoTemplate = InferSelectModel<typeof videoTemplatesTable>;

	const templateId = $derived($page.params.id);

	// State for form fields, initialized empty
	let templateCode = $state('');
	let name = $state('');
	let durationSeconds = $state<number | ''>('');
	let materialCount = $state<number | ''>('');
	let aspectRatio = $state('');
	let sceneCount = $state<number | ''>('');
	let recommendedPlatforms = $state(''); // Store as JSON string for textarea
	let resolution = $state('');
	let previewUrl = $state('');

	// State for loading/error handling
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let isSubmitting = $state(false);
	let formErrors = $state<Record<string, any>>({});

	// Fetch existing template data
	$effect(() => {
		async function loadTemplateData() {
			if (!templateId) return;
			isLoading = true;
			loadError = null;
			try {
				const response = await fetch(`/api/video-templates/${templateId}`);
				if (!response.ok) {
					if (response.status === 404) {
						throw new Error('Video Template not found.');
					}
					throw new Error(`Failed to load template data: ${response.statusText}`);
				}
				const templateData: VideoTemplate = await response.json();

				// Populate state with fetched data
				templateCode = templateData.templateCode ?? '';
				name = templateData.name ?? '';
				durationSeconds = templateData.durationSeconds ?? '';
				materialCount = templateData.materialCount ?? '';
				aspectRatio = templateData.aspectRatio ?? '';
				sceneCount = templateData.sceneCount ?? '';
				// Format recommendedPlatforms array back to JSON string for textarea
				recommendedPlatforms = templateData.recommendedPlatforms ? JSON.stringify(templateData.recommendedPlatforms, null, 2) : '';
				resolution = templateData.resolution ?? '';
				previewUrl = templateData.previewUrl ?? '';

			} catch (e: any) {
				console.error("Error loading template data:", e);
				loadError = e.message || "An unknown error occurred while loading template data.";
			} finally {
				isLoading = false;
			}
		}
		loadTemplateData();
	});

	// Handle form submission for update
	async function handleSubmit() {
		isSubmitting = true;
		formErrors = {};
		let parsedPlatforms = null;
		let parsingError = false;

		// Attempt to parse recommendedPlatforms if provided
		if (recommendedPlatforms.trim()) {
			try {
				parsedPlatforms = JSON.parse(recommendedPlatforms);
				if (!Array.isArray(parsedPlatforms)) {
					throw new Error('Recommended Platforms must be a valid JSON array.');
				}
				if (!parsedPlatforms.every(p => videoPlatforms.includes(p))) {
					throw new Error('One or more recommended platforms are invalid.');
				}
			} catch (e: any) {
				formErrors = { ...formErrors, recommendedPlatforms: e.message || 'Invalid JSON format for Recommended Platforms.' };
				parsingError = true;
			}
		}

		if (parsingError) {
			isSubmitting = false;
			return;
		}

		const payload = {
			templateCode: templateCode || null,
			name: name || null,
			durationSeconds: durationSeconds || null,
			materialCount: materialCount || null,
			aspectRatio: aspectRatio || null,
			sceneCount: sceneCount || null,
			recommendedPlatforms: parsedPlatforms, // Send parsed array or null
			resolution: resolution || null,
			previewUrl: previewUrl || null
			// Include updatedAt logic if needed here or in API
		};

		try {
			const response = await fetch(`/api/video-templates/${templateId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			const result = await response.json();

			if (!response.ok) {
				if (response.status === 400 && result.errors) {
					formErrors = result.errors;
				} else {
					formErrors = { server: result.message || 'An unknown server error occurred.' };
				}
				console.error("Form Errors:", formErrors);
				return;
			}

			await goto('/settings/video-templates'); // Redirect back to the list on success

		} catch (e: any) {
			console.error('Video Template update error:', e);
			formErrors = { server: 'Failed to submit update. Please check your connection or review server logs.' };
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="container mx-auto max-w-2xl py-8">
	<h1 class="mb-6 text-2xl font-bold">Edit Video Template (ID: {templateId})</h1>

	{#if isLoading}
		<p>Loading template data...</p>
	{:else if loadError}
		<div class="mb-4 flex items-center rounded border border-red-500 bg-red-50 p-3 text-sm text-red-700">
			<AlertCircle class="mr-2 h-4 w-4 flex-shrink-0" />
			<span>{loadError}</span>
		</div>
		<Button href="/settings/video-templates" variant="outline">Back to List</Button>
	{:else}
		{#if formErrors.server}
			<div class="mb-4 flex items-center rounded border border-red-500 bg-red-50 p-3 text-sm text-red-700">
				<AlertCircle class="mr-2 h-4 w-4 flex-shrink-0" />
				<span>{formErrors.server}</span>
			</div>
		{/if}

		<form onsubmit={handleSubmit} class="space-y-6">
			<!-- Template Details -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<Label for="templateCode" class={formErrors.templateCode ? 'text-red-600' : ''}>Template Code (Unique, Optional)</Label>
					<Input id="templateCode" name="templateCode" type="text" maxlength={50} bind:value={templateCode} disabled={isSubmitting} class={formErrors.templateCode ? 'border-red-500' : ''} placeholder="e.g., 02766[正]" />
					{#if formErrors.templateCode}<p class="mt-1 text-sm text-red-600">{formErrors.templateCode}</p>{/if}
				</div>
				<div>
					<Label for="name" class={formErrors.name ? 'text-red-600' : ''}>Template Name (Optional)</Label>
					<Input id="name" name="name" type="text" maxlength={150} bind:value={name} disabled={isSubmitting} class={formErrors.name ? 'border-red-500' : ''} placeholder="e.g., Dynamic Product Showcase" />
					{#if formErrors.name}<p class="mt-1 text-sm text-red-600">{formErrors.name}</p>{/if}
				</div>
			</div>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
				<div>
					<Label for="durationSeconds" class={formErrors.durationSeconds ? 'text-red-600' : ''}>Duration (seconds, Optional)</Label>
					<Input id="durationSeconds" name="durationSeconds" type="number" min="0" step="1" bind:value={durationSeconds} disabled={isSubmitting} class={formErrors.durationSeconds ? 'border-red-500' : ''} />
					{#if formErrors.durationSeconds}<p class="mt-1 text-sm text-red-600">{formErrors.durationSeconds}</p>{/if}
				</div>
				<div>
					<Label for="materialCount" class={formErrors.materialCount ? 'text-red-600' : ''}>Material Count (Optional)</Label>
					<Input id="materialCount" name="materialCount" type="number" min="0" step="1" bind:value={materialCount} disabled={isSubmitting} class={formErrors.materialCount ? 'border-red-500' : ''} />
					{#if formErrors.materialCount}<p class="mt-1 text-sm text-red-600">{formErrors.materialCount}</p>{/if}
				</div>
				<div>
					<Label for="sceneCount" class={formErrors.sceneCount ? 'text-red-600' : ''}>Scene Count (Optional)</Label>
					<Input id="sceneCount" name="sceneCount" type="number" min="0" step="1" bind:value={sceneCount} disabled={isSubmitting} class={formErrors.sceneCount ? 'border-red-500' : ''} />
					{#if formErrors.sceneCount}<p class="mt-1 text-sm text-red-600">{formErrors.sceneCount}</p>{/if}
				</div>
			</div>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<Label for="aspectRatio" class={formErrors.aspectRatio ? 'text-red-600' : ''}>Aspect Ratio (Optional)</Label>
					<select id="aspectRatio" name="aspectRatio" bind:value={aspectRatio} disabled={isSubmitting} class={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${formErrors.aspectRatio ? 'border-red-500' : ''}`}>
						<option value="">-- Select Ratio --</option>
						{#each videoFormats as formatOption (formatOption)}
							<option value={formatOption}>{formatOption}</option>
						{/each}
					</select>
					{#if formErrors.aspectRatio}<p class="mt-1 text-sm text-red-600">{formErrors.aspectRatio}</p>{/if}
				</div>
				<div>
					<Label for="resolution" class={formErrors.resolution ? 'text-red-600' : ''}>Resolution (Optional)</Label>
					<Input id="resolution" name="resolution" type="text" maxlength={50} bind:value={resolution} disabled={isSubmitting} class={formErrors.resolution ? 'border-red-500' : ''} placeholder="e.g., 1920x1080" />
					{#if formErrors.resolution}<p class="mt-1 text-sm text-red-600">{formErrors.resolution}</p>{/if}
				</div>
			</div>

			<div>
				<Label for="recommendedPlatforms" class={formErrors.recommendedPlatforms ? 'text-red-600' : ''}>Recommended Platforms (JSON Array, Optional)</Label>
				<Textarea id="recommendedPlatforms" name="recommendedPlatforms" rows={3} bind:value={recommendedPlatforms} disabled={isSubmitting} class={formErrors.recommendedPlatforms ? 'border-red-500' : ''} placeholder='["YouTube", "Facebook", "Instagram"]' />
				<p class="mt-1 text-sm text-gray-500">Enter a valid JSON array of strings. Valid platforms: {videoPlatforms.join(', ')}.</p>
				{#if formErrors.recommendedPlatforms}<p class="mt-1 text-sm text-red-600">{formErrors.recommendedPlatforms}</p>{/if}
			</div>

			<div>
				<Label for="previewUrl" class={formErrors.previewUrl ? 'text-red-600' : ''}>Preview URL (Optional)</Label>
				<Input id="previewUrl" name="previewUrl" type="url" bind:value={previewUrl} disabled={isSubmitting} class={formErrors.previewUrl ? 'border-red-500' : ''} placeholder="https://..." />
				{#if formErrors.previewUrl}<p class="mt-1 text-sm text-red-600">{formErrors.previewUrl}</p>{/if}
			</div>

			<!-- Actions -->
			<div class="flex justify-end gap-2 pt-4">
				<Button href="/settings/video-templates" variant="outline">Cancel</Button>
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}
						Saving...
						<!-- TODO: Add spinner icon -->
					{:else}
						Save Changes
					{/if}
				</Button>
			</div>
		</form>
	{/if}
</div>
