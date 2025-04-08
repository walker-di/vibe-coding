<script lang="ts">
	import { page } from '$app/stores'; // Keep one import
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import VideoTemplateForm from '$lib/components/settings/VideoTemplateForm.svelte'; // Import shared form
	import type { VideoTemplatePayload, VideoTemplateInputData } from '$lib/types/videoTemplate.types'; // Import types from types file
	import { AlertCircle, ArrowLeft } from 'lucide-svelte';

	// State
	let templateId = $derived($page.params.id);
	let initialFormData = $state<VideoTemplateInputData | null>(null); // Store fetched data for the form
	let templateName = $state<string>(''); // Store name for display

	let isLoading = $state<boolean>(true);
	let loadError = $state<string | null>(null);
	let isSubmitting = $state<boolean>(false);
	let formErrors = $state<Record<string, any>>({});

	// Fetch existing template data
	$effect(() => {
		async function loadTemplateData() {
			if (!templateId) {
				loadError = 'Template ID missing from URL.';
				isLoading = false;
				return;
			}
			isLoading = true;
			loadError = null;
			initialFormData = null; // Reset form data
			templateName = '';

			try {
				const response = await fetch(`/api/video-templates/${templateId}`);
				if (!response.ok) {
					if (response.status === 404) {
						throw new Error('Video Template not found.');
					}
					throw new Error(`Failed to load template data: ${response.statusText}`);
				}
				// Type assertion needed as API returns full model, but form expects array for platforms
				const templateData: VideoTemplateInputData & { name?: string | null } = await response.json();
				initialFormData = templateData; // Set data for the form
				templateName = templateData.name ?? ''; // Store name

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
	async function handleSubmit(payload: VideoTemplatePayload) {
		if (!templateId) return;

		isSubmitting = true;
		formErrors = {};
		loadError = null; // Clear load error on submit attempt

		// Note: Payload from VideoTemplateForm already has platforms parsed
		// and numeric fields converted

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
				return; // Stop on error
			}

			await goto('/settings/video-templates'); // Redirect back to the list on success

		} catch (e: any) {
			console.error('Video Template update error:', e);
			formErrors = { server: 'Failed to submit update. Please check your connection.' };
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		goto('/settings/video-templates');
	}
</script>

<div class="container mx-auto max-w-2xl py-8">
	<div class="mb-6">
		<Button href="/settings/video-templates" variant="outline">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Video Templates
		</Button>
	</div>

	<h1 class="mb-6 text-2xl font-bold">Edit Video Template {templateName ? `"${templateName}"` : `(ID: ${templateId})`}</h1>

	{#if isLoading}
		<p class="text-center">Loading template data...</p>
	{:else if loadError}
		<div class="mb-4 flex items-center rounded border border-red-500 bg-red-50 p-3 text-sm text-red-700">
			<AlertCircle class="mr-2 h-4 w-4 flex-shrink-0" />
			<span>{loadError}</span>
		</div>
	{:else if initialFormData}
		<VideoTemplateForm
			initialData={initialFormData}
			onSubmit={handleSubmit}
			onCancel={handleCancel}
			{isSubmitting}
			{formErrors}
		/>
	{:else}
		<!-- Should not happen if loading is done and no error, but handle anyway -->
		<p class="text-center text-red-600">Could not load video template data.</p>
	{/if}
</div>
