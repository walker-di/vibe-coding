<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { campaignStatuses } from '$lib/server/db/schema'; // Import statuses for select options
	import { AlertCircle } from 'lucide-svelte';

	// --- State Management with Runes ---
	let campaignName = $state('');
	let campaignGoal = $state('');
	let campaignStartDate = $state<string | null>(null); // Store as string for date input
	let campaignEndDate = $state<string | null>(null);
	let campaignTargetPlatforms = $state('');
	let campaignStatus = $state(campaignStatuses[0]); // Default to 'Draft'

	let submitting = $state(false);
	let formErrors = $state<Record<string, string | undefined>>({}); // For field-specific and server errors

	// --- Form Submission Logic ---
	async function handleSubmit() {
		submitting = true;
		formErrors = {}; // Clear previous errors

		// Prepare data payload (convert date strings to Date objects or null)
		const payload = {
			name: campaignName,
			goal: campaignGoal || null,
			startDate: campaignStartDate ? new Date(campaignStartDate) : null,
			endDate: campaignEndDate ? new Date(campaignEndDate) : null,
			targetPlatforms: campaignTargetPlatforms || null,
			status: campaignStatus
		};

		try {
			const response = await fetch('/api/campaigns', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			const result = await response.json();

			if (!response.ok) {
				if (response.status === 400 && result.errors) {
					// Flatten Drizzle/Zod errors if they are nested
					const apiErrors: Record<string, string[]> = result.errors;
					let clientErrors: Record<string, string | undefined> = {};
					for (const key in apiErrors) {
						clientErrors[key] = apiErrors[key].join(', '); // Join multiple errors for a field
					}
					formErrors = clientErrors;
				} else {
					formErrors = { server: result.message || 'An unknown server error occurred.' };
				}
				return; // Stop processing on error
			}

			// Success! Navigate to the campaigns list page
			await goto('/campaigns'); // Or potentially to the new campaign's detail page if ID is returned and needed: `/campaigns/${result.id}`

		} catch (error) {
			console.error('Form submission error:', error);
			formErrors = { server: 'Failed to submit form. Please check your connection.' };
		} finally {
			submitting = false;
		}
	}
</script>

<div class="container mx-auto max-w-2xl py-8">
	<h1 class="mb-6 text-2xl font-bold">Create New Campaign</h1>

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
				disabled={submitting}
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
				disabled={submitting}
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
					disabled={submitting}
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
					disabled={submitting}
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
				disabled={submitting}
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
				disabled={submitting}
				class={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${formErrors.status ? 'border-red-500' : ''}`}
			>
				{#each campaignStatuses as statusOption}
					<option value={statusOption}>{statusOption}</option>
				{/each}
			</select>
			{#if formErrors.status}
				<p id="status-error" class="mt-1 text-sm text-red-600">{formErrors.status}</p>
			{/if}
		</div>

		<!-- Actions -->
		<div class="flex justify-end gap-2 pt-4">
			<Button href="/campaigns" variant="outline">Cancel</Button>
			<Button type="submit" disabled={submitting}>
				{#if submitting}
					Creating...
					<!-- TODO: Add spinner icon -->
				{:else}
					Create Campaign
				{/if}
			</Button>
		</div>
	</form>
</div>
