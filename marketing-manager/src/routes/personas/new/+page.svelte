<script lang="ts">
	import PersonaForm from '$lib/components/personas/PersonaForm.svelte';

	// Define the success URL function for this context
	function getSuccessUrl(id: number): string {
		return `/personas/${id}`;
	}
</script>

<svelte:head>
	<title>Create New Persona</title>
</svelte:head>

<div class="container mx-auto max-w-3xl py-8">
	<h1 class="mb-6 text-2xl font-bold">Create New Persona</h1>

	<PersonaForm
		apiBaseUrl="/api/personas"
		generateApiUrl="/api/personas/generate"
		cancelUrl="/personas"
		successUrl={getSuccessUrl}
	/>
</div>
