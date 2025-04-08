<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft, AlertCircle, Trash2, Edit } from 'lucide-svelte';
	import type { campaigns as campaignsTable } from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';

	type Campaign = InferSelectModel<typeof campaignsTable>;

	// --- State ---
	let campaign = $state<Campaign | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let isDeleting = $state(false);

	// --- Data Fetching ---
	$effect(() => {
		const campaignId = $page.params.id; // Get ID from route params

		async function fetchCampaign() {
			isLoading = true;
			error = null;
			campaign = null; // Reset campaign data on new fetch

			if (!campaignId || isNaN(parseInt(campaignId, 10))) {
				error = 'Invalid Campaign ID';
				isLoading = false;
				return;
			}

			try {
				const response = await fetch(`/api/campaigns/${campaignId}`);
				if (response.status === 404) {
					throw new Error('Campaign not found');
				}
				if (!response.ok) {
					const errResult = await response.json().catch(() => ({}));
					throw new Error(errResult.message || `HTTP error! status: ${response.status}`);
				}
				const data: Campaign = await response.json();
				campaign = data;
			} catch (e: any) {
				console.error('Failed to fetch campaign:', e);
				error = e.message || 'Failed to load campaign details.';
			} finally {
				isLoading = false;
			}
		}

		fetchCampaign();
	});

	// --- Delete Logic ---
	async function handleDelete() {
		if (!campaign || isDeleting) return;

		if (!confirm(`Are you sure you want to delete the campaign "${campaign.name}"? This cannot be undone.`)) {
			return;
		}

		isDeleting = true;
		error = null; // Clear previous errors

		try {
			const response = await fetch(`/api/campaigns/${campaign.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errResult = await response.json().catch(() => ({}));
				throw new Error(errResult.message || `Failed to delete campaign. Status: ${response.status}`);
			}

			// Success! Navigate back to the campaigns list
			await goto('/campaigns');

		} catch (e: any) {
			console.error('Failed to delete campaign:', e);
			error = e.message || 'Failed to delete campaign.';
			// Display error to the user (could use a toast notification later)
		} finally {
			isDeleting = false;
		}
	}


	// --- Helper ---
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

	{#if isLoading}
		<div class="flex justify-center p-12">
			<p>Loading campaign details...</p>
			<!-- TODO: Add spinner -->
		</div>
	{:else if error}
		<div class="flex flex-col items-center justify-center rounded border border-dashed border-red-500 bg-red-50 p-12 text-center text-red-700">
			<AlertCircle class="mb-2 h-8 w-8" />
			<h3 class="text-xl font-semibold">Error Loading Campaign</h3>
			<p class="mb-4 text-sm">{error}</p>
			<Button href="/campaigns" variant="outline">Go Back</Button>
		</div>
	{:else if campaign}
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
					<p class="text-base">{formatDate(campaign.startDate ? new Date(campaign.startDate).getTime() : null)}</p>
				</div>
				<div>
					<h2 class="mb-1 text-sm font-medium text-muted-foreground">End Date</h2>
					<p class="text-base">{formatDate(campaign.endDate ? new Date(campaign.endDate).getTime() : null)}</p>
				</div>
			</div>

			<div>
				<h2 class="mb-1 text-sm font-medium text-muted-foreground">Created At</h2>
				<p class="text-base">{formatDate(campaign.createdAt ? new Date(campaign.createdAt).getTime() : null)}</p>
			</div>

			{#if campaign.updatedAt}
				<div>
					<h2 class="mb-1 text-sm font-medium text-muted-foreground">Last Updated</h2>
					<p class="text-base">{formatDate(campaign.updatedAt ? new Date(campaign.updatedAt).getTime() : null)}</p>
				</div>
			{/if}

			<div class="mt-6 flex justify-end gap-2 border-t pt-4">
				<Button variant="outline" href={`/campaigns/${campaign.id}/edit`}>
					<Edit class="mr-2 h-4 w-4" />
					Edit
				</Button>
				<Button variant="destructive" onclick={handleDelete} disabled={isDeleting}>
					{#if isDeleting}
						<!-- TODO: Add spinner -->
						Deleting...
					{:else}
						<Trash2 class="mr-2 h-4 w-4" />
						Delete
					{/if}
				</Button>
			</div>
		</div>
	{:else}
		<!-- This case should ideally be handled by the error block, but kept as fallback -->
		<div class="rounded border border-dashed p-12 text-center">
			<h2 class="text-xl font-semibold">Campaign Not Found</h2>
			<p class="text-muted-foreground">The requested campaign could not be found.</p>
		</div>
	{/if}
</div>
