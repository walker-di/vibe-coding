<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Textarea } from "$lib/components/ui/textarea";
	import * as Select from "$lib/components/ui/select/index.js"; // Import Select
	import CanvasEditor from "$lib/components/story/CanvasEditor.svelte";
	import ImageUploadModal from "$lib/components/story/ImageUploadModal.svelte";
	import { goto } from "$app/navigation";
	import { toast } from "svelte-sonner";
	import type { PageData } from "./$types"; // Import PageData type
	import { canvasAspectRatios, commonResolutions } from "$lib/constants"; // Import constants
	import type { CanvasAspectRatio, CommonResolution } from "$lib/constants"; // Import types
	import { FabricImage } from "fabric";

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
	);
	let resolutionSelection = $state<CommonResolution | "">(
		getInitialResolutionSelection(data.template.resolution),
	);
	// Initialize custom resolution value
	let customResolution = $state(
		data.template.resolution &&
			getInitialResolutionSelection(data.template.resolution) === "Custom"
			? data.template.resolution
			: "",
	);
	let canvasDataJson = $state(data.template.canvasData);
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

	async function onImageSelected(url: string) {
		if (!canvasEditorRef || !url) return;
		const canvas = canvasEditorRef.getCanvasInstance();
		if (!canvas) return;
		const img = await FabricImage.fromURL(url, {
			crossOrigin: "anonymous",
		});
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

		canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
		// Mark canvas as changed
		canvasHasChanged = true;
		// Get the updated canvas JSON and update the state
		canvasDataJson = canvasEditorRef!.getCurrentCanvasJson();
		toast.success("Background image set");
	}
	function handleCanvasChange(json: string) {
		if (isCanvasReady) {
			canvasHasChanged = true;
		}
		canvasDataJson = json;
	}

	async function updateTemplate() {
		if (!canvasEditorRef) return;
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
		canvasDataJson = canvasEditorRef!.getCurrentCanvasJson();
		console.log("Current canvas JSON:", canvasDataJson);

		try {
			// --- Step 1: Check if canvas changed and generate/upload new preview ---
			console.log("=== TEMPLATE SAVE DEBUG START ===");
			console.log("Canvas has changed:", canvasHasChanged);
			console.log("Canvas editor ref exists:", !!canvasEditorRef);

			// Force canvasHasChanged to true to always generate a new preview
			// This is a temporary fix to ensure we're testing the export resolution
			canvasHasChanged = true;
			const imageDataUrl = await canvasEditorRef.getCanvasImageDataUrl();

			finalPreviewUrl = await uploadTemplatePreview(
				imageDataUrl,
				data.template.id,
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
		if (canvasEditorRef && finalResolution) {
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
				canvasEditorRef.resizeCanvas(width, height);
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
		// Create an Image object to check the dimensions of the data URL
		const img = new Image();
		img.src = dataUrl;

		// Wait for the image to load to get its dimensions
		await new Promise<void>((resolve) => {
			img.onload = () => {
				console.log(
					"Image dimensions from data URL:",
					img.naturalWidth,
					"x",
					img.naturalHeight,
				);
				resolve();
			};
			img.onerror = () => {
				console.error("Failed to load image from data URL");
				resolve();
			};
		});

		try {
			console.log("Sending POST request to /api/upload/template-preview");
			const response = await fetch("/api/upload/template-preview", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					imageData: dataUrl,
					templateId: templateId,
				}),
			});
			console.log("Response status:", response.status);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				console.error("Response error:", errorData);
				throw new Error(
					errorData.message ||
						`Upload failed with status ${response.status}`,
				);
			}
			const result = await response.json();
			console.log("Response result:", result);
			console.log("=== UPLOAD TEMPLATE PREVIEW DEBUG END ===");
			return result.imageUrl;
		} catch (error: any) {
			console.error("Error uploading template preview:", error);
			console.log("=== UPLOAD TEMPLATE PREVIEW DEBUG END (ERROR) ===");
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
							<Select.Item value={res} label={res}>
								{res}
							</Select.Item>
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

		<div class="flex justify-end gap-4">
			<Button
				type="button"
				variant="outline"
				href="/settings/canvas-templates"
				disabled={isSaving}
			>
				Cancel
			</Button>
			<Button type="submit" disabled={isSaving || !name}>
				{#if isSaving}
					Saving...
				{:else}
					Update Template
				{/if}
			</Button>
		</div>
	</form>
	<div class="border rounded-md p-4 mt-2">
		<!-- Canvas Editor -->
		{#if data.template}
			<CanvasEditor
				bind:this={canvasEditorRef}
				onCanvasChange={handleCanvasChange}
				bind:canvasDataJson
				hideControls
			/>
		{:else}
			<p>Loading editor...</p>
		{/if}
	</div>

	<!-- Background Image Modal -->
	<ImageUploadModal
		open={isBackgroundImageModalOpen}
		onClose={() => (isBackgroundImageModalOpen = false)}
		isForBackground={true}
		{onUnsetBackground}
		{onImageSelected}
	/>
</div>
