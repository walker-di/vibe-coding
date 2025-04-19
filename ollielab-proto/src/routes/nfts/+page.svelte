<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form } = $props<{ data: PageData; form: ActionData }>();

	// Reactive state for potential form errors per NFT
	let listErrors = $state<{ [nftId: string]: string | null }>({});

	$effect(() => {
		// Clear specific error if form action was successful for that NFT
		if (form?.success && form.listedNft?.id) {
			listErrors[form.listedNft.id] = null;
		}
		// Set specific error if form action failed for that NFT
		else if (form?.error && form.nftId) {
			listErrors[form.nftId] = form.error;
		}
	});

</script>

<h1>My NFTs</h1>

{#if !data.nfts || data.nfts.length === 0}
	<p>You do not own any NFTs yet.</p>
{:else}
	<ul style="list-style: none; padding: 0;">
		{#each data.nfts as nft (nft.id)}
			<li style="border: 1px solid #ccc; margin-bottom: 1rem; padding: 1rem; background-color: {nft.status === 'sold' ? '#f0f0f0' : 'white'};">
				<p><strong>NFT ID:</strong> {nft.id}</p>
				<p><strong>Status:</strong> <span style="font-weight: bold; color: {nft.status === 'listed' ? 'green' : nft.status === 'sold' ? 'grey' : 'black'};">{nft.status}</span></p>
				{#if nft.generatedArtId}
					<p><em>(Based on Art ID: {nft.generatedArtId})</em></p>
					<!-- TODO: Link to art view page -->
				{/if}
				{#if nft.eotId}
					<p><em>(Based on EOT ID: {nft.eotId})</em></p>
					<!-- TODO: Link to EOT view page -->
				{/if}
				<p><strong>Token ID:</strong> {nft.tokenId ?? 'N/A'}</p>
				<p><strong>Contract:</strong> {nft.contractAddress ?? 'N/A'}</p>
				<p><strong>Metadata:</strong> <a href={nft.metadataUrl} target="_blank">{nft.metadataUrl ?? 'N/A'}</a></p>
				<p><strong>Minted:</strong> {nft.mintedAt ? new Date(nft.mintedAt * 1000).toLocaleString() : 'N/A'}</p>

				{#if nft.status === 'listed'}
					<p><strong>Price:</strong> {nft.price} {nft.currency}</p>
					<p><em>Listed at: {nft.listedForSaleAt ? new Date(nft.listedForSaleAt * 1000).toLocaleString() : 'N/A'}</em></p>
					<!-- TODO: Add Unlist button/form -->
				{:else if nft.status === 'minted'}
					<form method="POST" action="?/list" use:enhance style="margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed #eee;">
						<h4>List for Sale:</h4>
						{#if listErrors[nft.id]}
							<p style="color: red;">Error: {listErrors[nft.id]}</p>
						{/if}
						<input type="hidden" name="nftId" value={nft.id} />
						<div>
							<label for="price-{nft.id}">Price:</label>
							<input type="number" id="price-{nft.id}" name="price" step="0.01" min="0.01" required style="width: 100px; margin-right: 5px;" />
							<label for="currency-{nft.id}">Currency:</label>
							<input type="text" id="currency-{nft.id}" name="currency" value="BRL" required style="width: 60px; margin-right: 10px;" />
							<button type="submit">List NFT</button>
						</div>
					</form>
				{:else if nft.status === 'sold'}
					<p><em>This NFT has been sold.</em></p>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

<style>
	label {
		margin-right: 5px;
		font-weight: bold;
	}
	input[type='number'],
	input[type='text'] {
		padding: 0.3rem;
		margin-bottom: 0.5rem;
		border: 1px solid #ccc;
	}
	button {
		padding: 0.5rem 1rem;
		cursor: pointer;
	}
</style>
