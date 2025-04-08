<script lang="ts">
	import { goto } from '$app/navigation'; // Keep only one goto import
	import CampaignForm from '$lib/components/campaigns/CampaignForm.svelte'; // Import shared form
	import type { CampaignPayload } from '$lib/components/campaigns/CampaignForm.svelte'; // Import exported type


	// --- State Management ---
	// State for submission status and errors, managed by this page and passed to the form
	let isSubmitting = $state(false);
	let formErrors = $state<Record<string, any>>({}); // Allow for server errors too

	// --- Form Submission Logic ---
	// This function is passed to the CampaignForm component
	async function handleSubmit(payload: CampaignPayload) { // Apply local type
		isSubmitting = true;
		formErrors = {}; // Clear previous errors

		try {
			const response = await fetch('/api/campaigns', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload) // Send the payload received from the form
			});

			const result = await response.json();

			if (!response.ok) {
				if (response.status === 400 && result.errors) {
					const apiErrors: Record<string, string[]> = result.errors;
					let clientErrors: Record<string, string | undefined> = {};
					for (const key in apiErrors) {
						clientErrors[key] = apiErrors[key].join(', ');
					}
					formErrors = clientErrors;
				} else {
					formErrors = { server: result.message || 'An unknown server error occurred.' };
				}
				return; // Stop processing on error
			}

			// Success! Navigate to the campaigns list page
			await goto('/campaigns');

		} catch (error) {
			console.error('Form submission error:', error);
			formErrors = { server: 'Failed to submit form. Please check your connection.' };
		} finally {
			isSubmitting = false;
		}
	}

	// --- Cancel Handler ---
	function handleCancel() {
		goto('/campaigns');
	}
</script>

<div class="container mx-auto max-w-2xl py-8">
	<h1 class="mb-6 text-2xl font-bold">Create New Campaign</h1>

	<!-- Render the shared form component -->
	<CampaignForm
		onSubmit={handleSubmit}
		onCancel={handleCancel}
		{isSubmitting}
		{formErrors}
		initialData={null}
	/>
</div>
