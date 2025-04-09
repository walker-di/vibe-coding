<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Select from '$lib/components/ui/select/index.js'; // Import Select
	import CanvasEditor from '$lib/components/story/CanvasEditor.svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types'; // Import PageData type
	import type { CanvasTemplate } from '$lib/types/canvasTemplate.types';
	import { canvasAspectRatios, commonResolutions } from '$lib/constants'; // Import constants
	import type { CanvasAspectRatio, CommonResolution } from '$lib/constants'; // Import types
	import { onMount } from 'svelte'; // Import onMount

	let { data }: { data: PageData } = $props(); // Get data from load function

	// Helper to determine initial resolution selection type
	function getInitialResolutionSelection(res: string | null): CommonResolution | '' {
		if (!res) return '';
		const known = commonResolutions.find(r => r === res);
		return known ? known : 'Custom';
	}

	// Initialize state from loaded data
	let name = $state(data.template.name);
	let description = $state(data.template.description ?? '');
	let aspectRatio = $state<CanvasAspectRatio>(data.template.aspectRatio ?? '16:9'); // Added
	let resolutionSelection = $state<CommonResolution | ''>(getInitialResolutionSelection(data.template.resolution)); // Added
	let customResolution = $state(resolutionSelection === 'Custom' ? (data.template.resolution ?? '') : ''); // Added
	let canvasDataJson = $state<string | null>(data.template.canvasData); // Initial canvas data
	let isSaving = $state(false);
	let canvasEditorRef: CanvasEditor | null = $state(null);
	let isCanvasReady = $state(false); // Track if canvas editor is initialized
	let canvasHasChanged = $state(false); // Track if user modified the canvas

	// Derived state for the final resolution value to be saved
	let finalResolution = $derived(resolutionSelection === 'Custom' ? customResolution.trim() : resolutionSelection);

	function handleCanvasChange(json: string) {
		if (isCanvasReady) { // Only track changes after initial load
			canvasHasChanged = true;
		}
		canvasDataJson = json;
		// console.log('Updated canvas data received in parent:', json.substring(0, 50) + '...');
	}

	function handleCanvasReady() {
		console.log('CanvasEditor signaled ready.');
		isCanvasReady = true;
		// Load initial data *after* canvas is ready
		if (canvasEditorRef && data.template.canvasData) {
			console.log('Loading initial canvas data into editor...');
			canvasEditorRef.loadCanvasData(data.template.canvasData);
		} else {
			console.warn('Canvas ready, but ref or initial data missing.');
		}
	}

	async function updateTemplate() {
		if (!name.trim()) {
			toast.error('Template name is required.');
			return;
		}
		if (!canvasDataJson) {
			toast.error('Could not get canvas data.');
			return;
		}

		isSaving = true;
		let finalPreviewUrl: string | null = data.template.previewImageUrl; // Start with existing URL
		let previewUpdateFailed = false;

		try {
			// --- Step 1: Check if canvas changed and generate/upload new preview ---
			if (canvasHasChanged && canvasEditorRef) {
				console.log('[Preview Update] Canvas changed, attempting to generate new preview...');
				const imageDataUrl = canvasEditorRef.getCanvasImageDataUrl();
				if (imageDataUrl) {
					try {
						console.log('[Preview Update] Attempting to upload new preview...');
						const uploadedUrl = await uploadTemplatePreview(imageDataUrl, data.template.id);
						if (uploadedUrl) {
							console.log('[Preview Update] New preview uploaded successfully:', uploadedUrl);
							finalPreviewUrl = uploadedUrl; // Use the new URL
						} else {
							previewUpdateFailed = true;
							console.warn('[Preview Update] Upload returned invalid URL.');
							toast.warning('Failed to save updated preview image (invalid URL returned).');
						}
					} catch (uploadError: any) {
						previewUpdateFailed = true;
						console.error('[Preview Update] Error during preview upload:', uploadError);
						toast.error(`Failed to save updated preview image: ${uploadError.message}`);
						// Continue with main update, but using the old preview URL
					}
				} else {
					previewUpdateFailed = true;
					console.warn('[Preview Update] Could not generate image data URL for new preview.');
					toast.warning('Could not generate preview image data from updated canvas.');
					// Continue with main update, but using the old preview URL
				}
			} else if (canvasHasChanged) {
				// Canvas changed but editor ref is missing? Should not happen if canvas is ready.
				previewUpdateFailed = true;
				console.warn('[Preview Update] Canvas changed but editor ref is missing.');
			}

			// --- Step 2: Update the template record with potentially new preview URL ---
			console.log(`[Template Update] Updating template ${data.template.id} with preview URL: ${finalPreviewUrl}`);
			const response = await fetch(`/api/canvas-templates/${data.template.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: name.trim(),
					description: description.trim() || null,
					aspectRatio: aspectRatio, // Added
					resolution: finalResolution || null, // Added
					canvasData: canvasDataJson, // Send the latest canvas data
					previewImageUrl: finalPreviewUrl // Send the final URL (new or old)
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: response.statusText }));
				throw new Error(errorData.message || `Failed to update template: ${response.statusText}`);
			}

			const updatedTemplate = await response.json();

			// Show appropriate success message
			if (!previewUpdateFailed && canvasHasChanged) {
				toast.success(`Template "${updatedTemplate.name}" updated successfully with new preview!`);
			} else if (previewUpdateFailed) {
				toast.warning(`Template "${updatedTemplate.name}" updated, but preview image update failed.`);
			} else {
				toast.success(`Template "${updatedTemplate.name}" updated successfully!`);
			}

			goto('/settings/canvas-templates'); // Redirect to list page

		} catch (err: any) { // Catches errors from the main PUT request
			console.error('Error updating template:', err);
			toast.error(`Failed to update template: ${err.message}`);
		} finally {
			isSaving = false;
		}
	}


	// Effect to load data when canvas is ready (alternative to onReady prop)
	// $effect.pre(() => {
	// 	if (isCanvasReady && canvasEditorRef && data.template.canvasData) {
	// 		console.log('Effect: Loading initial canvas data...');
	// 		canvasEditorRef.loadCanvasData(data.template.canvasData);
	// 		// Potentially need to prevent this from running multiple times if isCanvasReady flicks
	// 	}
	// });


	// Helper function to upload preview image (copied from new page)
	async function uploadTemplatePreview(dataUrl: string, templateId: number): Promise<string | null> {
		try {
			const response = await fetch('/api/upload/template-preview', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ imageData: dataUrl, templateId: templateId })
			});
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || `Upload failed with status ${response.status}`);
			}
			const result = await response.json();
			return result.imageUrl;
		} catch (error: any) {
			console.error('Error uploading template preview:', error);
			// Re-throw to be caught in updateTemplate
			throw new Error(`Preview Upload Error: ${error.message}`);
		}
	}
</script>

<svelte:head>
	<title>Edit Canvas Template: {data.template.name}</title>
</svelte:head>

<div class="container mx-auto p-4 md:p-6 lg:p-8">
	<h1 class="text-2xl font-bold mb-6">Edit Canvas Template: {data.template.name}</h1>

	<form onsubmit={updateTemplate} class="space-y-6">
		<div>
			<Label for="template-name">Template Name</Label>
			<Input id="template-name" bind:value={name} required />
		</div>

		<div>
			<Label for="template-description">Description (Optional)</Label>
			<Textarea id="template-description" bind:value={description} />
		</div>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<div>
				<Label for="aspect-ratio">Aspect Ratio</Label>
				<Select.Root
					value={aspectRatio}
					onValueChange={(v: any) => { if (v) aspectRatio = v.value; }}
				>
					<Select.Trigger class="w-full" id="aspect-ratio">
						{aspectRatio || 'Select aspect ratio...'}
					</Select.Trigger>
					<Select.Content>
						{#each canvasAspectRatios as ratio (ratio)}
							<Select.Item value={ratio} label={ratio}>{ratio}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div>
				<Label for="resolution">Resolution</Label>
				<Select.Root
					value={resolutionSelection}
					onValueChange={(v: any) => { if (v) resolutionSelection = v.value; }}
				>
					<Select.Trigger class="w-full" id="resolution">
						{resolutionSelection || 'Select resolution...'}
					</Select.Trigger>
					<Select.Content>
						{#each commonResolutions as res (res)}
							<Select.Item value={res} label={res}>{res}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				{#if resolutionSelection === 'Custom'}
					<Input
						type="text"
						bind:value={customResolution}
						placeholder="e.g., 800x600"
						class="mt-2"
					/>
				{/if}
			</div>
		</div>

		<div>
			<Label>Canvas Content</Label>
			<div class="border rounded-md p-1">
				{#if data.template} <!-- Ensure template data is loaded before rendering editor -->
					<CanvasEditor
						bind:this={canvasEditorRef}
						onCanvasChange={handleCanvasChange}
						onReady={handleCanvasReady}
					/>
				{:else}
					<p>Loading editor...</p> <!-- Placeholder -->
				{/if}
			</div>
			{#if !isCanvasReady}
				<p class="text-sm text-yellow-600 mt-1">Waiting for canvas editor to initialize...</p>
			{/if}
			<p class="text-sm text-gray-500 mt-1">Modify the template content above.</p>
		</div>


		<div class="flex justify-end gap-4">
			<Button type="button" variant="outline" href="/settings/canvas-templates" disabled={isSaving}>
				Cancel
			</Button>
			<Button type="submit" disabled={isSaving || !name || !isCanvasReady}>
				{#if isSaving}
					Saving...
				{:else}
					Update Template
				{/if}
			</Button>
		</div>
	</form>
</div>
