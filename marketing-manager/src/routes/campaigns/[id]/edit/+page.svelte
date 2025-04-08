<script lang="ts">
	import { goto } from '$app/navigation';
	import { navigating } from '$app/stores'; // Import navigating store for action state
	import { Button } from '$lib/components/ui/button';
	import CampaignForm from '$lib/components/campaigns/CampaignForm.svelte'; // Import shared form
	import type { CampaignPayload } from '$lib/components/campaigns/CampaignForm.svelte'; // Import payload type
	import { ArrowLeft } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types'; // Import types for form and data

	// --- Props ---
	let { data, form }: { data: PageData; form: ActionData } = $props();

	// --- State ---
	// Submission state derived from SvelteKit's form handling
	let isSubmitting = $derived(!!$navigating); // Simpler check for any navigation triggered by form
	// Errors derived from the 'form' prop passed by SvelteKit
	let formErrors = $derived(form?.errors ?? {});

	// --- Cancel Handler ---
	function handleCancel() {
		// Navigate back to the detail page using the ID from the loaded data
		if (data.campaign?.id) {
			goto(`/campaigns/${data.campaign.id}`);
		} else {
			goto('/campaigns'); // Fallback
		}
	}

	// --- Client-side Submit (Alternative - Keeping for consistency with 'new' page refactor) ---
	// We will use the server action instead, but keep this structure for reference
	// or if we decide against using the action directly from the form component.
	/*
	let clientIsSubmitting = $state(false);
	let clientFormErrors = $state<Record<string, any>>({});

	async function handleClientSubmit(payload: CampaignPayload) {
		if (!data.campaign?.id) return;
		clientIsSubmitting = true;
		clientFormErrors = {};

		try {
			const response = await fetch(`/api/campaigns/${data.campaign.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const result = await response.json();

			if (!response.ok) {
				if (response.status === 400 && result.errors) {
					clientFormErrors = result.errors;
				} else {
					clientFormErrors = { server: result.message || 'Update failed.' };
				}
				return;
			}
			await goto(`/campaigns/${data.campaign.id}`);
		} catch (e) {
			console.error('Client submit error:', e);
			clientFormErrors = { server: 'Failed to submit form.' };
		} finally {
			clientIsSubmitting = false;
		}
	}
	*/

	// --- Form Submission using SvelteKit Action ---
	// The CampaignForm component needs to be adapted slightly or we handle it here.
	// For now, we assume CampaignForm's internal form tag uses method="POST"
	// and does NOT preventDefault, allowing the SvelteKit action to handle it.
	// We pass the errors and submission state from SvelteKit's mechanisms.

</script>

<div class="container mx-auto max-w-2xl py-8">
	<div class="mb-6">
		<Button
			href={`/campaigns/${data.campaign?.id ?? ''}`}
			variant="outline"
			aria-disabled={!data.campaign?.id}
			class={!data.campaign?.id ? 'pointer-events-none opacity-50' : ''}
		>
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Campaign
		</Button>
	</div>

	<h1 class="mb-6 text-2xl font-bold">Edit Campaign {data.campaign?.name ? `"${data.campaign.name}"` : ''}</h1>

	{#if data.campaign}
		<!--
			NOTE: To use the SvelteKit form action defined in +page.server.ts,
			the CampaignForm component's internal <form> tag should use method="POST"
			and NOT prevent default submission. The component also needs to accept
			isSubmitting and formErrors props derived from $navigating and the 'form' prop.
			We are passing the necessary props here.
		-->
		<form method="POST" action="?/default"> <!-- Use SvelteKit form action -->
			<CampaignForm
				initialData={data.campaign}
				onCancel={handleCancel}
				isSubmitting={isSubmitting}
				formErrors={formErrors}
			/>
		</form>
	{:else}
		<!-- Handle case where campaign data failed to load (error handled by SvelteKit's error page) -->
		<p class="text-center text-red-600">Could not load campaign data.</p>
	{/if}
</div>
