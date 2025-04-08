<script lang="ts">
	import Button from '$lib/components/ui/button/Button.svelte';
	import Input from '$lib/components/ui/input/Input.svelte';
	import Label from '$lib/components/ui/label/Label.svelte';
	import Textarea from '$lib/components/ui/textarea/Textarea.svelte';
	import { videoFormats, videoPlatforms } from '$lib/components/constants'; // Keep import
	import type { videoTemplates } from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm'; // Keep if needed
	import { AlertCircle } from 'lucide-svelte';
	// Import types from the dedicated file
	import type { VideoTemplateInputData, VideoTemplatePayload } from '$lib/types/videoTemplate.types';
	// Remove local type definitions below (VideoTemplate, VideoTemplateInputData, VideoTemplatePayload)


	// --- Props ---
	type VideoTemplateFormProps = {
		initialData?: VideoTemplateInputData | null;
		onSubmit?: (payload: VideoTemplatePayload) => Promise<void>; // Optional for client-side handling
		onCancel: () => void;
		isSubmitting?: boolean;
		formErrors?: Record<string, any>;
	};
	let {
		initialData = null,
		onSubmit,
		onCancel,
		isSubmitting = false,
		formErrors = {}
	}: VideoTemplateFormProps = $props();

	// --- State Management ---
	// Convert initial array to JSON string for textarea binding
	let recommendedPlatformsString = $state(initialData?.recommendedPlatforms ? JSON.stringify(initialData.recommendedPlatforms, null, 2) : '');

	let templateCode = $state(initialData?.templateCode ?? '');
	let name = $state(initialData?.name ?? '');
	let durationSeconds = $state<number | ''>(initialData?.durationSeconds ?? '');
	let materialCount = $state<number | ''>(initialData?.materialCount ?? '');
	let aspectRatio = $state(initialData?.aspectRatio ?? '');
	let sceneCount = $state<number | ''>(initialData?.sceneCount ?? '');
	let resolution = $state(initialData?.resolution ?? '');
	let previewUrl = $state(initialData?.previewUrl ?? '');

	// Determine edit mode
	const isEditMode = $derived(!!initialData?.templateCode || !!initialData?.name); // Use fields likely present

	// --- Form Submission Logic (Client-side) ---
	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		let currentFormErrors: Record<string, any> = {}; // Local errors for parsing
		let parsedPlatforms = null;
		let parsingError = false;

		// Attempt to parse recommendedPlatforms if provided
		if (recommendedPlatformsString.trim()) {
			try {
				parsedPlatforms = JSON.parse(recommendedPlatformsString);
				if (!Array.isArray(parsedPlatforms)) {
					throw new Error('Recommended Platforms must be a valid JSON array.');
				}
				if (!parsedPlatforms.every(p => videoPlatforms.includes(p))) {
					throw new Error(`Invalid platform found. Valid options: ${videoPlatforms.join(', ')}`);
				}
			} catch (e: any) {
				currentFormErrors = { recommendedPlatforms: e.message || 'Invalid JSON format.' };
				parsingError = true;
			}
		}

		if (parsingError) {
			// If onSubmit prop exists, pass the parsing error back to the parent
			if (onSubmit) {
				// We can't directly set the parent's formErrors state here.
				// The parent needs to handle this based on a potential error return or separate callback.
				// For simplicity now, we just log it and prevent submission.
				console.error("JSON Parsing Error:", currentFormErrors.recommendedPlatforms);
				// Or potentially: onSubmit({ error: currentFormErrors }); // Modify onSubmit signature if needed
			} else {
				// If handled by form action, the action needs to re-validate this.
				// We can't easily pass this client-side error back to the action's 'form' prop.
				alert(`Error in Recommended Platforms: ${currentFormErrors.recommendedPlatforms}`); // Simple alert for now
			}
			return; // Stop submission
		}


		const payload: VideoTemplatePayload = {
			templateCode: templateCode || null,
			name: name || null,
			durationSeconds: durationSeconds === '' ? null : Number(durationSeconds),
			materialCount: materialCount === '' ? null : Number(materialCount),
			aspectRatio: (aspectRatio || null) as typeof videoFormats[number] | null, // Cast to correct type
			sceneCount: sceneCount === '' ? null : Number(sceneCount),
			recommendedPlatforms: parsedPlatforms, // Use parsed value
			resolution: resolution || null,
			previewUrl: previewUrl || null
		};

		if (onSubmit) {
			await onSubmit(payload);
		} else {
			// If onSubmit is not provided, the form likely relies on a parent <form method="POST">
			// However, the JSON parsing needs to happen server-side in the action as well.
			// This component structure works best when submission is handled via the onSubmit prop.
			console.warn('VideoTemplateForm submitted, but no onSubmit handler provided.');
		}
	}

	const useClientSubmit = $derived(!!onSubmit);

</script>

