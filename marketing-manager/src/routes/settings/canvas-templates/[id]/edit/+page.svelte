<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Select from '$lib/components/ui/select/index.js'; // Import Select
	import CanvasEditor from '$lib/components/story/CanvasEditor.svelte';
	import ImageUploadModal from '$lib/components/story/ImageUploadModal.svelte';
	import { FileUpload } from '$lib/components/ui/file-upload';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types'; // Import PageData type
	import { canvasAspectRatios, commonResolutions } from '$lib/constants'; // Import constants
	import type { CanvasAspectRatio, CommonResolution } from '$lib/constants'; // Import types
	import { Square, Circle, Type, Image as ImageIcon, Trash2, Layers } from 'lucide-svelte';

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
	// Initialize custom resolution value
let customResolution = $state(data.template.resolution && getInitialResolutionSelection(data.template.resolution) === 'Custom' ? data.template.resolution : '');
	let canvasDataJson = $state<string | null>(data.template.canvasData); // Initial canvas data
	let isSaving = $state(false);
	let canvasEditorRef: CanvasEditor | null = $state(null);
	let isCanvasReady = $state(false); // Track if canvas editor is initialized
	let canvasHasChanged = $state(false); // Track if user modified the canvas
	let isImageUploadModalOpen = $state(false); // Track if image upload modal is open
	let isBackgroundImageModalOpen = $state(false); // Track if background image modal is open

	// Filter resolutions based on selected aspect ratio
function getCompatibleResolutions(selectedAspectRatio: CanvasAspectRatio): CommonResolution[] {
	const aspectRatioMap: Record<CanvasAspectRatio, string[]> = {
		'16:9': ['1920x1080 (16:9 HD)'],
		'9:16': ['1080x1920 (9:16 HD)'],
		'1:1': ['1080x1080 (1:1 Square)'],
		'4:5': ['1080x1350 (4:5 Portrait)'],
		'1.91:1': ['1200x628 (Landscape Ad)'],
		'Other': [...commonResolutions.filter(r => r !== 'Custom')]
	};

	// Always include Custom option
	return [...(aspectRatioMap[selectedAspectRatio] || []), 'Custom'] as CommonResolution[];
}

// Filtered resolutions based on current aspect ratio
let compatibleResolutions = $derived(getCompatibleResolutions(aspectRatio));

