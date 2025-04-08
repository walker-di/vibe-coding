<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { AlertCircle, FileText, Image as ImageIcon } from 'lucide-svelte';
	// Import types for dropdowns and payload
	import type { campaigns as campaignsTable, personas as personasTable, creativeTypes as creativeTypesEnum } from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';

	// --- Types ---
	type Campaign = Pick<InferSelectModel<typeof campaignsTable>, 'id' | 'name'>;
	type Persona = Pick<InferSelectModel<typeof personasTable>, 'id' | 'name'>;
	// TODO: Add Theme type when themes API exists
	const creativeTypes = ['text', 'image'] as const; // Only implement text/image for now
	type CreativeType = typeof creativeTypes[number];

	// --- State ---
	// Common Fields
	let name = $state('');
	let description = $state('');
	let selectedType = $state<CreativeType | ''>('');
	let selectedCampaignId = $state<number | ''>('');
	let selectedPersonaId = $state<number | ''>('');
	// TODO: Add selectedThemeId state later

	// Text Fields
	let textHeadline = $state('');
	let textBody = $state('');
	let textCta = $state('');

	// Image Fields
	let imageUrl = $state('');
	let imageAltText = $state('');

	// Dropdown Data
	let campaignsList = $state<Campaign[]>([]);
	let personasList = $state<Persona[]>([]);
	// TODO: Add themesList state later

	// UI State
	let isLoadingDropdowns = $state(true);
	let dropdownError = $state<string | null>(null);
	let isSubmitting = $state(false);
	let formErrors = $state<Record<string, any>>({}); // Can contain nested errors

	// --- Data Fetching for Dropdowns ---
	$effect(() => {
		async function fetchDropdownData() {
			isLoadingDropdowns = true;
			dropdownError = null;
			try {
				const [campaignsRes, personasRes] = await Promise.all([
					fetch('/api/campaigns'),
					fetch('/api/personas')
					// TODO: Add fetch('/api/themes') later
				]);

				if (!campaignsRes.ok) throw new Error('Failed to load campaigns');
				if (!personasRes.ok) throw new Error('Failed to load personas');
				// TODO: Check themesRes.ok later

				campaignsList = await campaignsRes.json();
				personasList = await personasRes.json();
				// TODO: themesList = await themesRes.json();

			} catch (e: any) {
				console.error("Failed to load dropdown data:", e);
				dropdownError = e.message || "Failed to load data for dropdowns.";
			} finally {
				isLoadingDropdowns = false;
			}
		}
		fetchDropdownData();
	});

	// --- Form Submission ---
	async function handleSubmit() {
		isSubmitting = true;
		formErrors = {};

		// Construct base payload
		let payload: Record<string, any> = {
			name: name,
			description: description || null,
			type: selectedType,
			campaignId: selectedCampaignId || null,
			personaId: selectedPersonaId || null,
			// themeId: selectedThemeId || null, // TODO: Add later
		};

		// Add type-specific data
		if (selectedType === 'text') {
			payload.textData = {
				headline: textHeadline || null,
				body: textBody,
				callToAction: textCta || null
			};
		} else if (selectedType === 'image') {
			payload.imageData = {
				imageUrl: imageUrl,
				altText: imageAltText || null
				// width/height omitted for now
			};
		}
		// TODO: Add cases for video/lp later

		try {
			const response = await fetch('/api/creatives', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			const result = await response.json();

			if (!response.ok) {
				if (response.status === 400 && result.errors) {
					formErrors = result.errors; // API returns field-specific errors
				} else {
					formErrors = { server: result.message || 'An unknown server error occurred.' };
				}
				console.log("Form Errors:", formErrors);
				return; // Stop processing on error
			}

			// Success! Navigate to the creatives list page (or detail page)
			await goto('/creatives'); // Or `/creatives/${result.id}`

		} catch (e: any) {
			console.error('Creative submission error:', e);
			formErrors = { server: 'Failed to submit form. Please check your connection.' };
		} finally {
			isSubmitting = false;
		}
	}

</script>

<div class="container mx-auto max-w-2xl py-8">
	<h1 class="mb-6 text-2xl font-bold">Create New Creative</h1>

	{#if formErrors.server}
		<div class="mb-4 flex items-center rounded border border-red-500 bg-red-50 p-3 text-sm text-red-700">
			<AlertCircle class="mr-2 h-4 w-4 flex-shrink-0" />
			<span>{formErrors.server}</span>
		</div>
	{/if}

	<form onsubmit={handleSubmit} class="space-y-6">
		<!-- Creative Type Selection -->
		<div>
			<Label for="creativeType" class={formErrors.type ? 'text-red-600' : ''}>Creative Type *</Label>
			<select
				id="creativeType"
				name="creativeType"
				required
				bind:value={selectedType}
				disabled={isSubmitting}
				class={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${formErrors.type ? 'border-red-500' : ''}`}
			>
				<option value="" disabled>-- Select Type --</option>
				{#each creativeTypes as typeOption}
					<option value={typeOption}>{typeOption.charAt(0).toUpperCase() + typeOption.slice(1)}</option>
				{/each}
				<!-- Add Video/LP later -->
			</select>
			{#if formErrors.type}<p class="mt-1 text-sm text-red-600">{formErrors.type}</p>{/if}
		</div>

		<!-- Common Fields -->
		<div>
			<Label for="name" class={formErrors.name ? 'text-red-600' : ''}>Creative Name *</Label>
			<Input id="name" name="name" type="text" required maxlength={150} bind:value={name} disabled={isSubmitting} class={formErrors.name ? 'border-red-500' : ''} placeholder="e.g., Summer Sale Ad Copy V1" />
			{#if formErrors.name}<p class="mt-1 text-sm text-red-600">{formErrors.name}</p>{/if}
		</div>
		<div>
			<Label for="description" class={formErrors.description ? 'text-red-600' : ''}>Description (Optional)</Label>
			<Textarea id="description" name="description" rows={3} bind:value={description} disabled={isSubmitting} class={formErrors.description ? 'border-red-500' : ''} />
			{#if formErrors.description}<p class="mt-1 text-sm text-red-600">{formErrors.description}</p>{/if}
		</div>

		<!-- Linking Fields -->
		{#if isLoadingDropdowns}
			<p>Loading options...</p>
		{:else if dropdownError}
			<p class="text-red-600">Error loading options: {dropdownError}</p>
		{:else}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<Label for="campaignId" class={formErrors.campaignId ? 'text-red-600' : ''}>Link to Campaign (Optional)</Label>
					<select id="campaignId" name="campaignId" bind:value={selectedCampaignId} disabled={isSubmitting} class={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${formErrors.campaignId ? 'border-red-500' : ''}`}>
						<option value="">-- None --</option>
						{#each campaignsList as campaign (campaign.id)}
							<option value={campaign.id}>{campaign.name}</option>
						{/each}
					</select>
					{#if formErrors.campaignId}<p class="mt-1 text-sm text-red-600">{formErrors.campaignId}</p>{/if}
				</div>
				<div>
					<Label for="personaId" class={formErrors.personaId ? 'text-red-600' : ''}>Link to Persona (Optional)</Label>
					<select id="personaId" name="personaId" bind:value={selectedPersonaId} disabled={isSubmitting} class={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${formErrors.personaId ? 'border-red-500' : ''}`}>
						<option value="">-- None --</option>
						{#each personasList as persona (persona.id)}
							<option value={persona.id}>{persona.name}</option>
						{/each}
					</select>
					{#if formErrors.personaId}<p class="mt-1 text-sm text-red-600">{formErrors.personaId}</p>{/if}
				</div>
				<!-- TODO: Add Theme dropdown later -->
			</div>
		{/if}


		<!-- Type-Specific Fields -->
		{#if selectedType === 'text'}
			<section class="space-y-4 rounded border p-4">
				<h3 class="flex items-center text-lg font-semibold"><FileText class="mr-2 h-5 w-5"/> Text Creative Details</h3>
				<div>
					<Label for="textHeadline" class={formErrors.textData?.headline ? 'text-red-600' : ''}>Headline (Optional)</Label>
					<Input id="textHeadline" name="textHeadline" type="text" maxlength={200} bind:value={textHeadline} disabled={isSubmitting} class={formErrors.textData?.headline ? 'border-red-500' : ''} />
					{#if formErrors.textData?.headline}<p class="mt-1 text-sm text-red-600">{formErrors.textData.headline}</p>{/if}
				</div>
				<div>
					<Label for="textBody" class={formErrors.textData?.body ? 'text-red-600' : ''}>Body *</Label>
					<Textarea id="textBody" name="textBody" required rows={5} bind:value={textBody} disabled={isSubmitting} class={formErrors.textData?.body ? 'border-red-500' : ''} />
					{#if formErrors.textData?.body}<p class="mt-1 text-sm text-red-600">{formErrors.textData.body}</p>{/if}
				</div>
				<div>
					<Label for="textCta" class={formErrors.textData?.callToAction ? 'text-red-600' : ''}>Call to Action (Optional)</Label>
					<Input id="textCta" name="textCta" type="text" maxlength={100} bind:value={textCta} disabled={isSubmitting} class={formErrors.textData?.callToAction ? 'border-red-500' : ''} />
					{#if formErrors.textData?.callToAction}<p class="mt-1 text-sm text-red-600">{formErrors.textData.callToAction}</p>{/if}
				</div>
			</section>
		{:else if selectedType === 'image'}
			<section class="space-y-4 rounded border p-4">
				<h3 class="flex items-center text-lg font-semibold"><ImageIcon class="mr-2 h-5 w-5"/> Image Creative Details</h3>
				<div>
					<Label for="imageUrl" class={formErrors.imageData?.imageUrl ? 'text-red-600' : ''}>Image URL *</Label>
					<Input id="imageUrl" name="imageUrl" type="url" required bind:value={imageUrl} disabled={isSubmitting} class={formErrors.imageData?.imageUrl ? 'border-red-500' : ''} placeholder="https://..." />
					{#if formErrors.imageData?.imageUrl}<p class="mt-1 text-sm text-red-600">{formErrors.imageData.imageUrl}</p>{/if}
					{#if imageUrl}
						<img src={imageUrl} alt="Preview" class="mt-2 max-h-40 rounded border" />
					{/if}
				</div>
				<div>
					<Label for="imageAltText" class={formErrors.imageData?.altText ? 'text-red-600' : ''}>Alt Text (Optional)</Label>
					<Input id="imageAltText" name="imageAltText" type="text" maxlength={200} bind:value={imageAltText} disabled={isSubmitting} class={formErrors.imageData?.altText ? 'border-red-500' : ''} />
					{#if formErrors.imageData?.altText}<p class="mt-1 text-sm text-red-600">{formErrors.imageData.altText}</p>{/if}
				</div>
			</section>
		{/if}
		<!-- TODO: Add sections for Video/LP later -->


		<!-- Actions -->
		<div class="flex justify-end gap-2 pt-4">
			<Button href="/creatives" variant="outline">Cancel</Button>
			<Button type="submit" disabled={isSubmitting || !selectedType}>
				{#if isSubmitting}
					Creating...
					<!-- TODO: Add spinner icon -->
				{:else}
					Create Creative
				{/if}
			</Button>
		</div>
	</form>
</div>
