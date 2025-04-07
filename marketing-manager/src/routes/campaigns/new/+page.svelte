<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input'; // Assuming placeholder Input exists or will be created
	import { Label } from '$lib/components/ui/label'; // Assuming placeholder Label exists or will be created
	import { Textarea } from '$lib/components/ui/textarea'; // Assuming placeholder Textarea exists or will be created
	import type { ActionData } from './$types';
	import { enhance } from '$app/forms'; // For progressive enhancement

	let { form }: { form?: ActionData } = $props(); // Use $props() for form action data

	let name = $state('');
	let goal = $state('');
	// let isSubmitting = $state(false); // enhance handles submission state

	// function handleSubmit() { // Not needed with basic enhance usage
	// 	isSubmitting = true;
	// }
</script>

<div class="container mx-auto max-w-2xl py-8">
	<h1 class="mb-6 text-2xl font-bold">Create New Campaign</h1>

	{#if form?.error}
		<div class="mb-4 rounded border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
			{form.error}
		</div>
	{/if}

	<!-- Removed on:submit={handleSubmit} -->
	<form method="POST" use:enhance>
		<div class="mb-4 grid gap-2">
			<Label for="name">Campaign Name</Label>
			<Input id="name" name="name" bind:value={name} required placeholder="e.g., Summer Sale 2025" />
			{#if form?.errors?.name}
				<p class="text-sm text-destructive">{form.errors.name}</p>
			{/if}
		</div>

		<div class="mb-6 grid gap-2">
			<Label for="goal">Campaign Goal (Optional)</Label>
			<Textarea id="goal" name="goal" bind:value={goal} placeholder="e.g., Increase brand awareness by 10%" />
			{#if form?.errors?.goal}
				<p class="text-sm text-destructive">{form.errors.goal}</p>
			{/if}
		</div>

		<div class="flex justify-end gap-2">
			<!-- TODO: Use enhance callback for isSubmitting state if needed -->
			<Button href="/campaigns" variant="outline">Cancel</Button>
			<Button type="submit">
				Create Campaign
			</Button>
		</div>
	</form>
</div>
