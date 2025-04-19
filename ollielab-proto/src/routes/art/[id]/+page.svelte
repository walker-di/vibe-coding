<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation'; // For polling

	let { data, form } = $props<{ data: PageData; form: ActionData }>();

	// Reactive state derived from loaded data
	let artRecord = $state(data.artRecord);
	let mintingError = $state<string | null>(null);
	let isMinting = $state(false);

	// Update local state when form action completes (for minting)
	$effect(() => {
		isMinting = false; // Reset loading state
		mintingError = form?.error ?? null;
		if (form?.success && form.mintedNft) {
			// If minting was successful, update the local art record status
			// The load function should ideally refetch, but we can update locally too
			if (artRecord && artRecord.id === form.mintedNft.generatedArtId) {
				artRecord.status = 'minted';
			}
			// Optionally redirect to the NFT page or show success message
		}
	});

	// --- Polling Logic (Optional) ---
	let intervalId: ReturnType<typeof setInterval> | null = null;

	onMount(() => {
		if (artRecord?.status === 'pending') {
			intervalId = setInterval(async () => {
				// Re-run the load function for this page
				await invalidate();
				// Need to update local state if invalidate doesn't trigger $props update directly in Svelte 5?
				// Let's assume for now invalidate() + load() updates `data` which updates `$props`
			}, 5000); // Poll every 5 seconds
		}
		// Cleanup interval on component destroy
		return () => {
			if (intervalId) clearInterval(intervalId);
		};
	});

	// Stop polling if status changes from pending
	$effect(() => {
		// Update local state when data prop changes (due to polling/invalidate)
		artRecord = data.artRecord;
		if (artRecord?.status !== 'pending' && intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
	});
	// --- End Polling Logic ---

	function handleMintSubmit() {
		isMinting = true;
		mintingError = null;
	}

</script>

{#if artRecord}
	<h1>Art Generation Details</h1>
	<p><strong>ID:</strong> {artRecord.id}</p>
	<p><strong>Status:</strong>
		<span style="font-weight: bold; color: {artRecord.status === 'completed' || artRecord.status === 'minted' ? 'green' : artRecord.status === 'failed' ? 'red' : 'orange'};">
			{artRecord.status}
		</span>
		{#if artRecord.status === 'pending'} (Checking again in a few seconds...){/if}
	</p>
	<p><strong>Prompt:</strong> {artRecord.prompt ?? 'N/A'}</p>
	{#if artRecord.style}
		<p><strong>Style:</strong> {artRecord.style}</p>
	{/if}
	{#if artRecord.eotId}
		<p><em>(Based on EOT ID: {artRecord.eotId})</em></p>
		<!-- TODO: Link to EOT view page -->
	{/if}
	<p><strong>Generated At:</strong> {new Date(artRecord.generatedAt * 1000).toLocaleString()}</p>

	{#if artRecord.status === 'completed' || artRecord.status === 'minted'}
		<h2>Generated Image</h2>
		{#if artRecord.imageUrl}
			<img src={artRecord.imageUrl} alt="Generated AI Art for prompt: {artRecord.prompt}" style="max-width: 500px; max-height: 500px; border: 1px solid #ccc;" />
		{:else}
			<p style="color: orange;">Image URL is missing, even though status is {artRecord.status}.</p>
		{/if}
	{/if}

	<!-- Minting Section -->
	{#if artRecord.status === 'completed'}
		<div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #eee;">
			<h2>Mint NFT</h2>
			{#if mintingError}
				<p style="color: red;">Minting Error: {mintingError}</p>
			{/if}
			<form method="POST" action="?/mint" use:enhance={() => {
				handleMintSubmit();
				return async ({ update }) => { await update(); };
			}}>
				<input type="hidden" name="generatedArtId" value={artRecord.id} />
				<!-- Add other minting options if needed -->
				<button type="submit" disabled={isMinting}>
					{isMinting ? 'Minting...' : 'Mint this Artwork as NFT'}
				</button>
			</form>
		</div>
	{:else if artRecord.status === 'minted'}
		<p style="margin-top: 2rem; color: green; font-weight: bold;">This artwork has been minted as an NFT.</p>
		<!-- TODO: Link to the NFT details page -->
	{/if}

{:else}
	<!-- This part should ideally not be reached if load function handles errors -->
	<h1>Art Record Not Found</h1>
	<p>Could not load details for the requested art generation record.</p>
{/if}

<style>
	img {
		display: block;
		margin-top: 1rem;
	}
	button {
		padding: 0.7rem 1.5rem;
		margin-top: 1rem;
		cursor: pointer;
		background-color: #28a745; /* Green for mint */
		color: white;
		border: none;
		border-radius: 4px;
	}
	button:disabled {
		background-color: #ccc;
		cursor: not-allowed;
	}
</style>
