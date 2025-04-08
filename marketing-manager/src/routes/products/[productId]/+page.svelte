<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { products as productsTable, personas as personasTable } from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';
	import Button from '$lib/components/ui/button/Button.svelte';
	import { User, AlertCircle, ArrowLeft } from 'lucide-svelte'; // Import necessary icons
	import ProductDetailView from '$lib/components/products/ProductDetailView.svelte'; // Import shared view

	type Product = InferSelectModel<typeof productsTable>;
	type PersonaListItem = {
		id: number;
		name: string;
		personaTitle: string | null;
		imageUrl: string | null;
	};

	// --- State ---
	let product = $state<Product | null>(null);
	let error = $state<string | null>(null);
	let loading = $state<boolean>(true);
	let associatedPersonas = $state<PersonaListItem[]>([]);
	let personasLoading = $state<boolean>(true);
	let personasError = $state<string | null>(null);
	let currentLoadedProductId = $state<number | null>(null); // Track loaded ID

	// --- Data Fetching ---
	$effect(() => {
		const idParam = $page.params.productId;
		const parsedId = idParam ? parseInt(idParam, 10) : NaN;

		// Reset state immediately based on parsedId validity
		if (isNaN(parsedId)) {
			product = null;
			associatedPersonas = [];
			error = 'Invalid Product ID format in URL.';
			personasError = null;
			loading = false;
			personasLoading = false;
		} else if (parsedId !== currentLoadedProductId) { // Only fetch if ID changed
			// Reset state for valid ID before fetching
			product = null;
			associatedPersonas = [];
			error = null;
			personasError = null;
			loading = true;
			personasLoading = true;
			currentLoadedProductId = parsedId; // Update the tracking ID *before* fetching

			// Trigger fetches directly with parsedId
			(async () => {
				await Promise.all([
					fetchProduct(parsedId),
					fetchPersonas(parsedId) // Use parsedId directly
				]);
			})();
		}
		// If parsedId === currentLoadedProductId, do nothing, data is already loaded/loading
	});

	async function fetchProduct(id: number) {
		try {
			const response = await fetch(`/api/products/${id}`);
			if (response.status === 404) throw new Error('Product not found.');
			if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
			const data: Product = await response.json();
			// Convert date strings to Date objects
			product = {
				...data,
				createdAt: data.createdAt ? new Date(data.createdAt) : new Date(), // Provide default if needed
				updatedAt: data.updatedAt ? new Date(data.updatedAt) : null
			};
		} catch (e: any) {
			console.error(`Failed to fetch product ${id}:`, e);
			error = e.message || 'Failed to load product details.';
		} finally {
			loading = false;
		}
	}

	async function fetchPersonas(prodId: number) {
		personasError = null;
		personasLoading = true;
		try {
			console.log(`API: Loading personas for product ID: ${prodId}...`); // Added logging
			const response = await fetch(`/api/products/${prodId}/personas`);
			if (!response.ok) {
				if (response.status === 404) {
					console.log(`API: Found 0 personas for product ${prodId}.`); // Added logging
					associatedPersonas = []; return; // No personas found is okay
				}
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			// Process the response only once
			const fetchedPersonas = await response.json();
			associatedPersonas = fetchedPersonas;
			console.log(`API: Found ${associatedPersonas.length} personas for product ${prodId}.`); // Added logging
		} catch (e: any) {
			console.error(`Failed to fetch personas for product ${prodId}:`, e);
			personasError = e.message || 'Failed to load associated personas.';
			associatedPersonas = [];
		} finally {
			personasLoading = false;
		}
	}

	// --- Navigation ---
	function editProduct() {
		// Use parsedId from the store if needed, or re-parse from $page
		const idParam = $page.params.productId;
		const parsedId = idParam ? parseInt(idParam, 10) : NaN;
		if (!isNaN(parsedId)) {
			goto(`/products/${parsedId}/edit`);
		}
	}

	function goToList() {
		goto('/products');
	}

	function createPersona() {
		// Use parsedId from the store if needed, or re-parse from $page
		const idParam = $page.params.productId;
		const parsedId = idParam ? parseInt(idParam, 10) : NaN;
		if (!isNaN(parsedId)) {
			goto(`/products/${parsedId}/personas/new`);
		}
	}

</script>

<svelte:head>
	<title>{loading ? 'Loading Product...' : product ? product.name : 'Product Details'}</title>
</svelte:head>

<div class="container mx-auto p-4 md:p-8">
	{#if loading}
		<p class="text-center">Loading product details...</p>
	{:else if error}
		<div class="text-center">
			<p class="text-red-500 mb-4">Error: {error}</p>
			<Button onclick={goToList} variant="outline">Back to Products List</Button>
		</div>
	{:else if product}
		<!-- Header with Title and Actions -->
		<div class="mb-6 flex flex-wrap justify-between items-center gap-4">
			<h1 class="text-3xl font-bold break-words">{product.name}</h1>
			<div class="flex gap-2 flex-wrap">
				<Button onclick={goToList} variant="outline">
					<ArrowLeft class="mr-2 h-4 w-4" />
					Back to List
				</Button>
				<Button onclick={editProduct}>Edit Product</Button>
			</div>
		</div>

		<!-- Render Shared Product Detail View -->
		<ProductDetailView {product} />

		<!-- Section for Associated Personas (Remains on this page) -->
		<div class="mt-8 pt-6 border-t">
			<div class="flex justify-between items-center mb-4">
				<h2 class="text-2xl font-semibold">Associated Personas</h2>
				<Button onclick={createPersona}>Create New Persona</Button>
			</div>

			{#if personasLoading}
				<p>Loading personas...</p>
			{:else if personasError}
				<div class="flex items-center rounded border border-yellow-500 bg-yellow-50 p-3 text-sm text-yellow-700">
					<AlertCircle class="mr-2 h-4 w-4 flex-shrink-0" />
					<span>Error loading personas: {personasError}</span>
				</div>
			{:else if associatedPersonas.length === 0}
				<p class="text-gray-500 italic">No personas associated with this product yet.</p>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each associatedPersonas as persona (persona.id)}
						{@const currentProductId = parseInt($page.params.productId, 10)}
						<div class="border rounded-lg p-4 shadow hover:shadow-md transition-shadow flex flex-col justify-between">
							<div class="flex items-center mb-3">
								{#if persona.imageUrl}
									<img src={persona.imageUrl} alt={persona.name} class="w-12 h-12 rounded-full mr-3 object-cover border"/>
								{:else}
									<div class="w-12 h-12 rounded-full mr-3 bg-gray-200 flex items-center justify-center border">
										<User class="w-6 h-6 text-gray-500" />
									</div>
								{/if}
								<div>
									<h3 class="text-lg font-semibold leading-tight">{persona.name}</h3>
									{#if persona.personaTitle}
										<p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{persona.personaTitle}</p>
									{/if}
								</div>
							</div>
							<div class="flex justify-end mt-2">
								{#if !isNaN(currentProductId)}
									<Button
										href={`/products/${currentProductId}/personas/${persona.id}`}
										variant="outline"
										class="text-sm px-3 py-1"
									>
										View Details
									</Button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{:else if !loading && !error}
		<div class="text-center">
			<p class="text-gray-500 mb-4">Product data could not be loaded or does not exist.</p>
			<Button onclick={goToList} variant="outline">Back to Products List</Button>
		</div>
	{/if}
</div>
