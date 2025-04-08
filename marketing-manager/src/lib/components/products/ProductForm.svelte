<script lang="ts">
	import Button from '$lib/components/ui/button/Button.svelte';
	// Removed incorrect import of buttonVariants
	import Input from '$lib/components/ui/input/Input.svelte';
	import Label from '$lib/components/ui/label/Label.svelte';
	import Textarea from '$lib/components/ui/textarea/Textarea.svelte';
	// Remove local type definitions, import from types file
	import type { ProductInputData, ProductPayload } from '$lib/types/product.types';
	import { AlertCircle } from 'lucide-svelte'; // Keep AlertCircle for form errors
	import AiGenerationDialog from '$lib/components/shared/AiGenerationDialog.svelte'; // Import the new component


	// --- Props ---
	// Define types for props separately
	type ProductFormProps = {
		// Replace initialData with individual field props
		initialName?: string;
		initialDescription?: string | null;
		initialImageUrl?: string | null;
		initialIndustry?: string | null;
		initialOverview?: string | null;
		initialDetails?: string | null;
		initialFeaturesStrengths?: string | null;
		// Keep other props
		onSubmit?: (payload: ProductPayload) => Promise<void>;
		onCancel: () => void;
		isSubmitting?: boolean;
		formErrors?: Record<string, any>;
	};
	// Use $props() without arguments and apply types during destructuring
	let {
		// Destructure new initial field props
		initialName = '',
		initialDescription = null,
		initialImageUrl = null,
		initialIndustry = null,
		initialOverview = null,
		initialDetails = null,
		initialFeaturesStrengths = null,
		// Destructure other props
		onSubmit, // Keep optional, default handled by usage check
		onCancel,
		isSubmitting = false,
		formErrors = {}
	}: ProductFormProps = $props();


	// --- State Management with Runes ---
	// Initialize state with defaults
	let name = $state('');
	let description = $state('');
	let imageUrl = $state('');
	let industry = $state('');
	let overview = $state('');
	let details = $state('');
	let featuresStrengths = $state('');
	let initialized = $state(false); // Flag to track initialization

	// Use effect to synchronize state with initial props once
	$effect.pre(() => {
		if (!initialized) {
			name = initialName;
			description = initialDescription ?? '';
			imageUrl = initialImageUrl ?? '';
			industry = initialIndustry ?? '';
			overview = initialOverview ?? '';
			details = initialDetails ?? '';
			featuresStrengths = initialFeaturesStrengths ?? '';
			initialized = true; // Mark as initialized
		}
		// This effect depends on initial* props. If the component is keyed,
		// it will re-run with new props when the key changes, resetting initialized.
		// If not keyed, this might need adjustment if props can change mid-lifecycle.
	});


	// Determine if we are in edit mode (based on initialName prop presence)
	const isEditMode = $derived(!!initialName); // Still derive from the prop

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

	// --- AI Dialog State & Handler ---
	let aiDialogOpen = $state(false); // State to control the dialog visibility

	function handleAiGenerated(generatedData: Partial<ProductPayload>) {
		// Update form fields with generated data, handling potential null/undefined
		name = generatedData.name ?? name;
		description = generatedData.description ?? description;
		imageUrl = generatedData.imageUrl ?? imageUrl;
		industry = generatedData.industry ?? industry;
		overview = generatedData.overview ?? overview;
		details = generatedData.details ?? details;
		featuresStrengths = generatedData.featuresStrengths ?? featuresStrengths;
		// aiDialogOpen is automatically set to false by the child component on success
	}

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
		<!-- Explicit Trigger Button -->
		<Button
			variant="secondary"
			type="button"
			onclick={() => aiDialogOpen = true}
			disabled={isSubmitting}
		>
			AI
		</Button>
		<!-- Conditionally render AiGenerationDialog only when open -->
		{#if aiDialogOpen}
			<AiGenerationDialog
				bind:open={aiDialogOpen}
				apiUrl="/api/products/generate"
				currentData={{ name, description, imageUrl, industry, overview, details, featuresStrengths }}
				onGenerated={handleAiGenerated}
				disabled={isSubmitting}
				dialogTitle="Generate Product Details with AI"
				dialogDescription="Enter instructions for the AI to fill out the product form fields. Be specific for better results (e.g., 'Generate details for a SaaS product that helps small businesses manage social media schedules')."
				instructionPlaceholder="e.g., Create a product description for a new brand of eco-friendly coffee beans..."
			/>
		{/if}

		<Button type="button" onclick={onCancel} variant="outline" disabled={isSubmitting}>Cancel</Button>
		<Button type={useClientSubmit ? 'submit' : 'submit'} disabled={isSubmitting}>
			{#if isSubmitting}
				{#if isEditMode}Saving...{:else}Creating...{/if}
			{:else}
				{#if isEditMode}Save Changes{:else}Create Product{/if}
			{/if}
		</Button>
	</div>
</form>