{#if formErrors?.server}
	<div class="mb-4 flex items-center rounded border border-red-500 bg-red-50 p-3 text-sm text-red-700">
		<AlertCircle class="mr-2 h-4 w-4 flex-shrink-0" />
		<span>{formErrors.server}</span>
	</div>
{/if}

<form onsubmit={useClientSubmit ? handleSubmit : undefined} class="space-y-6">
	<!-- Template Details -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<div>
			<Label for="templateCode" class={formErrors?.templateCode ? 'text-red-600' : ''}>Template Code (Unique, Optional)</Label>
			<Input id="templateCode" name="templateCode" type="text" maxlength={50} bind:value={templateCode} disabled={isSubmitting} class={formErrors?.templateCode ? 'border-red-500' : ''} placeholder="e.g., 02766[正]" />
			{#if formErrors?.templateCode}<p class="mt-1 text-sm text-red-600">{formErrors.templateCode}</p>{/if}
		</div>
		<div>
			<Label for="name" class={formErrors?.name ? 'text-red-600' : ''}>Template Name (Optional)</Label>
			<Input id="name" name="name" type="text" maxlength={150} bind:value={name} disabled={isSubmitting} class={formErrors?.name ? 'border-red-500' : ''} placeholder="e.g., Dynamic Product Showcase" />
			{#if formErrors?.name}<p class="mt-1 text-sm text-red-600">{formErrors.name}</p>{/if}
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<div>
			<Label for="durationSeconds" class={formErrors?.durationSeconds ? 'text-red-600' : ''}>Duration (sec, Opt)</Label>
			<Input id="durationSeconds" name="durationSeconds" type="number" min="0" step="1" bind:value={durationSeconds} disabled={isSubmitting} class={formErrors?.durationSeconds ? 'border-red-500' : ''} />
			{#if formErrors?.durationSeconds}<p class="mt-1 text-sm text-red-600">{formErrors.durationSeconds}</p>{/if}
		</div>
		<div>
			<Label for="materialCount" class={formErrors?.materialCount ? 'text-red-600' : ''}>Material Count (Opt)</Label>
			<Input id="materialCount" name="materialCount" type="number" min="0" step="1" bind:value={materialCount} disabled={isSubmitting} class={formErrors?.materialCount ? 'border-red-500' : ''} />
			{#if formErrors?.materialCount}<p class="mt-1 text-sm text-red-600">{formErrors.materialCount}</p>{/if}
		</div>
		<div>
			<Label for="sceneCount" class={formErrors?.sceneCount ? 'text-red-600' : ''}>Scene Count (Opt)</Label>
			<Input id="sceneCount" name="sceneCount" type="number" min="0" step="1" bind:value={sceneCount} disabled={isSubmitting} class={formErrors?.sceneCount ? 'border-red-500' : ''} />
			{#if formErrors?.sceneCount}<p class="mt-1 text-sm text-red-600">{formErrors.sceneCount}</p>{/if}
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<div>
			<Label for="aspectRatio" class={formErrors?.aspectRatio ? 'text-red-600' : ''}>Aspect Ratio (Opt)</Label>
			<select id="aspectRatio" name="aspectRatio" bind:value={aspectRatio} disabled={isSubmitting} class={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${formErrors?.aspectRatio ? 'border-red-500' : ''}`}>
				<option value="">-- Select Ratio --</option>
				{#each videoFormats as formatOption (formatOption)}
					<option value={formatOption}>{formatOption}</option>
				{/each}
			</select>
			{#if formErrors?.aspectRatio}<p class="mt-1 text-sm text-red-600">{formErrors.aspectRatio}</p>{/if}
		</div>
		<div>
			<Label for="resolution" class={formErrors?.resolution ? 'text-red-600' : ''}>Resolution (Opt)</Label>
			<Input id="resolution" name="resolution" type="text" maxlength={50} bind:value={resolution} disabled={isSubmitting} class={formErrors?.resolution ? 'border-red-500' : ''} placeholder="e.g., 1920x1080" />
			{#if formErrors?.resolution}<p class="mt-1 text-sm text-red-600">{formErrors.resolution}</p>{/if}
		</div>
	</div>

	<div>
		<Label for="recommendedPlatforms" class={formErrors?.recommendedPlatforms ? 'text-red-600' : ''}>Recommended Platforms (JSON Array, Opt)</Label>
		<Textarea id="recommendedPlatforms" name="recommendedPlatforms" rows={3} bind:value={recommendedPlatformsString} disabled={isSubmitting} class={formErrors?.recommendedPlatforms ? 'border-red-500' : ''} placeholder='["YouTube", "Facebook", "Instagram"]' />
		<p class="mt-1 text-sm text-gray-500">Enter a valid JSON array of strings. Valid platforms: {videoPlatforms.join(', ')}.</p>
		{#if formErrors?.recommendedPlatforms}<p class="mt-1 text-sm text-red-600">{formErrors.recommendedPlatforms}</p>{/if}
	</div>

	<div>
		<Label for="previewUrl" class={formErrors?.previewUrl ? 'text-red-600' : ''}>Preview URL (Optional)</Label>
		<Input id="previewUrl" name="previewUrl" type="url" bind:value={previewUrl} disabled={isSubmitting} class={formErrors?.previewUrl ? 'border-red-500' : ''} placeholder="https://..." />
		{#if formErrors?.previewUrl}<p class="mt-1 text-sm text-red-600">{formErrors.previewUrl}</p>{/if}
	</div>

	<!-- Actions -->
	<div class="flex justify-end gap-2 pt-4">
		<Button type="button" onclick={onCancel} variant="outline" disabled={isSubmitting}>Cancel</Button>
		<Button type="submit" disabled={isSubmitting}>
			{#if isSubmitting}
				{#if isEditMode}Saving...{:else}Creating...{/if}
			{:else}
				{#if isEditMode}Save Changes{:else}Create Template{/if}
			{/if}
		</Button>
	</div>
</form>
