<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { campaignStatuses } from '$lib/components/constants';
	import { AlertCircle } from 'lucide-svelte';
	import type { campaigns as campaignsTable } from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';

	type Campaign = InferSelectModel<typeof campaignsTable>;
	// Type for the data passed in (optional initial data)
	export type CampaignInputData = Partial<Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>>; // Export if needed elsewhere
	// Type for the payload submitted - EXPORT THIS
	export type CampaignPayload = Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>;

	// --- Props ---
	let {
		initialData = null, // Optional: For pre-filling form (edit mode)
		onSubmit = async () => {}, // Make optional, provide dummy default
		onCancel, // Required: Function to handle cancellation
		isSubmitting = false, // Keep for disabling fields internally if needed, but parent controls actual submission state
		formErrors = {} // Required: Passed from parent to display errors
	} = $props<{
		initialData?: CampaignInputData | null;
		onSubmit?: (payload: CampaignPayload) => Promise<void>; // Make optional
		onCancel: () => void;
		isSubmitting?: boolean; // Keep optional
		formErrors?: Record<string, any>; // Allow for server errors too
	}>();

	// Helper to format Date to YYYY-MM-DD for date input
	function formatDateForInput(date: Date | string | null | undefined): string | null {
		if (!date) return null;
		try {
			// Handle both Date objects and existing string dates
			const d = typeof date === 'string' ? new Date(date) : date;
			// Check if date is valid after parsing
			if (isNaN(d.getTime())) return null;
			// Adjust for timezone offset to prevent day shifts
			const offset = d.getTimezoneOffset();
			const adjustedDate = new Date(d.getTime() - offset * 60 * 1000);
			return adjustedDate.toISOString().split('T')[0];
		} catch (e) {
			console.error("Error formatting date:", e);
			return null; // Return null if formatting fails
		}
	}

	// --- State Management with Runes ---
	// Initialize state from initialData if provided
	let campaignName = $state(initialData?.name ?? '');
	let campaignGoal = $state(initialData?.goal ?? '');
	let campaignStartDate = $state(formatDateForInput(initialData?.startDate));
	let campaignEndDate = $state(formatDateForInput(initialData?.endDate));
	let campaignTargetPlatforms = $state(initialData?.targetPlatforms ?? '');
	let campaignStatus = $state(initialData?.status ?? 'Draft'); // Default to 'Draft'

	// Determine if we are in edit mode based on initialData having a name (or other required field)
	const isEditMode = $derived(!!initialData?.name); // Adjust logic if needed

	// --- Form Submission Logic ---
	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault(); // Prevent default form submission

		// Prepare data payload
		const payload: CampaignPayload = {
			name: campaignName,
			goal: campaignGoal || null,
			// Convert date strings back to Date objects or null for submission
			startDate: campaignStartDate ? new Date(campaignStartDate) : null,
			endDate: campaignEndDate ? new Date(campaignEndDate) : null,
			targetPlatforms: campaignTargetPlatforms || null,
			status: campaignStatus
		};

		// Call the onSubmit prop passed from the parent page
		await onSubmit(payload);
	}
</script>

