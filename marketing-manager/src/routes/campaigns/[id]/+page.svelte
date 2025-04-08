<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft, AlertCircle, Trash2, Edit } from 'lucide-svelte';
	import type { campaigns as campaignsTable } from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';
	import CampaignDetailView from '$lib/components/campaigns/CampaignDetailView.svelte'; // Import shared view

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
				// Convert date strings from API to Date objects for the component
				campaign = {
					...data,
					startDate: data.startDate ? new Date(data.startDate) : null,
					endDate: data.endDate ? new Date(data.endDate) : null,
					// Ensure createdAt is a valid Date, default to now otherwise (shouldn't happen with DB constraint)
					createdAt: data.createdAt && !isNaN(new Date(data.createdAt).getTime()) ? new Date(data.createdAt) : new Date(),
					updatedAt: data.updatedAt ? new Date(data.updatedAt) : null
				};
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
		} finally {
			isDeleting = false;
		}
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
		</div>
	{:else if error}
		<div class="flex flex-col items-center justify-center rounded border border-dashed border-red-500 bg-red-50 p-12 text-center text-red-700">
			<AlertCircle class="mb-2 h-8 w-8" />
			<h3 class="text-xl font-semibold">Error Loading Campaign</h3>
			<p class="mb-4 text-sm">{error}</p>
			<Button href="/campaigns" variant="outline">Go Back</Button>
		</div>
	{:else if campaign}
		<div class="rounded border p-6 shadow">
			<!-- Render the shared detail view -->
			<CampaignDetailView {campaign} />

			<!-- Action buttons remain on the page -->
			<div class="mt-6 flex justify-end gap-2 border-t pt-4">
				<Button variant="outline" href={`/campaigns/${campaign.id}/edit`}>
					<Edit class="mr-2 h-4 w-4" />
					Edit
				</Button>
				<Button variant="destructive" onclick={handleDelete} disabled={isDeleting}>
					{#if isDeleting}
						Deleting...
					{:else}
						<Trash2 class="mr-2 h-4 w-4" />
						Delete
					{/if}
				</Button>
			</div>
		</div>
	{:else}
		<div class="rounded border border-dashed p-12 text-center">
			<h2 class="text-xl font-semibold">Campaign Not Found</h2>
			<p class="text-muted-foreground">The requested campaign could not be found.</p>
		</div>
	{/if}
</div>
