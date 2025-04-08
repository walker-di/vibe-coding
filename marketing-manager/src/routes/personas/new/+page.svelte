<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	// State for the form input
	let personaName = $state('');
	// Reactive state for loading indicator during form submission
	let submitting = $state(false);
	// State for holding potential errors from the API
	let formErrors = $state<{ name?: string; server?: string }>({});

	async function handleSubmit() {
		submitting = true;
		formErrors = {}; // Clear previous errors

		try {
			const response = await fetch('/api/personas', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ name: personaName })
			});

			const result = await response.json();

			if (!response.ok) {
				// Handle validation errors (400) or server errors (500)
				if (response.status === 400 && result.errors) {
					formErrors = result.errors; // API returns field-specific errors
				} else {
					formErrors = { server: result.message || 'An unknown error occurred.' };
				}
				return; // Stop processing on error
			}

			// Success! Navigate to the new persona's detail page (assuming API returns ID)
			if (result.id) {
				await goto(`/personas/${result.id}`);
			} else {
				// Fallback if ID isn't returned (though it should be)
				await goto('/personas');
			}

		} catch (error) {
			console.error('Form submission error:', error);
			formErrors = { server: 'Failed to submit form. Please check your connection.' };
		} finally {
			submitting = false;
		}
	}
</script>

<div class="container mx-auto max-w-2xl py-8">
	<h1 class="mb-6 text-2xl font-bold">Create New Persona</h1>

	<form onsubmit={handleSubmit} class="space-y-4">
		<div>
			<Label for="name">Persona Name</Label>
			<Input
				id="name"
				name="name"
				type="text"
				required
				maxlength={100}
				bind:value={personaName}
				aria-invalid={!!formErrors.name}
				aria-describedby={formErrors.name ? 'name-error' : undefined}
				disabled={submitting}
			/>
			{#if formErrors.name}
				<p id="name-error" class="mt-1 text-sm text-red-600">{formErrors.name}</p>
			{/if}
		</div>

		{#if formErrors.server}
			<p class="mt-1 text-sm text-red-600">{formErrors.server}</p>
		{/if}

		<div class="flex justify-end">
			<Button type="submit" disabled={submitting}>
				{#if submitting}
					Creating...
					<!-- TODO: Add spinner icon -->
				{:else}
					Create Persona
				{/if}
			</Button>
		</div>
	</form>
</div>
