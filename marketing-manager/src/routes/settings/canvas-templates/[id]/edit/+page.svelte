<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Textarea } from "$lib/components/ui/textarea";
	import * as Select from "$lib/components/ui/select/index.js"; // Import Select
	import CanvasEditor from "$lib/components/story/CanvasEditor.svelte";
	import ImageUploadModal from "$lib/components/story/ImageUploadModal.svelte";
	import { FileUpload } from "$lib/components/ui/file-upload";
	import { goto } from "$app/navigation";
	import { toast } from "svelte-sonner";
	import type { PageData } from "./$types"; // Import PageData type
	import { canvasAspectRatios, commonResolutions } from "$lib/constants"; // Import constants
	import type { CanvasAspectRatio, CommonResolution } from "$lib/constants"; // Import types
	import {
		Square,
		Circle,
		Type,
		Image as ImageIcon,
		Trash2,
		Layers,
	} from "lucide-svelte";

	let { data }: { data: PageData } = $props(); // Get data from load function

	// Helper to determine initial resolution selection type
	function getInitialResolutionSelection(
		res: string | null,
	): CommonResolution | "" {
		if (!res) return "";
		const known = commonResolutions.find((r) => r === res);
		return known ? known : "Custom";
	}

	// Initialize state from loaded data
	let name = $state(data.template.name);
	let description = $state(data.template.description ?? "");
	let aspectRatio = $state<CanvasAspectRatio>(
		data.template.aspectRatio ?? "16:9",
	); // Added
	let resolutionSelection = $state<CommonResolution | "">(
		getInitialResolutionSelection(data.template.resolution),
	); // Added
	// Initialize custom resolution value
	let customResolution = $state(
		data.template.resolution &&
			getInitialResolutionSelection(data.template.resolution) === "Custom"
			? data.template.resolution
			: "",
	);
	let canvasDataJson = $state<string | null>(data.template.canvasData); // Initial canvas data
	let isSaving = $state(false);
	let canvasEditorRef: CanvasEditor | null = $state(null);
	let isCanvasReady = $state(false); // Track if canvas editor is initialized
	let canvasHasChanged = $state(false); // Track if user modified the canvas
	let isImageUploadModalOpen = $state(false); // Track if image upload modal is open
	let isBackgroundImageModalOpen = $state(false); // Track if background image modal is open
	let currentCanvasWidth = $state(800); // Default, will be updated
	let currentCanvasHeight = $state(600); // Default, will be updated

	// Filter resolutions based on selected aspect ratio
	function getCompatibleResolutions(
		selectedAspectRatio: CanvasAspectRatio,
	): CommonResolution[] {
		const aspectRatioMap: Record<CanvasAspectRatio, string[]> = {
			"16:9": ["1920x1080 (16:9 HD)"],
			"9:16": ["1080x1920 (9:16 HD)"],
			"1:1": ["1080x1080 (1:1 Square)"],
			"4:5": ["1080x1350 (4:5 Portrait)"],
			"1.91:1": ["1200x628 (Landscape Ad)"],
			Other: [...commonResolutions.filter((r) => r !== "Custom")],
		};

		// Always include Custom option
		return [
			...(aspectRatioMap[selectedAspectRatio] || []),
			"Custom",
		] as CommonResolution[];
	}

	// Filtered resolutions based on current aspect ratio
	let compatibleResolutions = $derived(getCompatibleResolutions(aspectRatio));

	// Automatically update resolution when aspect ratio changes
	$effect(() => {
		// Get the first compatible resolution for this aspect ratio (excluding Custom)
		const defaultResolution = compatibleResolutions.find(
			(res) => res !== "Custom",
		);

		// If the current selection is not compatible or empty, set it to the default
		if (
			!resolutionSelection ||
			(resolutionSelection !== "Custom" &&
				!compatibleResolutions.includes(resolutionSelection))
		) {
			resolutionSelection = defaultResolution || "Custom";
		}
	});

	// Derived state for the final resolution value to be saved
	let finalResolution = $derived(
		resolutionSelection === "Custom"
			? customResolution.trim()
			: resolutionSelection,
	);

	function onUnsetBackground() {
		// Add extra null check for TS
		if (!canvasEditorRef) return;
		const canvas = canvasEditorRef.getCanvasInstance();
		if (canvas) {
			// Remove background image
			canvas.setBackgroundImage(null, canvas.renderAll.bind(canvas));
			// Mark canvas as changed
			canvasHasChanged = true;
			// Get the updated canvas JSON and update the state
			canvasDataJson = canvasEditorRef.getCurrentCanvasJson();
			toast.success("Background image removed");
		}
	}

	function onImageSelected(url: string) {
		{
			// Add extra null check for TS
			if (!canvasEditorRef || !url) return;
			// Set background image
			const wf = window as any;
			const canvas = canvasEditorRef.getCanvasInstance();
			if (canvas && wf.fabric) {
				wf.fabric.Image.fromURL(
					url,
					(img: any) => {
						// Scale the image to fit the canvas dimensions
						const canvasWidth = canvas.width;
						const canvasHeight = canvas.height;
						const scaleX = canvasWidth / img.width;
						const scaleY = canvasHeight / img.height;
						const scale = Math.min(scaleX, scaleY); // Use min to fit while maintaining aspect ratio

						img.set({
							scaleX: scale,
							scaleY: scale,
							originX: "left",
							originY: "top",
						});

						canvas.setBackgroundImage(
							img,
							canvas.renderAll.bind(canvas),
						);
						// Mark canvas as changed
						canvasHasChanged = true;
						// Get the updated canvas JSON and update the state
						canvasDataJson = canvasEditorRef!.getCurrentCanvasJson();
						toast.success("Background image set");
					},
					{ crossOrigin: "anonymous" },
				);
			}
		}
	}
	function handleCanvasChange(json: string) {
		if (isCanvasReady) {
			// Only track changes after initial load
			canvasHasChanged = true;
		}
		canvasDataJson = json;
		// console.log('Updated canvas data received in parent:', json.substring(0, 50) + '...');
	}

	function handleCanvasReady() {
		console.log("CanvasEditor signaled ready.");
		isCanvasReady = true;

		// Set initial dimensions *before* loading data
		if (canvasEditorRef) {
			const initialDims = calculateDimensions(finalResolution); // Use derived state
			console.log(
				`Setting initial canvas dimensions: ${initialDims.width}x${initialDims.height}`,
			);
			currentCanvasWidth = initialDims.width;
			currentCanvasHeight = initialDims.height;
			canvasEditorRef.updateDimensions(
				initialDims.width,
				initialDims.height,
			);

			// Now load initial data
			if (data.template.canvasData) {
				console.log("Loading initial canvas data into editor...");
				canvasEditorRef.loadCanvasData(data.template.canvasData);
			} else {
				console.log("No initial canvas data to load.");
			}
		} else {
			console.warn("Canvas ready, but editor ref missing.");
		}
	}

	async function updateTemplate() {
		if (!name.trim()) {
			toast.error("Template name is required.");
			return;
		}
		if (!canvasDataJson) {
			toast.error("Could not get canvas data.");
			return;
		}

		isSaving = true;
		let finalPreviewUrl: string | null = data.template.previewImageUrl; // Start with existing URL
		let previewUpdateFailed = false;

		try {
			// --- Step 1: Check if canvas changed and generate/upload new preview ---
			console.log('=== TEMPLATE SAVE DEBUG START ===');
			console.log('Canvas has changed:', canvasHasChanged);
			console.log('Canvas editor ref exists:', !!canvasEditorRef);

			// Force canvasHasChanged to true to always generate a new preview
			// This is a temporary fix to ensure we're testing the export resolution
			canvasHasChanged = true;
			console.log('Forcing canvas has changed to:', canvasHasChanged);

			if (canvasEditorRef) { // Remove canvasHasChanged check to always generate preview
				console.log(
					"[Preview Update] Canvas changed, attempting to generate new preview...",
				);
				console.log('Canvas editor ref methods:', Object.keys(canvasEditorRef));
				console.log('Canvas dimensions:', canvasEditorRef.getCanvasInstance()?.width, 'x', canvasEditorRef.getCanvasInstance()?.height);

				// Call getCanvasImageDataUrl with explicit debug logging
				console.log('About to call getCanvasImageDataUrl...');
				const imageDataUrl = canvasEditorRef.getCanvasImageDataUrl();
				console.log('getCanvasImageDataUrl returned data URL length:', imageDataUrl?.length || 0);
				console.log('Data URL prefix:', imageDataUrl?.substring(0, 100) + '...' || 'null');

				if (imageDataUrl) {
					try {
						console.log(
							"[Preview Update] Attempting to upload new preview...",
						);
						const uploadedUrl = await uploadTemplatePreview(
							imageDataUrl,
							data.template.id,
						);
						console.log('Upload response URL:', uploadedUrl);

						if (uploadedUrl) {
							console.log(
								"[Preview Update] New preview uploaded successfully:",
								uploadedUrl,
							);
							finalPreviewUrl = uploadedUrl; // Use the new URL
						} else {
							previewUpdateFailed = true;
							console.warn(
								"[Preview Update] Upload returned invalid URL.",
							);
							toast.warning(
								"Failed to save updated preview image (invalid URL returned).",
							);
						}
					} catch (uploadError: any) {
						previewUpdateFailed = true;
						console.error(
							"[Preview Update] Error during preview upload:",
							uploadError,
						);
						toast.error(
							`Failed to save updated preview image: ${uploadError.message}`,
						);
						// Continue with main update, but using the old preview URL
					}
				} else {
					previewUpdateFailed = true;
					console.warn(
						"[Preview Update] Could not generate image data URL for new preview.",
					);
					toast.warning(
						"Could not generate preview image data from updated canvas.",
					);
					// Continue with main update, but using the old preview URL
				}
			} else if (canvasHasChanged) {
				// Canvas changed but editor ref is missing? Should not happen if canvas is ready.
				previewUpdateFailed = true;
				console.warn(
					"[Preview Update] Canvas changed but editor ref is missing.",
				);
			}
			console.log('=== TEMPLATE SAVE DEBUG END ===');

			// --- Step 2: Update the template record with potentially new preview URL ---
			console.log(
				`[Template Update] Updating template ${data.template.id} with preview URL: ${finalPreviewUrl}`,
			);
			const response = await fetch(
				`/api/canvas-templates/${data.template.id}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						name: name.trim(),
						description: description.trim() || null,
						aspectRatio: aspectRatio, // Added
						resolution: finalResolution || null, // Added
						canvasData: canvasDataJson, // Send the latest canvas data
						previewImageUrl: finalPreviewUrl, // Send the final URL (new or old)
					}),
				},
			);

			if (!response.ok) {
				const errorData = await response
					.json()
					.catch(() => ({ message: response.statusText }));
				throw new Error(
					errorData.message ||
						`Failed to update template: ${response.statusText}`,
				);
			}

			const updatedTemplate = await response.json();

			// Show appropriate success message
			if (!previewUpdateFailed && canvasHasChanged) {
				toast.success(
					`Template "${updatedTemplate.name}" updated successfully with new preview!`,
				);
			} else if (previewUpdateFailed) {
				toast.warning(
					`Template "${updatedTemplate.name}" updated, but preview image update failed.`,
				);
			} else {
				toast.success(
					`Template "${updatedTemplate.name}" updated successfully!`,
				);
			}

			goto("/settings/canvas-templates"); // Redirect to list page
		} catch (err: any) {
			// Catches errors from the main PUT request
			console.error("Error updating template:", err);
			toast.error(`Failed to update template: ${err.message}`);
		} finally {
			isSaving = false;
		}
	}

	// Helper function to parse resolution string (e.g., "1920x1080 (...)" or "800x600")
	function calculateDimensions(resolutionString: string | null): {
		width: number;
		height: number;
	} {
		const defaultDims = { width: 800, height: 600 }; // Default fallback
		if (!resolutionString || typeof resolutionString !== "string") {
			console.warn(
				`Invalid resolution string: ${resolutionString}. Defaulting to ${defaultDims.width}x${defaultDims.height}.`,
			);
			return defaultDims;
		}

		// Regex to extract WxH from the start of the string
		const match = resolutionString.match(/^(\d+)\s*x\s*(\d+)/i);

		if (match && match[1] && match[2]) {
			const width = parseInt(match[1], 10);
			const height = parseInt(match[2], 10);

			if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
				return { width, height };
			}
		}

		console.warn(
			`Could not parse resolution: "${resolutionString}". Defaulting to ${defaultDims.width}x${defaultDims.height}.`,
		);
		return defaultDims;
	}

	// Effect to update canvas dimensions when finalResolution changes or canvas becomes ready
	$effect(() => {
		if (isCanvasReady && canvasEditorRef && finalResolution) {
			console.log(
				`Effect: finalResolution changed to ${finalResolution} or canvas ready. Updating dimensions.`,
			);
			const { width, height } = calculateDimensions(finalResolution);
			// Only update if dimensions actually changed
			if (
				width !== currentCanvasWidth ||
				height !== currentCanvasHeight
			) {
				console.log(`Updating canvas dimensions to ${width}x${height}`);
				currentCanvasWidth = width;
				currentCanvasHeight = height;
				canvasEditorRef.updateDimensions(width, height);
			} else {
				console.log(
					`Dimensions (${width}x${height}) haven't changed. Skipping update.`,
				);
			}
		} else {
			console.log(
				`Effect: Canvas dimension update skipped. Ready: ${isCanvasReady}, Ref: ${!!canvasEditorRef}, Resolution: ${finalResolution}`,
			);
		}
	});

	// Helper function to upload preview image (copied from new page)
	async function uploadTemplatePreview(
		dataUrl: string,
		templateId: number,
	): Promise<string | null> {
		console.log('=== UPLOAD TEMPLATE PREVIEW DEBUG START ===');
		console.log('Template ID:', templateId);
		console.log('Data URL length:', dataUrl?.length || 0);
		console.log('Data URL prefix:', dataUrl?.substring(0, 100) + '...' || 'null');

		// Create an Image object to check the dimensions of the data URL
		const img = new Image();
		img.src = dataUrl;

		// Wait for the image to load to get its dimensions
		await new Promise<void>((resolve) => {
			img.onload = () => {
				console.log('Image dimensions from data URL:', img.naturalWidth, 'x', img.naturalHeight);
				resolve();
			};
			img.onerror = () => {
				console.error('Failed to load image from data URL');
				resolve();
			};
		});

		try {
			console.log('Sending POST request to /api/upload/template-preview');
			const response = await fetch("/api/upload/template-preview", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					imageData: dataUrl,
					templateId: templateId,
				}),
			});
			console.log('Response status:', response.status);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				console.error('Response error:', errorData);
				throw new Error(
					errorData.message ||
						`Upload failed with status ${response.status}`,
				);
			}
			const result = await response.json();
			console.log('Response result:', result);
			console.log('=== UPLOAD TEMPLATE PREVIEW DEBUG END ===');
			return result.imageUrl;
		} catch (error: any) {
			console.error("Error uploading template preview:", error);
			console.log('=== UPLOAD TEMPLATE PREVIEW DEBUG END (ERROR) ===');
			// Re-throw to be caught in updateTemplate
			throw new Error(`Preview Upload Error: ${error.message}`);
		}
	}
