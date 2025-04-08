<script lang="ts">
	import type { campaigns as campaignsTable } from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';

	type Campaign = InferSelectModel<typeof campaignsTable>;

	// --- Props ---
	let { campaign }: { campaign: Campaign } = $props();

	// --- Helper ---
	function formatDate(timestamp: number | Date | null | undefined): string {
		if (!timestamp) return 'N/A';
		// Ensure it's a Date object before calling methods
		const dateObj = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
		if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
			return 'Invalid Date';
		}
		return dateObj.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<!-- Display Logic extracted from the page -->
<div class="space-y-4">
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
			<p class="text-base">{formatDate(campaign.startDate)}</p> <!-- Pass Date object directly -->
		</div>
		<div>
			<h2 class="mb-1 text-sm font-medium text-muted-foreground">End Date</h2>
			<p class="text-base">{formatDate(campaign.endDate)}</p> <!-- Pass Date object directly -->
		</div>
	</div>

	<div>
		<h2 class="mb-1 text-sm font-medium text-muted-foreground">Created At</h2>
		<p class="text-base">{formatDate(campaign.createdAt)}</p> <!-- Pass Date object directly -->
	</div>

	{#if campaign.updatedAt}
		<div>
			<h2 class="mb-1 text-sm font-medium text-muted-foreground">Last Updated</h2>
			<p class="text-base">{formatDate(campaign.updatedAt)}</p> <!-- Pass Date object directly -->
		</div>
	{/if}
</div>
