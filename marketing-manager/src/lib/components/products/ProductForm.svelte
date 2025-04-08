<script lang="ts">
	import Button from '$lib/components/ui/button/Button.svelte';
	import Input from '$lib/components/ui/input/Input.svelte';
	import Label from '$lib/components/ui/label/Label.svelte';
	import Textarea from '$lib/components/ui/textarea/Textarea.svelte';
	// Remove local type definitions, import from types file
	import type { ProductInputData, ProductPayload } from '$lib/types/product.types';
	import { AlertCircle } from 'lucide-svelte';


	// --- Props ---
	// Define types for props separately
	type ProductFormProps = {
		initialData?: ProductInputData | null;
		onSubmit?: (payload: ProductPayload) => Promise<void>;
		onCancel: () => void;
		isSubmitting?: boolean;
		formErrors?: Record<string, any>;
	};
	// Use $props() without arguments and apply types during destructuring
	let {
		initialData = null,
		onSubmit, // Keep optional, default handled by usage check
		onCancel,
		isSubmitting = false,
		formErrors = {}
	}: ProductFormProps = $props();


	// --- State Management with Runes ---
	// Initialize state from initialData if provided
	let name = $state(initialData?.name ?? '');
	let description = $state(initialData?.description ?? '');
	let imageUrl = $state(initialData?.imageUrl ?? '');
	let industry = $state(initialData?.industry ?? '');
	let overview = $state(initialData?.overview ?? '');
	let details = $state(initialData?.details ?? '');
	let featuresStrengths = $state(initialData?.featuresStrengths ?? '');

	// Determine if we are in edit mode
	const isEditMode = $derived(!!initialData?.name); // Or check initialData directly

	// --- Form Submission Logic (for client-side handling if onSubmit is provided) ---
	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault(); // Prevent default if handled client-side

		// Prepare data payload
		const payload: ProductPayload = {
			name: name,
			description: description || null,
			imageUrl: imageUrl || null,
			industry: industry || null,
			overview: overview || null,
			details: details || null,
			featuresStrengths: featuresStrengths || null
		};

		// Call the onSubmit prop only if it was actually provided
		if (onSubmit) {
			await onSubmit(payload);
		} else {
			// This case should ideally not happen if useClientSubmit logic is correct,
			// but adding a warning might be helpful during development.
			console.warn('handleSubmit called in ProductForm, but onSubmit prop was not provided.');
		}
	}

	// Determine if the form should use client-side submission or rely on a parent <form> action
	const useClientSubmit = $derived(!!onSubmit); // Check if onSubmit prop was provided

</script>

{#if formErrors?.server}
	<div class="mb-4 flex items-center rounded border border-red-500 bg-red-50 p-3 text-sm text-red-700">
		<AlertCircle class="mr-2 h-4 w-4 flex-shrink-0" />
		<span>{formErrors.server}</span>
	</div>
{/if}

<!--
	Conditionally add onsubmit handler only if the onSubmit prop was provided.
	Otherwise, assume submission is handled by a parent <form method="POST">.
-->
<form onsubmit={useClientSubmit ? handleSubmit : undefined} class="space-y-4">
	<div>
		<Label for="name" class={formErrors?.name ? 'text-red-600' : ''}>Product Name <span class="text-red-500">*</span></Label>
		<Input id="name" name="name" type="text" bind:value={name} required disabled={isSubmitting} class={formErrors?.name ? 'border-red-500' : ''} />
		{#if formErrors?.name}<p class="mt-1 text-sm text-red-600">{formErrors.name}</p>{/if}
	</div>

	<div>
		<Label for="overview" class={formErrors?.overview ? 'text-red-600' : ''}>Overview</Label>
		<Textarea id="overview" name="overview" bind:value={overview} placeholder="A brief summary of the product." disabled={isSubmitting} class={formErrors?.overview ? 'border-red-500' : ''} />
		{#if formErrors?.overview}<p class="mt-1 text-sm text-red-600">{formErrors.overview}</p>{/if}
	</div>

	<div>
		<Label for="industry" class={formErrors?.industry ? 'text-red-600' : ''}>Industry</Label>
		<Input id="industry" name="industry" type="text" bind:value={industry} placeholder="e.g., Business Video Media" disabled={isSubmitting} class={formErrors?.industry ? 'border-red-500' : ''} />
		{#if formErrors?.industry}<p class="mt-1 text-sm text-red-600">{formErrors.industry}</p>{/if}
	</div>

	<div>
		<Label for="details" class={formErrors?.details ? 'text-red-600' : ''}>Detailed Description</Label>
		<Textarea id="details" name="details" bind:value={details} rows={5} placeholder="More in-depth information about the product." disabled={isSubmitting} class={formErrors?.details ? 'border-red-500' : ''} />
		{#if formErrors?.details}<p class="mt-1 text-sm text-red-600">{formErrors.details}</p>{/if}
	</div>

	<div>
		<Label for="featuresStrengths" class={formErrors?.featuresStrengths ? 'text-red-600' : ''}>Features / Strengths</Label>
		<Textarea id="featuresStrengths" name="featuresStrengths" bind:value={featuresStrengths} rows={5} placeholder="List key features or strengths, one per line." disabled={isSubmitting} class={formErrors?.featuresStrengths ? 'border-red-500' : ''} />
		{#if formErrors?.featuresStrengths}<p class="mt-1 text-sm text-red-600">{formErrors.featuresStrengths}</p>{/if}
	</div>

	<div>
		<Label for="description" class={formErrors?.description ? 'text-red-600' : ''}>Internal Description (Optional)</Label>
		<Textarea id="description" name="description" bind:value={description} placeholder="Internal notes or description." disabled={isSubmitting} class={formErrors?.description ? 'border-red-500' : ''} />
		{#if formErrors?.description}<p class="mt-1 text-sm text-red-600">{formErrors.description}</p>{/if}
	</div>

	<div>
		<Label for="imageUrl" class={formErrors?.imageUrl ? 'text-red-600' : ''}>Image URL (Optional)</Label>
		<Input id="imageUrl" name="imageUrl" type="url" bind:value={imageUrl} placeholder="https://example.com/image.png" disabled={isSubmitting} class={formErrors?.imageUrl ? 'border-red-500' : ''} />
		{#if formErrors?.imageUrl}<p class="mt-1 text-sm text-red-600">{formErrors.imageUrl}</p>{/if}
	</div>

	<!-- Actions: Use type="button" for Cancel to prevent form submission -->
	<div class="flex justify-end gap-2 pt-4">
		<Button type="button" onclick={onCancel} variant="outline" disabled={isSubmitting}>Cancel</Button>
		<!-- Submit button type depends on whether parent form handles submission -->
		<Button type={useClientSubmit ? 'submit' : 'submit'} disabled={isSubmitting}>
			{#if isSubmitting}
				{#if isEditMode}Saving...{:else}Creating...{/if}
			{:else}
				{#if isEditMode}Save Changes{:else}Create Product{/if}
			{/if}
		</Button>
	</div>
</form>
