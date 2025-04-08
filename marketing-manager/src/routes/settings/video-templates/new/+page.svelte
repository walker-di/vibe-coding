<script lang="ts">
	import { goto } from '$app/navigation';
	import VideoTemplateForm from '$lib/components/settings/VideoTemplateForm.svelte'; // Import shared form
	import type { VideoTemplatePayload } from '$lib/components/settings/VideoTemplateForm.svelte'; // Import payload type

	// State managed by the page
	let isSubmitting = $state(false);
	let formErrors = $state<Record<string, any>>({});

	// Submission logic passed to the form
	async function handleSubmit(payload: VideoTemplatePayload) {
		isSubmitting = true;
		formErrors = {}; // Clear previous errors

		// Note: The payload received from VideoTemplateForm already has
		// recommendedPlatforms parsed into an array or null.

		try {
			const response = await fetch('/api/video-templates', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			const result = await response.json();

			if (!response.ok) {
				if (response.status === 400 && result.errors) {
					// Handle potential validation errors from API, including JSON parsing errors
					// if the API re-validates the recommendedPlatforms field.
					formErrors = result.errors;
				} else {
					formErrors = { server: result.message || 'An unknown server error occurred.' };
				}
				console.error("Form Errors:", formErrors);
				return; // Stop on error
			}

			await goto('/settings/video-templates'); // Redirect on success

		} catch (e: any) {
			console.error('Video Template submission error:', e);
			formErrors = { server: 'Failed to submit form. Please check your connection.' };
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		goto('/settings/video-templates');
	}
</script>

<div class="container mx-auto max-w-2xl py-8">
	<h1 class="mb-6 text-2xl font-bold">Create New Video Template</h1>

	<VideoTemplateForm
		onSubmit={handleSubmit}
		onCancel={handleCancel}
		{isSubmitting}
		{formErrors}
		initialData={null}
	/>
</div>
