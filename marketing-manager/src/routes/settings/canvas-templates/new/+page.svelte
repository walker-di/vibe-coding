<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Textarea } from "$lib/components/ui/textarea";
	import * as Select from "$lib/components/ui/select/index.js"; // Correct import path
	import CanvasEditor from "$lib/components/story/CanvasEditor.svelte";
	import { goto } from "$app/navigation";
	import { toast } from "svelte-sonner";
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

	let name = $state("");
	let description = $state("");
	let aspectRatio = $state<CanvasAspectRatio>("16:9"); // Default aspect ratio
	let resolutionSelection = $state<CommonResolution | "">(""); // For preset selection
	let customResolution = $state(""); // For custom input
	let canvasDataJson = $state<string | null>(null);
	let isSaving = $state(false);
	let canvasEditorRef: CanvasEditor | null = $state(null); // To call methods on the editor
	let isCanvasReady = $state(false); // Track if canvas editor is initialized

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
	const compatibleResolutions = $derived(
		getCompatibleResolutions(aspectRatio),
	);

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
	const finalResolution = $derived(
		resolutionSelection === "Custom"
			? customResolution.trim()
			: resolutionSelection,
	);

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

	function handleCanvasChange(json: string) {
		canvasDataJson = json;
		// console.log('New canvas data received in parent:', json.substring(0, 50) + '...');
	}

	async function saveTemplate() {
		if (!name.trim()) {
			toast.error("Template name is required.");
			return;
		}

		let currentCanvasJson = canvasDataJson;

		isSaving = true;
		let createdTemplateId: number | null = null; // To store the ID for preview upload

		try {
			// --- Step 1: Create the template record ---
			const createResponse = await fetch("/api/canvas-templates", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: name.trim(),
					description: description.trim() || null,
					aspectRatio: aspectRatio, // Added
					resolution: finalResolution || null, // Added (use derived value, allow null)
					canvasData: currentCanvasJson, // Use the potentially fetched value
					previewImageUrl: null, // Send null initially
				}),
			});

			if (!createResponse.ok) {
				const errorData = await createResponse
					.json()
					.catch(() => ({ message: createResponse.statusText }));
				throw new Error(
					errorData.message ||
						`Failed to save template: ${createResponse.statusText}`,
				);
			}

			const createdTemplate = await createResponse.json();
			createdTemplateId = createdTemplate.id; // Store the new ID

			// --- Step 2 & 3: Generate, Upload, and Update Preview Image ---
			let previewFailed = false; // Flag to track preview failure status
			if (canvasEditorRef && createdTemplateId) {
				canvasEditorRef
					.getCanvasImageDataUrl()
					.then(async (imageDataUrl) => {
						const uploadedUrl = await uploadTemplatePreview(
							imageDataUrl,
							createdTemplateId as number,
						);
						if (!uploadedUrl) return;

						await updateTemplateRecordWithPreview(
							createdTemplateId as number,
							uploadedUrl,
						);
					});
			} else {
				previewFailed = true; // Mark preview as failed
				console.warn(
					"Canvas editor ref or template ID missing, skipping preview generation.",
				);
				// No toast here, as the template creation itself succeeded.
			}

			// Show final message based on overall success and preview status
			if (!previewFailed) {
				toast.success(
					`Template "${createdTemplate.name}" created successfully with preview!`,
				);
			} else {
				toast.warning(
					`Template "${createdTemplate.name}" created, but preview generation/saving failed.`,
				);
			}
			goto("/settings/canvas-templates"); // Redirect regardless of preview status
		} catch (err: any) {
			// Catch errors ONLY from Step 1 (template creation)
			console.error("Error creating template record:", err);
			toast.error(`Failed to create template: ${err.message}`);
		} finally {
			isSaving = false;
		}
	}

	// Helper function to upload preview image
	async function uploadTemplatePreview(
		dataUrl: string,
		templateId: number,
	): Promise<string | null> {
		const response = await fetch("/api/upload/template-preview", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				imageData: dataUrl,
				templateId: templateId,
			}),
		});
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(
				errorData.message ||
					`Upload failed with status ${response.status}`,
			);
		}
		const result = await response.json();
		return result.imageUrl;
	}

	// Helper function to update template record with preview URL
	async function updateTemplateRecordWithPreview(
		templateId: number,
		imageUrl: string,
	): Promise<void> {
		try {
			const response = await fetch(
				`/api/canvas-templates/${templateId}`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ previewImageUrl: imageUrl }), // Only send the preview URL
				},
			);
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					errorData.message ||
						`Updating template with preview URL failed with status ${response.status}`,
				);
			}
			console.log(
				`Template ${templateId} updated with preview URL: ${imageUrl}`,
			);
		} catch (error: any) {
			console.error("Error updating template with preview URL:", error);
			// toast.error(`Preview Update Error: ${error.message}`); // Maybe too noisy? Logged already.
			throw error; // Re-throw to be caught in saveTemplate
		}
	}
</script>

<svelte:head>
	<title>New Canvas Template</title>
</svelte:head>

<div class="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
	<h1 class="text-2xl font-bold mb-6">Create New Canvas Template</h1>

	<form onsubmit={saveTemplate} class="space-y-6">
		<div>
			<Label for="template-name">Template Name</Label>
			<Input
				id="template-name"
				bind:value={name}
				required
				placeholder="e.g., Product Intro Blue"
			/>
		</div>

		<div>
			<Label for="template-description">Description (Optional)</Label>
			<Textarea
				id="template-description"
				bind:value={description}
				placeholder="Describe the purpose or style of this template"
			/>
		</div>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<div>
				<Label for="aspect-ratio">Aspect Ratio</Label>
				<Select.Root bind:value={aspectRatio} type="single">
					<Select.Trigger class="w-full" id="aspect-ratio">
						{aspectRatio || "Select aspect ratio..."}
					</Select.Trigger>
					<Select.Content>
						{#each canvasAspectRatios as ratio (ratio)}
							<Select.Item value={ratio} label={ratio}
								>{ratio}</Select.Item
							>
						{/each}
					</Select.Content>
				</Select.Root>
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
				{#if canvasEditorRef}
					<div class="flex flex-wrap gap-2 mb-4">
						<Button
							variant="outline"
							onclick={() => canvasEditorRef?.addImage()}
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
					</div>
				{/if}

				<!-- Canvas Editor -->
				<CanvasEditor
					bind:this={canvasEditorRef}
					onCanvasChange={handleCanvasChange}
					hideControls
				/>
			</div>
			{#if !isCanvasReady}
				<p class="text-sm text-yellow-600 mt-1">
					Waiting for canvas editor to initialize...
				</p>
			{/if}
			<p class="text-sm text-gray-500 mt-1">
				Design the template content above.
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
					Save Template
				{/if}
			</Button>
		</div>
	</form>
</div>
