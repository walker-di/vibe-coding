<script lang="ts">
	import PersonaForm from '$lib/components/personas/PersonaForm.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Construct URLs needed by the form
	const apiBaseUrl = `/api/products/${data.productId}/personas`; // Base for PUT/POST
	const generateApiUrl = `/api/products/${data.productId}/personas/generate`; // AI endpoint
	const cancelUrl = `/products/${data.productId}/personas/${data.personaId}`; // Back to detail view
	const successUrl = (id: number) => `/products/${data.productId}/personas/${id}`; // Back to detail view after save

</script>

<div class="container mx-auto px-4 py-8">
	<h1 class="mb-6 text-2xl font-bold">Edit Persona: {data.persona.name}</h1>

	<PersonaForm
		personaData={data.persona}
		productId={data.productId}
		{apiBaseUrl}
		{generateApiUrl}
		{cancelUrl}
		{successUrl}
	/>
</div>
