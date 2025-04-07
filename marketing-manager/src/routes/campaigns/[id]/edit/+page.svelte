<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import { ArrowLeft } from 'lucide-svelte';

	// Define a more specific type for the form prop, including potential errors
	type FormActionData = ActionData & {
		errors?: {
			name?: string;
			goal?: string;
		};
		name?: string; // To repopulate form
		goal?: string; // To repopulate form
	};

	// Get pre-loaded campaign data and potential form action results
	let { campaign, form }: { campaign: PageData['campaign']; form?: FormActionData } = $props();

	// Initialize state with loaded data or form data if validation failed
	let name = $state(form?.name ?? campaign?.name ?? '');
	let goal = $state(form?.goal ?? campaign?.goal ?? '');

	// TODO: Add isSubmitting state based on enhance callback if needed for UI feedback
</script>

<div class="container mx-auto max-w-2xl py-8">
	<div class="mb-6">
		<Button href={`/campaigns/${campaign?.id ?? ''}`} variant="outline">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Campaign Details
		</Button>
	</div>

	<h1 class="mb-6 text-2xl font-bold">Edit Campaign: {campaign?.name ?? '...'}</h1>

	{#if form?.error}
		<div class="mb-4 rounded border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
			{form.error}
		</div>
	{/if}

	<form method="POST" use:enhance>
		<div class="mb-4 grid gap-2">
			<Label for="name">Campaign Name</Label>
			<Input id="name" name="name" bind:value={name} required placeholder="e.g., Summer Sale 2025" />
			{#if form?.errors && form.errors.name}
				<p class="text-sm text-destructive">{form.errors.name}</p>
			{/if}
		</div>

		<div class="mb-6 grid gap-2">
			<Label for="goal">Campaign Goal (Optional)</Label>
			<Textarea id="goal" name="goal" bind:value={goal} placeholder="e.g., Increase brand awareness by 10%" />
			{#if form?.errors && form.errors.goal}
				<p class="text-sm text-destructive">{form.errors.goal}</p>
			{/if}
		</div>

		<div class="flex justify-end gap-2">
			<Button href={`/campaigns/${campaign?.id ?? ''}`} variant="outline">Cancel</Button>
			<Button type="submit">
				Save Changes
			</Button>
		</div>
	</form>
</div>