// Automatically update resolution when aspect ratio changes
$effect(() => {
	// Get the first compatible resolution for this aspect ratio (excluding Custom)
	const defaultResolution = compatibleResolutions.find(res => res !== 'Custom');

	// If the current selection is not compatible or empty, set it to the default
	if (!resolutionSelection ||
		(resolutionSelection !== 'Custom' && !compatibleResolutions.includes(resolutionSelection))) {
		resolutionSelection = defaultResolution || 'Custom';
	}
});

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

	// Helper function to parse aspect ratio string and calculate dimensions
	function calculateDimensions(ratioString: CanvasAspectRatio, fixedWidth: number): { width: number; height: number } {
		// Handle special cases
		if (ratioString === 'Other') {
			return { width: fixedWidth, height: Math.round(fixedWidth * (9/16)) };
		}

		// Handle 1.91:1 aspect ratio specifically
		if (ratioString === '1.91:1') {
			return { width: fixedWidth, height: Math.round(fixedWidth / 1.91) };
		}

		if (!ratioString || typeof ratioString !== 'string' || !ratioString.includes(':')) {
			console.warn(`Invalid aspect ratio string: ${ratioString}. Defaulting to 600x400.`);
			return { width: fixedWidth, height: 400 }; // Default or fallback
		}
		const parts = ratioString.split(':');
		const ratioW = parseFloat(parts[0]);
		const ratioH = parseFloat(parts[1]);

		if (isNaN(ratioW) || isNaN(ratioH) || ratioW <= 0 || ratioH <= 0) {
			console.warn(`Invalid aspect ratio numbers: ${ratioString}. Defaulting to 600x400.`);
			return { width: fixedWidth, height: 400 }; // Default or fallback
		}

		const newHeight = Math.round((fixedWidth / ratioW) * ratioH);
		return { width: fixedWidth, height: newHeight };
	}

	// Effect to update canvas dimensions when aspect ratio changes
	$effect(() => {
		if (isCanvasReady && canvasEditorRef && aspectRatio) {
			console.log(`Effect: Aspect ratio changed to ${aspectRatio}. Updating canvas dimensions.`);
			const { width, height } = calculateDimensions(aspectRatio, 600); // Keep width fixed at 600 for now
			canvasEditorRef.updateDimensions(width, height);
		} else {
			console.log(`Effect: Canvas dimension update skipped. Ready: ${isCanvasReady}, Ref: ${!!canvasEditorRef}, Ratio: ${aspectRatio}`);
		}
	});


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
				<!-- Use native select for Aspect Ratio -->
				<select
					id="aspect-ratio"
					bind:value={aspectRatio}
					class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#each canvasAspectRatios as ratio (ratio)}
						<option value={ratio}>{ratio}</option>
					{/each}
				</select>
			</div>
			<div>
				<Label for="resolution">Resolution</Label>
				<Select.Root
					bind:value={resolutionSelection}
					type="single"
				>
					<Select.Trigger class="w-full" id="resolution">
						{resolutionSelection || 'Select resolution...'}
					</Select.Trigger>
					<Select.Content>
						{#each compatibleResolutions as res (res)}
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
			<div class="border rounded-md p-4">
				<!-- Canvas Controls -->
				{#if isCanvasReady && canvasEditorRef}
					<div class="flex flex-wrap gap-2 mb-4">
						<Button variant="outline" onclick={() => canvasEditorRef?.addRectangle()} title="Add Rectangle">
							<Square class="h-4 w-4 mr-2" /> Rectangle
						</Button>
						<Button variant="outline" onclick={() => canvasEditorRef?.addCircle()} title="Add Circle">
							<Circle class="h-4 w-4 mr-2" /> Circle
						</Button>
						<Button variant="outline" onclick={() => canvasEditorRef?.addText()} title="Add Text">
							<Type class="h-4 w-4 mr-2" /> Text
						</Button>
						<Button variant="outline" onclick={() => isImageUploadModalOpen = true} title="Add Image">
							<ImageIcon class="h-4 w-4 mr-2" /> Image
						</Button>
						<Button variant="outline" onclick={() => canvasEditorRef?.deleteSelected()} title="Delete Selected">
							<Trash2 class="h-4 w-4 mr-2" /> Delete
						</Button>
						<Button variant="outline" onclick={() => canvasEditorRef?.clearCanvas()} title="Clear Canvas">
							Clear All
						</Button>
						<Button variant="outline" onclick={() => isBackgroundImageModalOpen = true} title="Set Background Image">
							<ImageIcon class="h-4 w-4 mr-2" /> BG Image
						</Button>
						<Button variant="outline" onclick={() => canvasEditorRef?.showLayerOrderModal()} title="Manage Layers">
							<Layers class="h-4 w-4 mr-2" /> Layers
						</Button>
					</div>
				{/if}

				<!-- Direct file upload button -->
				<div class="mb-4">
					<div class="flex flex-col space-y-2">
						<h3 class="text-sm font-medium">Upload Image to Library</h3>
						<FileUpload
							buttonText="Choose Image"
							accept="image/*"
							on:upload={(event) => {
								const { url } = event.detail;
								toast.success('Image uploaded successfully');
								console.log('Uploaded image URL:', url);

								// Add the image to the canvas
								if (canvasEditorRef && url) {
									// Use the existing addImage method with the URL
									const wf = window as any;
									const canvas = canvasEditorRef.getCanvasInstance();
									if (canvas && wf.fabric) {
										const objectCount = canvas.getObjects().length;
										wf.fabric.Image.fromURL(url, (img: any) => {
											const maxW = canvas.width * 0.8;
											const maxH = canvas.height * 0.8;
											if (img.width > maxW || img.height > maxH) {
												const scale = Math.min(maxW / img.width, maxH / img.height);
												img.scale(scale);
											}
											// Set a name for the image
											const objectName = `Image ${objectCount + 1}`;
											img.name = objectName;
											// Ensure the name is set using the set method
											img.set('name', objectName);
											canvas.add(img);
											canvas.setActiveObject(img);
											canvas.renderAll();
											// Mark canvas as changed
											canvasHasChanged = true;
										}, { crossOrigin: 'anonymous' });
									}
								}
							}}
							on:error={(event) => {
								const { message } = event.detail;
								toast.error(`Upload failed: ${message}`);
								console.error('Upload error:', message);
							}}
						/>
						<p class="text-xs text-gray-500 mt-1">Upload images to use in your templates</p>
					</div>
				</div>

				<!-- Canvas Editor -->
				{#if data.template} <!-- Ensure template data is loaded before rendering editor -->
					<!-- Hide built-in controls since we're providing our own -->
					<CanvasEditor
						bind:this={canvasEditorRef}
						onCanvasChange={handleCanvasChange}
						onReady={handleCanvasReady}
						hideControls
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

	<!-- Image Upload Modal -->
	<ImageUploadModal
		open={isImageUploadModalOpen}
		onClose={() => isImageUploadModalOpen = false}
		onImageSelected={(url) => {
			if (canvasEditorRef && url) {
				// Use the existing addImage method with the URL
				const wf = window as any;
				const canvas = canvasEditorRef.getCanvasInstance();
				if (canvas && wf.fabric) {
					const objectCount = canvas.getObjects().length;
					wf.fabric.Image.fromURL(url, (img: any) => {
						const maxW = canvas.width * 0.8;
						const maxH = canvas.height * 0.8;
						if (img.width > maxW || img.height > maxH) {
							const scale = Math.min(maxW / img.width, maxH / img.height);
							img.scale(scale);
						}
						// Set a name for the image
						const objectName = `Image ${objectCount + 1}`;
						img.name = objectName;
						// Ensure the name is set using the set method
						img.set('name', objectName);
						canvas.add(img);
						canvas.setActiveObject(img);
						canvas.renderAll();
						// Mark canvas as changed
						canvasHasChanged = true;
					}, { crossOrigin: 'anonymous' });
				}
			}
		}}
	/>

	<!-- Background Image Modal -->
	<ImageUploadModal
		open={isBackgroundImageModalOpen}
		onClose={() => isBackgroundImageModalOpen = false}
		isForBackground={true}
		onUnsetBackground={() => {
			if (canvasEditorRef) {
				const canvas = canvasEditorRef.getCanvasInstance();
				if (canvas) {
					// Remove background image
					canvas.setBackgroundImage(null, canvas.renderAll.bind(canvas));
					// Mark canvas as changed
					canvasHasChanged = true;
					// Get the updated canvas JSON and update the state
					canvasDataJson = canvasEditorRef.getCurrentCanvasJson();
					toast.success('Background image removed');
				}
			}
		}}
		onImageSelected={(url) => {
			if (canvasEditorRef && url) {
				// Set background image
				const wf = window as any;
				const canvas = canvasEditorRef.getCanvasInstance();
				if (canvas && wf.fabric) {
					wf.fabric.Image.fromURL(url, (img: any) => {
						// Scale the image to fit the canvas dimensions
						const canvasWidth = canvas.width;
						const canvasHeight = canvas.height;
						const scaleX = canvasWidth / img.width;
						const scaleY = canvasHeight / img.height;
						const scale = Math.min(scaleX, scaleY); // Use min to fit while maintaining aspect ratio

						img.set({
							scaleX: scale,
							scaleY: scale,
							originX: 'left',
							originY: 'top'
						});

						canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
						// Mark canvas as changed
						canvasHasChanged = true;
						// Get the updated canvas JSON and update the state
						canvasDataJson = canvasEditorRef.getCurrentCanvasJson();
						toast.success('Background image set');
					}, { crossOrigin: 'anonymous' });
				}
			}
		}}
	/>
</div>
