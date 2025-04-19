<script lang="ts">
	import type { ActionData } from './$types';
	import { enhance } from '$app/forms';
	// Runes like $effect and $state are automatically available in Svelte 5 runes mode

	let { form } = $props<{ form: ActionData }>();

	// Form state
	let prompt = $state(form?.prompt ?? '');
	let style = $state(form?.style ?? '');
	let generatedArtId = $state<string | null>(null);
	let isLoading = $state(false);
	let errorMessage = $state(form?.error ?? null);

	// Update state based on form action result
	$effect(() => {
		isLoading = false; // Reset loading on form update
		errorMessage = form?.error ?? null;
		if (form?.success && form.generatedArt) {
			generatedArtId = form.generatedArt.id;
			// Clear form on success
			prompt = '';
			style = '';
		} else {
			// Preserve form values if there was an error
			prompt = form?.prompt ?? prompt;
			style = form?.style ?? style;
		}
	});

	function handleSubmit() {
		isLoading = true;
		errorMessage = null;
		generatedArtId = null;
		// Let enhance handle the submission
	}

</script>

<h1>Generate AI Art</h1>

<form method="POST" action="?/generate" use:enhance={() => {
	handleSubmit(); // Call our loading state handler
	return async ({ update }) => {
		// This runs after the form action completes
		await update(); // Applies the result to the 'form' prop
	};
}}>
	{#if errorMessage}
		<p style="color: red;">Error: {errorMessage}</p>
	{/if}
	<div>
		<label for="prompt">Prompt:</label>
		<textarea id="prompt" name="prompt" bind:value={prompt} required rows="4"></textarea>
	</div>
	<div>
		<label for="style">Style (Optional):</label>
		<input type="text" id="style" name="style" bind:value={style} />
	</div>
	<!-- Add EOT selection dropdown here later if needed -->
	<button type="submit" disabled={isLoading}>
		{isLoading ? 'Generating...' : 'Generate Art'}
	</button>
</form>

{#if generatedArtId}
	<div style="margin-top: 2rem; border: 1px solid green; padding: 1rem;">
		<p><strong>Art generation started!</strong></p>
		<p>Record ID: {generatedArtId}</p>
		<p>Status is currently 'pending'.</p>
		<a href="/art/{generatedArtId}" style="display: inline-block; margin-top: 0.5rem;">View Status / Result</a>
	</div>
{/if}

<style>
	label {
		display: block;
		margin-top: 0.5rem;
		font-weight: bold;
	}
	input[type='text'],
	textarea {
		width: 100%;
		max-width: 500px;
		padding: 0.5rem;
		margin-bottom: 0.5rem;
		border: 1px solid #ccc;
		box-sizing: border-box; /* Include padding in width */
	}
	textarea {
		min-height: 80px;
	}
	button {
		padding: 0.7rem 1.5rem;
		margin-top: 1rem;
		cursor: pointer;
		background-color: #007bff;
		color: white;
		border: none;
		border-radius: 4px;
	}
	button:disabled {
		background-color: #ccc;
		cursor: not-allowed;
	}
</style>