</script>

<svelte:head>
	<title>Edit Canvas Template: {data.template.name}</title>
</svelte:head>

<div class="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
	<h1 class="text-2xl font-bold mb-6">
		Edit Canvas Template: {data.template.name}
	</h1>

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
				<Select.Root bind:value={resolutionSelection} type="single">
					<Select.Trigger class="w-full" id="resolution">
						{resolutionSelection || "Select resolution..."}
					</Select.Trigger>
					<Select.Content>
						{#each compatibleResolutions as res (res)}
							<Select.Item value={res} label={res}
								>{res}</Select.Item
							>
						{/each}
					</Select.Content>
				</Select.Root>
				{#if resolutionSelection === "Custom"}
					<Input
						type="text"
						bind:value={customResolution}
						placeholder="e.g., 800x600"
						class="mt-2"
					/>
				{/if}
			</div>
		</div>

		<div class="mt-8">
			<Label class="text-lg font-semibold">Canvas Content</Label>
			<div class="border rounded-md p-4 mt-2">
				<!-- Canvas Controls -->
				{#if isCanvasReady && canvasEditorRef}
					<div class="flex flex-wrap gap-2 mb-4">
						<Button
							variant="outline"
							onclick={() => canvasEditorRef?.addRectangle()}
							title="Add Rectangle"
						>
							<Square class="h-4 w-4 mr-2" /> Rectangle
						</Button>
						<Button
							variant="outline"
							onclick={() => canvasEditorRef?.addCircle()}
							title="Add Circle"
						>
							<Circle class="h-4 w-4 mr-2" /> Circle
						</Button>
						<Button
							variant="outline"
							onclick={() => canvasEditorRef?.addText()}
							title="Add Text"
						>
							<Type class="h-4 w-4 mr-2" /> Text
						</Button>
						<Button
							variant="outline"
							onclick={() => (isImageUploadModalOpen = true)}
							title="Add Image"
						>
							<ImageIcon class="h-4 w-4 mr-2" /> Image
						</Button>
						<Button
							variant="outline"
							onclick={() => canvasEditorRef?.deleteSelected()}
							title="Delete Selected"
						>
							<Trash2 class="h-4 w-4 mr-2" /> Delete
						</Button>
						<Button
							variant="outline"
							onclick={() => canvasEditorRef?.clearCanvas()}
							title="Clear Canvas"
						>
							Clear All
						</Button>
						<Button
							variant="outline"
							onclick={() => (isBackgroundImageModalOpen = true)}
							title="Set Background Image"
						>
							<ImageIcon class="h-4 w-4 mr-2" /> BG Image
						</Button>
						<Button
							variant="outline"
							onclick={() =>
								canvasEditorRef?.showLayerOrderModal()}
							title="Manage Layers"
						>
							<Layers class="h-4 w-4 mr-2" /> Layers
						</Button>
					</div>
				{/if}

				<!-- Direct file upload button -->
				<div class="mb-4">
					<div class="flex flex-col space-y-2">
						<h3 class="text-sm font-medium">
							Upload Image to Library
						</h3>
						<FileUpload
							buttonText="Choose Image"
							accept="image/*"
							on:upload={(event) => {
								const { url } = event.detail;
								toast.success("Image uploaded successfully");
								console.log("Uploaded image URL:", url);

								// Add the image to the canvas
								if (canvasEditorRef && url) {
									// Use the existing addImage method with the URL
									const wf = window as any;
									// Outer check 'if (canvasEditorRef && url)' is sufficient
									const canvas =
										canvasEditorRef.getCanvasInstance();
									if (canvas && wf.fabric) {
										const objectCount =
											canvas.getObjects().length;
										wf.fabric.Image.fromURL(
											url,
											(img: any) => {
												const maxW = canvas.width * 0.8;
												const maxH =
													canvas.height * 0.8;
												if (
													img.width > maxW ||
													img.height > maxH
												) {
													const scale = Math.min(
														maxW / img.width,
														maxH / img.height,
													);
													img.scale(scale);
												}
												// Set a name for the image
												const objectName = `Image ${objectCount + 1}`;
												img.name = objectName;
												// Ensure the name is set using the set method
												img.set("name", objectName);
												canvas.add(img);
												canvas.setActiveObject(img);
												canvas.renderAll();
												// Mark canvas as changed
												canvasHasChanged = true;
											},
											{ crossOrigin: "anonymous" },
										);
									}
								}
							}}
							on:error={(event) => {
								const { message } = event.detail;
								toast.error(`Upload failed: ${message}`);
								console.error("Upload error:", message);
							}}
						/>
						<p class="text-xs text-gray-500 mt-1">
							Upload images to use in your templates
						</p>
					</div>
				</div>

				<!-- Canvas Editor -->
				{#if data.template}
					<!-- Ensure template data is loaded before rendering editor -->
					<!-- Hide built-in controls since we're providing our own -->
					<CanvasEditor
						bind:this={canvasEditorRef}
						onCanvasChange={handleCanvasChange}
						onReady={handleCanvasReady}
						hideControls
					/>
				{:else}
					<p>Loading editor...</p>
					<!-- Placeholder -->
				{/if}
			</div>
			{#if !isCanvasReady}
				<p class="text-sm text-yellow-600 mt-1">
					Waiting for canvas editor to initialize...
				</p>
			{/if}
			<p class="text-sm text-gray-500 mt-1">
				Modify the template content above.
			</p>
		</div>

		<div class="flex justify-end gap-4">
			<Button
				type="button"
				variant="outline"
				href="/settings/canvas-templates"
				disabled={isSaving}
			>
				Cancel
			</Button>
			<Button
				type="submit"
				disabled={isSaving || !name || !isCanvasReady}
			>
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
		onClose={() => (isImageUploadModalOpen = false)}
		onImageSelected={(url: string) => {
			// Explicitly type url
			if (canvasEditorRef && url) {
				// Use the existing addImage method with the URL
				const wf = window as any;
				const canvas = canvasEditorRef.getCanvasInstance();
				if (canvas && wf.fabric) {
					const objectCount = canvas.getObjects().length;
					wf.fabric.Image.fromURL(
						url,
						(img: any) => {
							const maxW = canvas.width * 0.8;
							const maxH = canvas.height * 0.8;
							if (img.width > maxW || img.height > maxH) {
								const scale = Math.min(
									maxW / img.width,
									maxH / img.height,
								);
								img.scale(scale);
							}
							// Set a name for the image
							const objectName = `Image ${objectCount + 1}`;
							img.name = objectName;
							// Ensure the name is set using the set method
							img.set("name", objectName);
							canvas.add(img);
							canvas.setActiveObject(img);
							canvas.renderAll();
							// Mark canvas as changed
							canvasHasChanged = true;
						},
						{ crossOrigin: "anonymous" },
					);
				}
			}
		}}
	/>

	<!-- Background Image Modal -->
	<ImageUploadModal
		open={isBackgroundImageModalOpen}
		onClose={() => (isBackgroundImageModalOpen = false)}
		isForBackground={true}
		{onUnsetBackground}
		{onImageSelected}
	/>
</div>
