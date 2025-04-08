<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/button/Button.svelte';
	import Input from '$lib/components/ui/input/Input.svelte';
	import Label from '$lib/components/ui/label/Label.svelte';
	import Textarea from '$lib/components/ui/textarea/Textarea.svelte';
	import type { products } from '$lib/server/db/schema';

	type Product = typeof products.$inferSelect;

	let formData = $state({
		name: '',
		description: '',
		imageUrl: '',
		industry: '',
		overview: '',
		details: '',
		featuresStrengths: ''
	});

	let error = $state<string | null>(null);
	let submitting = $state<boolean>(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault(); // Prevent default form submission
		error = null;
		submitting = true;

		if (!formData.name.trim()) {
			error = 'Product name is required.';
			submitting = false;
			return;
		}

		try {
			const response = await fetch('/api/products', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: 'Failed to create product. Please try again.' }));
				throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
			}

			const newProduct: Product = await response.json();
			goto(`/products/${newProduct.id}`); // Redirect to the new product's detail page

		} catch (e: any) {
			console.error('Failed to create product:', e);
			error = e.message || 'An unexpected error occurred.';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Create New Product</title>
</svelte:head>

<div class="container mx-auto p-4 md:p-8 max-w-2xl">
	<h1 class="text-2xl font-bold mb-6">Create New Product</h1>

	<form onsubmit={handleSubmit} class="space-y-4">
		<div>
			<Label for="name">Product Name <span class="text-red-500">*</span></Label>
			<Input id="name" type="text" bind:value={formData.name} required disabled={submitting} />
		</div>

		<div>
			<Label for="overview">Overview</Label>
			<Textarea id="overview" bind:value={formData.overview} placeholder="A brief summary of the product." disabled={submitting} />
		</div>

        <div>
			<Label for="industry">Industry</Label>
			<Input id="industry" type="text" bind:value={formData.industry} placeholder="e.g., Business Video Media" disabled={submitting} />
		</div>

		<div>
			<Label for="details">Detailed Description</Label>
			<Textarea id="details" bind:value={formData.details} rows={5} placeholder="More in-depth information about the product." disabled={submitting} />
		</div>

        <div>
			<Label for="featuresStrengths">Features / Strengths</Label>
			<Textarea id="featuresStrengths" bind:value={formData.featuresStrengths} rows={5} placeholder="List key features or strengths, one per line." disabled={submitting} />
		</div>

		<div>
			<Label for="description">Internal Description (Optional)</Label>
			<Textarea id="description" bind:value={formData.description} placeholder="Internal notes or description." disabled={submitting} />
		</div>

		<div>
			<Label for="imageUrl">Image URL (Optional)</Label>
			<Input id="imageUrl" type="url" bind:value={formData.imageUrl} placeholder="https://example.com/image.png" disabled={submitting} />
		</div>

		{#if error}
			<p class="text-red-500">{error}</p>
		{/if}

		<div class="flex justify-end pt-4">
			<Button type="submit" disabled={submitting}>
				{submitting ? 'Creating...' : 'Create Product'}
			</Button>
		</div>
	</form>
</div>
