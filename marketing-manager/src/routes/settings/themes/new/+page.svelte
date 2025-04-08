<script lang="ts">
	import { goto } from '$app/navigation';
	import ThemeForm from '$lib/components/settings/ThemeForm.svelte'; // Import shared form
	import type { ThemePayload } from '$lib/types/theme.types'; // Import payload type from types file

	// State managed by the page
	let isSubmitting = $state(false);
	let formErrors = $state<Record<string, any>>({});

	// Submission logic passed to the form
	async function handleSubmit(payload: ThemePayload) {
		isSubmitting = true;
		formErrors = {};

		try {
			const response = await fetch('/api/themes', {
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
				console.error("Form Errors:", formErrors);
				return; // Stop on error
			}

			await goto('/settings/themes'); // Redirect on success

		} catch (e: any) {
			console.error('Theme submission error:', e);
			formErrors = { server: 'Failed to submit form. Please check your connection.' };
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		goto('/settings/themes');
	}
</script>

<div class="container mx-auto max-w-2xl py-8">
	<h1 class="mb-6 text-2xl font-bold">Create New Theme</h1>

	<ThemeForm
		onSubmit={handleSubmit}
		onCancel={handleCancel}
		{isSubmitting}
		{formErrors}
		initialData={null}
	/>
</div>