{#if formErrors?.server}
	<div class="mb-4 flex items-center rounded border border-red-500 bg-red-50 p-3 text-sm text-red-700">
		<AlertCircle class="mr-2 h-4 w-4 flex-shrink-0" />
		<span>{formErrors.server}</span>
	</div>
{/if}

<!-- Removed onsubmit handler from this form tag -->
<form class="space-y-6">
	<!-- Campaign Name -->
	<div>
		<Label for="name" class={formErrors?.name ? 'text-red-600' : ''}>Campaign Name *</Label>
		<Input
			id="name"
			name="name"
			type="text"
			required
			maxlength={100}
			bind:value={campaignName}
			aria-invalid={!!formErrors?.name}
			aria-describedby={formErrors?.name ? 'name-error' : undefined}
			disabled={isSubmitting}
			class={formErrors?.name ? 'border-red-500' : ''}
			placeholder="e.g., Summer Sale 2025"
		/>
		{#if formErrors?.name}
			<p id="name-error" class="mt-1 text-sm text-red-600">{formErrors.name}</p>
		{/if}
	</div>

	<!-- Campaign Goal -->
	<div>
		<Label for="goal" class={formErrors?.goal ? 'text-red-600' : ''}>Campaign Goal (Optional)</Label>
		<Textarea
			id="goal"
			name="goal"
			bind:value={campaignGoal}
			disabled={isSubmitting}
			class={formErrors?.goal ? 'border-red-500' : ''}
			placeholder="e.g., Increase brand awareness by 10%"
			rows={3}
		/>
		{#if formErrors?.goal}
			<p id="goal-error" class="mt-1 text-sm text-red-600">{formErrors.goal}</p>
		{/if}
	</div>

	<!-- Dates -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<div>
			<Label for="startDate" class={formErrors?.startDate ? 'text-red-600' : ''}>Start Date (Optional)</Label>
			<Input
				id="startDate"
				name="startDate"
				type="date"
				bind:value={campaignStartDate}
				disabled={isSubmitting}
				class={formErrors?.startDate ? 'border-red-500' : ''}
			/>
			{#if formErrors?.startDate}
				<p id="startDate-error" class="mt-1 text-sm text-red-600">{formErrors.startDate}</p>
			{/if}
		</div>
		<div>
			<Label for="endDate" class={formErrors?.endDate ? 'text-red-600' : ''}>End Date (Optional)</Label>
			<Input
				id="endDate"
				name="endDate"
				type="date"
				bind:value={campaignEndDate}
				disabled={isSubmitting}
				class={formErrors?.endDate ? 'border-red-500' : ''}
			/>
			{#if formErrors?.endDate}
				<p id="endDate-error" class="mt-1 text-sm text-red-600">{formErrors.endDate}</p>
			{/if}
		</div>
	</div>

	<!-- Target Platforms -->
	<div>
		<Label for="targetPlatforms" class={formErrors?.targetPlatforms ? 'text-red-600' : ''}>Target Platforms (Optional)</Label>
		<Input
			id="targetPlatforms"
			name="targetPlatforms"
			type="text"
			bind:value={campaignTargetPlatforms}
			disabled={isSubmitting}
			class={formErrors?.targetPlatforms ? 'border-red-500' : ''}
			placeholder="e.g., Facebook, Instagram, Google Ads"
		/>
		<p class="mt-1 text-xs text-gray-500">Comma-separated list or general description.</p>
		{#if formErrors?.targetPlatforms}
			<p id="targetPlatforms-error" class="mt-1 text-sm text-red-600">{formErrors.targetPlatforms}</p>
		{/if}
	</div>

	<!-- Status -->
	<div>
		<Label for="status" class={formErrors?.status ? 'text-red-600' : ''}>Status</Label>
		<select
			id="status"
			name="status"
			bind:value={campaignStatus}
			disabled={isSubmitting}
			class={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${formErrors?.status ? 'border-red-500' : ''}`}
		>
			{#each campaignStatuses as statusOption}
				<option value={statusOption}>{statusOption}</option>
			{/each}
		</select>
		{#if formErrors?.status}
			<p id="status-error" class="mt-1 text-sm text-red-600">{formErrors.status}</p>
		{/if}
	</div>

	<!-- Actions -->
	<div class="flex justify-end gap-2 pt-4">
		<Button type="button" onclick={onCancel} variant="outline" disabled={isSubmitting}>Cancel</Button>
		<Button type="submit" disabled={isSubmitting}>
			{#if isSubmitting}
				{#if isEditMode}Saving...{:else}Creating...{/if}
			{:else}
				{#if isEditMode}Save Changes{:else}Create Campaign{/if}
			{/if}
		</Button>
	</div>
</form>
