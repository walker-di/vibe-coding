<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	// Use import type for schema
	import type { campaigns as campaignsTable } from '$lib/server/db/schema';
	import { ArrowLeft, AlertCircle } from 'lucide-svelte';
	import type { InferSelectModel } from 'drizzle-orm';

	type Campaign = InferSelectModel<typeof campaignsTable>;
	// Define statuses locally
	const campaignStatusesList = ['Draft', 'Active', 'Completed', 'Archived'] as const;
	type CampaignStatus = typeof campaignStatusesList[number];

	// --- State ---
	let campaignId: number | null = null;
	let campaignName = $state('');
	let campaignGoal = $state('');
	let campaignStartDate = $state<string | null>(null);
	let campaignEndDate = $state<string | null>(null);
	let campaignTargetPlatforms = $state('');
	let campaignStatus = $state<CampaignStatus>(campaignStatusesList[0]); // Use local type/list

	let isLoading = $state(true);
	let isSubmitting = $state(false);
	let error = $state<string | null>(null); // For fetch errors
	let formErrors = $state<Record<string, string | undefined>>({}); // For submission errors

	// --- Data Fetching ---
	$effect(() => {
		const idParam = $page.params.id;
		campaignId = parseInt(idParam, 10);

		async function fetchCampaignData() {
			isLoading = true;
			error = null;
			formErrors = {};

			if (isNaN(campaignId!)) {
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

				// Initialize form state with fetched data
				campaignName = data.name;
				campaignGoal = data.goal ?? '';
				// Format dates for input type="date" (YYYY-MM-DD)
				campaignStartDate = data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : null;
				campaignEndDate = data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : null;
				campaignTargetPlatforms = data.targetPlatforms ?? '';
				campaignStatus = data.status ?? campaignStatusesList[0]; // Use local list default

			} catch (e: any) {
				console.error('Failed to fetch campaign data:', e);
				error = e.message || 'Failed to load campaign data.';
			} finally {
				isLoading = false;
			}
		}

		fetchCampaignData();
	});

	// --- Form Submission ---
	async function handleSubmit() {
		if (!campaignId) return;

		isSubmitting = true;
		formErrors = {};
		error = null;

		const payload = {
			name: campaignName,
			goal: campaignGoal || null,
			startDate: campaignStartDate ? new Date(campaignStartDate) : null,
			endDate: campaignEndDate ? new Date(campaignEndDate) : null,
			targetPlatforms: campaignTargetPlatforms || null,
			status: campaignStatus
		};

		try {
			const response = await fetch(`/api/campaigns/${campaignId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			const result = await response.json();

			if (!response.ok) {
				if (response.status === 400 && result.errors) {
					const apiErrors: Record<string, string[]> = result.errors;
					let clientErrors: Record<string, string | undefined> = {};
					for (const key in apiErrors) {
						clientErrors[key] = apiErrors[key].join(', ');
					}
					formErrors = clientErrors;
				} else {
					formErrors = { server: result.message || 'An unknown server error occurred during update.' };
				}
				return;
			}

			// Success! Navigate back to the detail page
			await goto(`/campaigns/${campaignId}`);

		} catch (e: any) {
			console.error('Form submission error:', e);
			formErrors = { server: 'Failed to submit form. Please check your connection.' };
		} finally {
			isSubmitting = false;
		}
	}

</script>

<div class="container mx-auto max-w-2xl py-8">
	<div class="mb-6">
		<Button href={`/campaigns/${campaignId ?? ''}`} variant="outline">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Campaign
		</Button>
	</div>

	<h1 class="mb-6 text-2xl font-bold">Edit Campaign</h1>

	{#if isLoading}
		<div class="flex justify-center p-12">
			<p>Loading campaign data...</p>
			<!-- TODO: Add spinner -->
		</div>
	{:else if error}
		<div class="flex flex-col items-center justify-center rounded border border-dashed border-red-500 bg-red-50 p-12 text-center text-red-700">
			<AlertCircle class="mb-2 h-8 w-8" />
			<h3 class="text-xl font-semibold">Error Loading Data</h3>
			<p class="mb-4 text-sm">{error}</p>
			<Button href="/campaigns" variant="outline">Go To Campaigns List</Button>
		</div>
	{:else}
		{#if formErrors.server}
			<div class="mb-4 flex items-center rounded border border-red-500 bg-red-50 p-3 text-sm text-red-700">
				<AlertCircle class="mr-2 h-4 w-4 flex-shrink-0" />
				<span>{formErrors.server}</span>
			</div>
		{/if}

		<form onsubmit={handleSubmit} class="space-y-6">
			<!-- Campaign Name -->
			<div>
				<Label for="name" class={formErrors.name ? 'text-red-600' : ''}>Campaign Name *</Label>
				<Input
					id="name"
					name="name"
					type="text"
					required
					maxlength={100}
					bind:value={campaignName}
					aria-invalid={!!formErrors.name}
					aria-describedby={formErrors.name ? 'name-error' : undefined}
					disabled={isSubmitting}
					class={formErrors.name ? 'border-red-500' : ''}
					placeholder="e.g., Summer Sale 2025"
				/>
				{#if formErrors.name}
					<p id="name-error" class="mt-1 text-sm text-red-600">{formErrors.name}</p>
				{/if}
			</div>

			<!-- Campaign Goal -->
			<div>
				<Label for="goal" class={formErrors.goal ? 'text-red-600' : ''}>Campaign Goal (Optional)</Label>
				<Textarea
					id="goal"
					name="goal"
					bind:value={campaignGoal}
					disabled={isSubmitting}
					class={formErrors.goal ? 'border-red-500' : ''}
					placeholder="e.g., Increase brand awareness by 10%"
					rows={3}
				/>
				{#if formErrors.goal}
					<p id="goal-error" class="mt-1 text-sm text-red-600">{formErrors.goal}</p>
				{/if}
			</div>

			<!-- Dates -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<Label for="startDate" class={formErrors.startDate ? 'text-red-600' : ''}>Start Date (Optional)</Label>
					<Input
						id="startDate"
						name="startDate"
						type="date"
						bind:value={campaignStartDate}
						disabled={isSubmitting}
						class={formErrors.startDate ? 'border-red-500' : ''}
					/>
					{#if formErrors.startDate}
						<p id="startDate-error" class="mt-1 text-sm text-red-600">{formErrors.startDate}</p>
					{/if}
				</div>
				<div>
					<Label for="endDate" class={formErrors.endDate ? 'text-red-600' : ''}>End Date (Optional)</Label>
					<Input
						id="endDate"
						name="endDate"
						type="date"
						bind:value={campaignEndDate}
						disabled={isSubmitting}
						class={formErrors.endDate ? 'border-red-500' : ''}
					/>
					{#if formErrors.endDate}
						<p id="endDate-error" class="mt-1 text-sm text-red-600">{formErrors.endDate}</p>
					{/if}
				</div>
			</div>

			<!-- Target Platforms -->
			<div>
				<Label for="targetPlatforms" class={formErrors.targetPlatforms ? 'text-red-600' : ''}>Target Platforms (Optional)</Label>
				<Input
					id="targetPlatforms"
					name="targetPlatforms"
					type="text"
					bind:value={campaignTargetPlatforms}
					disabled={isSubmitting}
					class={formErrors.targetPlatforms ? 'border-red-500' : ''}
					placeholder="e.g., Facebook, Instagram, Google Ads"
				/>
				<p class="mt-1 text-xs text-gray-500">Comma-separated list or general description.</p>
				{#if formErrors.targetPlatforms}
					<p id="targetPlatforms-error" class="mt-1 text-sm text-red-600">{formErrors.targetPlatforms}</p>
				{/if}
			</div>

			<!-- Status -->
			<div>
				<Label for="status" class={formErrors.status ? 'text-red-600' : ''}>Status</Label>
				<select
					id="status"
					name="status"
					bind:value={campaignStatus}
					disabled={isSubmitting}
					class={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${formErrors.status ? 'border-red-500' : ''}`}
				>
					{#each campaignStatusesList as statusOption}
						<option value={statusOption}>{statusOption}</option>
					{/each}
				</select>
				{#if formErrors.status}
					<p id="status-error" class="mt-1 text-sm text-red-600">{formErrors.status}</p>
				{/if}
			</div>

			<!-- Actions -->
			<div class="flex justify-end gap-2 pt-4">
				<Button href={`/campaigns/${campaignId ?? ''}`} variant="outline">Cancel</Button>
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}
						Saving...
						<!-- TODO: Add spinner icon -->
					{:else}
						Save Changes
					{/if}
				</Button>
			</div>
		</form>
	{/if}
</div>
