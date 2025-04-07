<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button'; // Assuming shadcn-svelte setup later or basic button
	import { PlusCircle } from 'lucide-svelte'; // Assuming lucide icons

	let { campaigns } = $props<{ campaigns: PageData['campaigns'] }>();

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

	{#if campaigns.length > 0}
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
