<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { PlusCircle, AlertCircle } from 'lucide-svelte'; // Added AlertCircle for error
	import type { campaigns as campaignsTable } from '$lib/server/db/schema'; // Import the table definition
	import type { InferSelectModel } from 'drizzle-orm'; // Helper to infer type from table

	// Infer the campaign type from the Drizzle schema table
	type Campaign = InferSelectModel<typeof campaignsTable>;

	let campaigns = $state<Campaign[] | null>(null); // Initialize as null to differentiate from empty array
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	$effect(() => {
		async function fetchCampaigns() {
			isLoading = true;
			error = null;
			try {
				const response = await fetch('/api/campaigns');
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				const data: Campaign[] = await response.json();
				campaigns = data;
			} catch (e: any) {
				console.error('Failed to fetch campaigns:', e);
				error = e.message || 'Failed to load campaigns. Please try again.';
				campaigns = []; // Set to empty array on error to stop loading state
			} finally {
				isLoading = false;
			}
		}

		fetchCampaigns();
	});

	// TODO: Add Card component for display
</script>

<div class="container mx-auto py-8">
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-2xl font-bold">Campaigns</h1>
		<Button href="/campaigns/new" variant="outline">
			<PlusCircle class="mr-2 h-4 w-4" />
			New Campaign
		</Button>
	</div>

	{#if isLoading}
		<div class="flex justify-center p-12">
			<p>Loading campaigns...</p>
			<!-- TODO: Add a spinner component -->
		</div>
	{:else if error}
		<div class="flex flex-col items-center justify-center rounded border border-dashed border-red-500 bg-red-50 p-12 text-center text-red-700">
			<AlertCircle class="mb-2 h-8 w-8" />
			<h3 class="text-xl font-semibold">Error Loading Campaigns</h3>
			<p class="mb-4 text-sm">{error}</p>
			<!-- Optional: Add a retry button -->
		</div>
	{:else if campaigns && campaigns.length > 0}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each campaigns as campaign (campaign.id)}
				<div class="rounded border p-4 shadow">
					<h2 class="mb-2 text-lg font-semibold">{campaign.name}</h2>
					<p class="text-sm text-gray-600">{campaign.goal || 'No goal set'}</p>
					<!-- TODO: Add link to detail page -->
					<a href={`/campaigns/${campaign.id}`} class="text-blue-500 hover:underline">View Details</a>
				</div>
			{/each}
		</div>
	{:else}
		<div class="flex flex-col items-center justify-center rounded border border-dashed p-12 text-center">
			<h3 class="text-xl font-semibold">No Campaigns Yet</h3>
			<p class="mb-4 text-sm text-muted-foreground">Get started by creating your first campaign.</p>
			<Button href="/campaigns/new">
				<PlusCircle class="mr-2 h-4 w-4" />
				Create Campaign
			</Button>
		</div>
	{/if}
</div>

<style>
	/* Add any specific styles if needed, Tailwind is preferred */
</style>
