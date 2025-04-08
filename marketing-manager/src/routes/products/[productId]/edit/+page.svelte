<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/button/Button.svelte';
	import Input from '$lib/components/ui/input/Input.svelte';
	import Label from '$lib/components/ui/label/Label.svelte';
	import Textarea from '$lib/components/ui/textarea/Textarea.svelte';
	import type { products } from '$lib/server/db/schema';

	type Product = typeof products.$inferSelect;

	let formData = $state({
		id: null as number | null, // Store the ID
		name: '',
		description: '',
		imageUrl: '',
		industry: '',
		overview: '',
		details: '',
		featuresStrengths: ''
	});

	let error = $state<string | null>(null);
	let loading = $state<boolean>(true);
	let submitting = $state<boolean>(false);
	let deleting = $state<boolean>(false);
	let productId = $state<number | null>(null);

	// Effect 1: Update productId state from route params and handle invalid ID
	$effect(() => {
		const idParam = $page.params.productId;
		if (!idParam) {
			productId = null;
			loading = true;
			error = null;
			return;
		}
		const parsedId = parseInt(idParam, 10);
		if (!isNaN(parsedId)) {
			if (productId !== parsedId) {
				productId = parsedId;
				error = null;
			}
		} else {
			productId = null;
			error = 'Invalid Product ID in URL.';
			loading = false;
		}
	});

	// Effect 2: Fetch data when productId state changes to a valid number
	$effect(() => {
		const currentId = productId;
		if (currentId !== null) {
			loading = true;
			(async () => {
				await fetchProduct(currentId);
			})();
		}
	});

	async function fetchProduct(id: number) {
		error = null;
		try {
			const response = await fetch(`/api/products/${id}`);
			if (response.status === 404) throw new Error('Product not found.');
			if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

			const productData: Product = await response.json();
			// Populate formData state
			formData.id = productData.id;
			formData.name = productData.name;
			formData.description = productData.description ?? '';
			formData.imageUrl = productData.imageUrl ?? '';
			formData.industry = productData.industry ?? '';
			formData.overview = productData.overview ?? '';
			formData.details = productData.details ?? '';
			formData.featuresStrengths = productData.featuresStrengths ?? '';

		} catch (e: any) {
			console.error(`Failed to fetch product ${id}:`, e);
			error = e.message || 'Failed to load product details.';
			formData.id = null; // Ensure ID is null on error
		} finally {
			loading = false;
		}
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!formData.id) return; // Should not happen if loaded correctly

		error = null;
		submitting = true;

		if (!formData.name.trim()) {
			error = 'Product name is required.';
			submitting = false;
			return;
		}

		// Prepare data for PUT request (only send fields that are part of the form)
		const updateData = {
			name: formData.name,
			description: formData.description,
			imageUrl: formData.imageUrl,
			industry: formData.industry,
			overview: formData.overview,
			details: formData.details,
			featuresStrengths: formData.featuresStrengths
		};


		try {
			const response = await fetch(`/api/products/${formData.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updateData)
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: 'Failed to update product.' }));
				throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
			}

			goto(`/products/${formData.id}`); // Redirect to the product detail page

		} catch (e: any) {
			console.error('Failed to update product:', e);
			error = e.message || 'An unexpected error occurred during update.';
		} finally {
			submitting = false;
		}
	}

    async function handleDelete() {
        if (!formData.id || deleting) return;

        if (!confirm(`Are you sure you want to delete the product "${formData.name}"? This action cannot be undone.`)) {
            return;
        }

        error = null;
        deleting = true;

        try {
            const response = await fetch(`/api/products/${formData.id}`, {
                method: 'DELETE'
            });

            if (response.status === 204) {
                goto('/products'); // Redirect to product list on successful deletion
            } else {
                 const errorData = await response.json().catch(() => ({ message: 'Failed to delete product.' }));
				throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

        } catch (e: any) {
            console.error('Failed to delete product:', e);
			error = e.message || 'An unexpected error occurred during deletion.';
        } finally {
            deleting = false;
        }
    }

    function cancelEdit() {
        if (formData.id) {
            goto(`/products/${formData.id}`);
        } else {
            goto('/products');
        }
    }
</script>

<svelte:head>
	<title>{loading ? 'Loading...' : `Edit Product: ${formData.name || '...'}`}</title>
</svelte:head>

<div class="container mx-auto p-4 md:p-8 max-w-2xl">
	<h1 class="text-2xl font-bold mb-6">Edit Product</h1>

	{#if loading}
		<p>Loading product data...</p>
	{:else if error && !formData.id}
        <!-- Show error only if we failed to load the product initially -->
		<p class="text-red-500 mb-4">Error: {error}</p>
        <Button onclick={() => goto('/products')} variant="outline">Back to Products List</Button>
	{:else if formData.id}
		<form onsubmit={handleSubmit} class="space-y-4">
			<div>
				<Label for="name">Product Name <span class="text-red-500">*</span></Label>
				<Input id="name" type="text" bind:value={formData.name} required disabled={submitting || deleting} />
			</div>

			<div>
				<Label for="overview">Overview</Label>
				<Textarea id="overview" bind:value={formData.overview} placeholder="A brief summary of the product." disabled={submitting || deleting} />
			</div>

			<div>
				<Label for="industry">Industry</Label>
				<Input id="industry" type="text" bind:value={formData.industry} placeholder="e.g., Business Video Media" disabled={submitting || deleting} />
			</div>

			<div>
				<Label for="details">Detailed Description</Label>
				<Textarea id="details" bind:value={formData.details} rows={5} placeholder="More in-depth information about the product." disabled={submitting || deleting} />
			</div>

			<div>
				<Label for="featuresStrengths">Features / Strengths</Label>
				<Textarea id="featuresStrengths" bind:value={formData.featuresStrengths} rows={5} placeholder="List key features or strengths, one per line." disabled={submitting || deleting} />
			</div>

			<div>
				<Label for="description">Internal Description (Optional)</Label>
				<Textarea id="description" bind:value={formData.description} placeholder="Internal notes or description." disabled={submitting || deleting} />
			</div>

			<div>
				<Label for="imageUrl">Image URL (Optional)</Label>
				<Input id="imageUrl" type="url" bind:value={formData.imageUrl} placeholder="https://example.com/image.png" disabled={submitting || deleting} />
			</div>

			{#if error}
                <!-- Show non-loading errors here -->
				<p class="text-red-500">{error}</p>
			{/if}

			<div class="flex justify-between items-center pt-4">
                <Button type="button" variant="destructive" onclick={handleDelete} disabled={deleting || submitting}>
                    {deleting ? 'Deleting...' : 'Delete Product'}
                </Button>
				<div class="space-x-2">
                    <Button type="button" variant="outline" onclick={cancelEdit} disabled={submitting || deleting}>Cancel</Button>
                    <Button type="submit" disabled={submitting || deleting}>
                        {submitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
			</div>
		</form>
    {:else}
        <!-- Fallback if loading finished but formData.id is still null (shouldn't happen ideally) -->
         <p class="text-red-500 mb-4">Could not load product data.</p>
         <Button onclick={() => goto('/products')} variant="outline">Back to Products List</Button>
	{/if}
</div>
