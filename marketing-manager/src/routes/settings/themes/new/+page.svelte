<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { AlertCircle } from 'lucide-svelte';

	let title = $state('');
	let description = $state('');
	let associatedPainPoint = $state('');

	let isSubmitting = $state(false);
	let formErrors = $state<Record<string, any>>({});

	async function handleSubmit() {
		isSubmitting = true;
		formErrors = {};

		const payload = {
			title: title,
			description: description || null,
			associatedPainPoint: associatedPainPoint || null
		};

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
				return;
			}

			await goto('/settings/themes');

		} catch (e: any) {
			console.error('Theme submission error:', e);
			formErrors = { server: 'Failed to submit form. Please check your connection or review server logs.' };
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="container mx-auto max-w-2xl py-8">
	<h1 class="mb-6 text-2xl font-bold">Create New Theme</h1>

	{#if formErrors.server}
		<div class="mb-4 flex items-center rounded border border-red-500 bg-red-50 p-3 text-sm text-red-700">
			<AlertCircle class="mr-2 h-4 w-4 flex-shrink-0" />
			<span>{formErrors.server}</span>
		</div>
	{/if}

	<form onsubmit={handleSubmit} class="space-y-6">
		<div>
			<Label for="title" class={formErrors.title ? 'text-red-600' : ''}>Title *</Label>
			<Input id="title" name="title" type="text" required maxlength={150} bind:value={title} disabled={isSubmitting} class={formErrors.title ? 'border-red-500' : ''} placeholder="e.g., Overcoming Time Constraints" />
			{#if formErrors.title}<p class="mt-1 text-sm text-red-600">{formErrors.title}</p>{/if}
		</div>
		<div>
			<Label for="description" class={formErrors.description ? 'text-red-600' : ''}>Description (Optional)</Label>
			<Textarea id="description" name="description" rows={4} bind:value={description} disabled={isSubmitting} class={formErrors.description ? 'border-red-500' : ''} placeholder="Describe the core idea or angle of this theme..." />
			{#if formErrors.description}<p class="mt-1 text-sm text-red-600">{formErrors.description}</p>{/if}
		</div>
		<div>
			<Label for="associatedPainPoint" class={formErrors.associatedPainPoint ? 'text-red-600' : ''}>Associated Pain Point (Optional)</Label>
			<Input id="associatedPainPoint" name="associatedPainPoint" type="text" maxlength={200} bind:value={associatedPainPoint} disabled={isSubmitting} class={formErrors.associatedPainPoint ? 'border-red-500' : ''} placeholder="e.g., Not enough hours in the day" />
			{#if formErrors.associatedPainPoint}<p class="mt-1 text-sm text-red-600">{formErrors.associatedPainPoint}</p>{/if}
		</div>

		<!-- Actions -->
		<div class="flex justify-end gap-2 pt-4">
			<Button href="/settings/themes" variant="outline">Cancel</Button>
			<Button type="submit" disabled={isSubmitting}>
				{#if isSubmitting}
					Creating...
					<!-- TODO: Add spinner icon -->
				{:else}
					Create Theme
				{/if}
			</Button>
		</div>
	</form>
</div>
