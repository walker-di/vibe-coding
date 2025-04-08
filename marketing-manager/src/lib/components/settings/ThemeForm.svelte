<script lang="ts">
	import Button from '$lib/components/ui/button/Button.svelte';
	import Input from '$lib/components/ui/input/Input.svelte';
	import Label from '$lib/components/ui/label/Label.svelte';
	import Textarea from '$lib/components/ui/textarea/Textarea.svelte';
	import type { themes } from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm'; // Keep this if needed elsewhere in script
	import { AlertCircle } from 'lucide-svelte';
	// Import types from the dedicated file
	import type { ThemeInputData, ThemePayload } from '$lib/types/theme.types';


	// --- Props ---
	type ThemeFormProps = {
		initialData?: ThemeInputData | null;
		onSubmit?: (payload: ThemePayload) => Promise<void>; // Optional for client-side handling
		onCancel: () => void;
		isSubmitting?: boolean;
		formErrors?: Record<string, any>;
	};
	let {
		initialData = null,
		onSubmit,
		onCancel,
		isSubmitting = false,
		formErrors = {}
	}: ThemeFormProps = $props();

	// --- State Management ---
	let title = $state(initialData?.title ?? '');
	let description = $state(initialData?.description ?? '');
	let associatedPainPoint = $state(initialData?.associatedPainPoint ?? '');

	// Determine edit mode
	const isEditMode = $derived(!!initialData?.title);

	// --- Form Submission Logic (Client-side) ---
	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		const payload: ThemePayload = {
			title: title,
			description: description || null,
			associatedPainPoint: associatedPainPoint || null
		};
		if (onSubmit) {
			await onSubmit(payload);
		} else {
			console.warn('handleSubmit called in ThemeForm, but onSubmit prop was not provided.');
		}
	}

	const useClientSubmit = $derived(!!onSubmit);

</script>

{#if formErrors?.server}
	<div class="mb-4 flex items-center rounded border border-red-500 bg-red-50 p-3 text-sm text-red-700">
		<AlertCircle class="mr-2 h-4 w-4 flex-shrink-0" />
		<span>{formErrors.server}</span>
	</div>
{/if}

<form onsubmit={useClientSubmit ? handleSubmit : undefined} class="space-y-6">
	<div>
		<Label for="title" class={formErrors?.title ? 'text-red-600' : ''}>Title *</Label>
		<Input id="title" name="title" type="text" required maxlength={150} bind:value={title} disabled={isSubmitting} class={formErrors?.title ? 'border-red-500' : ''} placeholder="e.g., Overcoming Time Constraints" />
		{#if formErrors?.title}<p class="mt-1 text-sm text-red-600">{formErrors.title}</p>{/if}
	</div>
	<div>
		<Label for="description" class={formErrors?.description ? 'text-red-600' : ''}>Description (Optional)</Label>
		<Textarea id="description" name="description" rows={4} bind:value={description} disabled={isSubmitting} class={formErrors?.description ? 'border-red-500' : ''} placeholder="Describe the core idea or angle of this theme..." />
		{#if formErrors?.description}<p class="mt-1 text-sm text-red-600">{formErrors.description}</p>{/if}
	</div>
	<div>
		<Label for="associatedPainPoint" class={formErrors?.associatedPainPoint ? 'text-red-600' : ''}>Associated Pain Point (Optional)</Label>
		<Input id="associatedPainPoint" name="associatedPainPoint" type="text" maxlength={200} bind:value={associatedPainPoint} disabled={isSubmitting} class={formErrors?.associatedPainPoint ? 'border-red-500' : ''} placeholder="e.g., Not enough hours in the day" />
		{#if formErrors?.associatedPainPoint}<p class="mt-1 text-sm text-red-600">{formErrors.associatedPainPoint}</p>{/if}
	</div>

	<!-- Actions -->
	<div class="flex justify-end gap-2 pt-4">
		<Button type="button" onclick={onCancel} variant="outline" disabled={isSubmitting}>Cancel</Button>
		<Button type="submit" disabled={isSubmitting}>
			{#if isSubmitting}
				{#if isEditMode}Saving...{:else}Creating...{/if}
			{:else}
				{#if isEditMode}Save Changes{:else}Create Theme{/if}
			{/if}
		</Button>
	</div>
</form>
