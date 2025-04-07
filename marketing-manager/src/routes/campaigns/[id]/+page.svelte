<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft } from 'lucide-svelte';
	import { enhance } from '$app/forms'; // Import enhance
	// Removed SubmitFunction, UpdateFunction imports for simplification

	let { campaign } = $props<{ campaign: PageData['campaign'] }>();

	// Helper to format date (consider moving to a utility function later)
	function formatDate(timestamp: number | null | undefined): string {
		if (!timestamp) return 'N/A';
		return new Date(timestamp).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<div class="container mx-auto max-w-3xl py-8">
	<div class="mb-6">
		<Button href="/campaigns" variant="outline">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Campaigns
		</Button>
	</div>

	{#if campaign}
		<div class="space-y-4 rounded border p-6 shadow">
			<h1 class="text-3xl font-bold">{campaign.name}</h1>

			<div>
				<h2 class="mb-1 text-sm font-medium text-muted-foreground">Goal</h2>
				<p class="text-base">
					{#if campaign.goal}
						{campaign.goal}
					{:else}
						<span class="italic text-gray-500">No goal set</span>
					{/if}
				</p>
			</div>

			<div>
				<h2 class="mb-1 text-sm font-medium text-muted-foreground">Status</h2>
				<p class="text-base">{campaign.status}</p>
			</div>

			<div>
				<h2 class="mb-1 text-sm font-medium text-muted-foreground">Target Platforms</h2>
				<p class="text-base">
					{#if campaign.targetPlatforms}
						{campaign.targetPlatforms}
					{:else}
						<span class="italic text-gray-500">Not specified</span>
					{/if}
				</p>
			</div>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<h2 class="mb-1 text-sm font-medium text-muted-foreground">Start Date</h2>
					<p class="text-base">{formatDate(campaign.startDate)}</p>
				</div>
				<div>
					<h2 class="mb-1 text-sm font-medium text-muted-foreground">End Date</h2>
					<p class="text-base">{formatDate(campaign.endDate)}</p>
				</div>
			</div>

			<div>
				<h2 class="mb-1 text-sm font-medium text-muted-foreground">Created At</h2>
				<p class="text-base">{formatDate(campaign.createdAt)}</p>
			</div>

			{#if campaign.updatedAt}
				<div>
					<h2 class="mb-1 text-sm font-medium text-muted-foreground">Last Updated</h2>
					<p class="text-base">{formatDate(campaign.updatedAt)}</p>
				</div>
			{/if}

			<div class="mt-6 flex justify-end gap-2 border-t pt-4">
				<Button variant="outline" href={`/campaigns/${campaign.id}/edit`}>Edit</Button>
				<form method="POST" action="?/delete" use:enhance={({ cancel }) => { // Destructure cancel directly
					// Handle confirmation
					if (!confirm('Are you sure you want to delete this campaign? This cannot be undone.')) {
						cancel(); // Call cancel if not confirmed
					}
					// If confirmed, do nothing here, enhance proceeds with submission
				}}>
					<Button type="submit" variant="destructive">Delete</Button>
				</form>
			</div>
		</div>
	{:else}
		<div class="rounded border border-dashed p-12 text-center">
			<h2 class="text-xl font-semibold">Campaign Not Found</h2>
			<p class="text-muted-foreground">The requested campaign could not be found.</p>
		</div>
	{/if}
</div>
