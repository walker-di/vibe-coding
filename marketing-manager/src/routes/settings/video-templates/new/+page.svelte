<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea'; // Use Textarea for recommended platforms
	import { AlertCircle } from 'lucide-svelte';
	import { videoFormats } from '$lib/server/db/schema'; // Import enum for format dropdown

	// --- State ---
	let templateCode = $state('');
	let name = $state('');
	let durationSeconds = $state<number | ''>('');
	let materialCount = $state<number | ''>('');
	let aspectRatio = $state<typeof videoFormats[number] | ''>('');
	let sceneCount = $state<number | ''>('');
	let recommendedPlatformsRaw = $state(''); // Input as comma-separated string
	let resolution = $state('');
	let previewUrl = $state('');

	let isSubmitting = $state(false);
	let formErrors = $state<Record<string, any>>({});

	// --- Form Submission ---
	async function handleSubmit() {
		isSubmitting = true;
		formErrors = {};
		let parsedPlatforms: string[] | null = null;

		// Basic validation for recommended platforms (expecting comma-separated)
		if (recommendedPlatformsRaw) {
			parsedPlatforms = recommendedPlatformsRaw.split(',').map(p => p.trim()).filter(p => p.length > 0);
		}

		const payload = {
			templateCode: templateCode || null,
			name: name || null,
			durationSeconds: durationSeconds || null,
			materialCount: materialCount || null,
			aspectRatio: aspectRatio || null,
			sceneCount: sceneCount || null,
			recommendedPlatforms: parsedPlatforms,
			resolution: resolution || null,
			previewUrl: previewUrl || null
		}; // Ensure this object is correctly closed

		try {
			const response = await fetch('/api/video-templates', {
				method: 'POST',
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
				console.error("Video Template creation failed:", formErrors);
				return; // Exit if error
			}

			await goto('/settings/video-templates'); // Redirect on success

		} catch (e: any) {
			console.error('Video Template submission error:', e);
			formErrors = { server: 'Failed to submit form. Please check your connection.' };
		} finally {
			isSubmitting = false;
		}
	} // Ensure this function is correctly closed
</script>

<div class="container mx-auto max-w-2xl py-8">
	<h1 class="mb-6 text-2xl font-bold">Create New Video Template</h1>

	{#if formErrors.server}
		<div class="mb-4 flex items-center rounded border border-red-500 bg-red-50 p-3 text-sm text-red-700">
			<AlertCircle class="mr-2 h-4 w-4 flex-shrink-0" />
			<span>{formErrors.server}</span>
		</div>
	{/if}

	<form onsubmit={handleSubmit} class="space-y-6">
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<div>
				<Label for="templateCode" class={formErrors.templateCode ? 'text-red-600' : ''}>Template Code (Unique)</Label>
				<Input id="templateCode" name="templateCode" type="text" bind:value={templateCode} disabled={isSubmitting} class={formErrors.templateCode ? 'border-red-500' : ''} placeholder="e.g., 02766" />
				{#if formErrors.templateCode}<p class="mt-1 text-sm text-red-600">{formErrors.templateCode}</p>{/if}
			</div>
			<div>
				<Label for="name" class={formErrors.name ? 'text-red-600' : ''}>Template Name (Optional)</Label>
				<Input id="name" name="name" type="text" bind:value={name} disabled={isSubmitting} class={formErrors.name ? 'border-red-500' : ''} placeholder="e.g., Product Demo Reel" />
				{#if formErrors.name}<p class="mt-1 text-sm text-red-600">{formErrors.name}</p>{/if}
			</div>
		</div>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<div>
				<Label for="durationSeconds" class={formErrors.durationSeconds ? 'text-red-600' : ''}>Duration (seconds)</Label>
				<Input id="durationSeconds" name="durationSeconds" type="number" bind:value={durationSeconds} disabled={isSubmitting} class={formErrors.durationSeconds ? 'border-red-500' : ''} placeholder="e.g., 15" />
				{#if formErrors.durationSeconds}<p class="mt-1 text-sm text-red-600">{formErrors.durationSeconds}</p>{/if}
			</div>
			<div>
				<Label for="materialCount" class={formErrors.materialCount ? 'text-red-600' : ''}>Material Count</Label>
				<Input id="materialCount" name="materialCount" type="number" bind:value={materialCount} disabled={isSubmitting} class={formErrors.materialCount ? 'border-red-500' : ''} placeholder="e.g., 5" />
				{#if formErrors.materialCount}<p class="mt-1 text-sm text-red-600">{formErrors.materialCount}</p>{/if}
			</div>
			<div>
				<Label for="sceneCount" class={formErrors.sceneCount ? 'text-red-600' : ''}>Scene Count</Label>
				<Input id="sceneCount" name="sceneCount" type="number" bind:value={sceneCount} disabled={isSubmitting} class={formErrors.sceneCount ? 'border-red-500' : ''} placeholder="e.g., 3" />
				{#if formErrors.sceneCount}<p class="mt-1 text-sm text-red-600">{formErrors.sceneCount}</p>{/if}
			</div>
		</div>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<div>
				<Label for="aspectRatio" class={formErrors.aspectRatio ? 'text-red-600' : ''}>Aspect Ratio</Label>
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
				<Input id="resolution" name="resolution" type="text" bind:value={resolution} disabled={isSubmitting} class={formErrors.resolution ? 'border-red-500' : ''} placeholder="e.g., 1920x1080" />
				{#if formErrors.resolution}<p class="mt-1 text-sm text-red-600">{formErrors.resolution}</p>{/if}
			</div>
		</div>

		<div>
			<Label for="recommendedPlatforms" class={formErrors.recommendedPlatforms ? 'text-red-600' : ''}>Recommended Platforms (Comma-separated, Optional)</Label>
			<Textarea id="recommendedPlatforms" name="recommendedPlatforms" rows={2} bind:value={recommendedPlatformsRaw} disabled={isSubmitting} class={formErrors.recommendedPlatforms ? 'border-red-500' : ''} placeholder="e.g., YouTube, Instagram, TikTok" />
			{#if formErrors.recommendedPlatforms}<p class="mt-1 text-sm text-red-600">{formErrors.recommendedPlatforms}</p>{/if}
		</div>

		<div>
			<Label for="previewUrl" class={formErrors.previewUrl ? 'text-red-600' : ''}>Preview URL (Optional)</Label>
			<Input id="previewUrl" name="previewUrl" type="url" bind:value={previewUrl} disabled={isSubmitting} class={formErrors.previewUrl ? 'border-red-500' : ''} placeholder="https://..." />
			{#if formErrors.previewUrl}<p class="mt-1 text-sm text-red-600">{formErrors.previewUrl}</p>{/if}
		</div>


		<div class="flex justify-end gap-2 pt-4">
			<Button href="/settings/video-templates" variant="outline">Cancel</Button>
			<Button type="submit" disabled={isSubmitting}>
				{#if isSubmitting}
					Creating...
				{:else}
					Create Template
				{/if}
			</Button>
		</div>
	</form>
</div>
