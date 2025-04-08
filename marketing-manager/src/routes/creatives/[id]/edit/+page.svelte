<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { AlertCircle, ArrowLeft, FileText, Image as ImageIcon } from 'lucide-svelte';
	// Import types
	import type {
		creatives as creativesTable,
		campaigns as campaignsTable,
		personas as personasTable,
		creativeText as creativeTextTable,
		creativeImage as creativeImageTable
		// Import video/lp types later
	} from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';

	// --- Types ---
	type Campaign = Pick<InferSelectModel<typeof campaignsTable>, 'id' | 'name'>;
	type Persona = Pick<InferSelectModel<typeof personasTable>, 'id' | 'name'>;
	// TODO: Add Theme type later
	type CreativeType = InferSelectModel<typeof creativesTable>['type'];

	// Type for the data fetched initially
	type CreativeEditData = InferSelectModel<typeof creativesTable> & {
		textData: InferSelectModel<typeof creativeTextTable> | null;
		imageData: InferSelectModel<typeof creativeImageTable> | null;
		// videoData: InferSelectModel<typeof creativeVideoTable> | null; // Add later
		// lpData: InferSelectModel<typeof creativeLpTable> | null; // Add later
	};

	// --- State ---
	let creativeId: number | null = null;
	let creativeType: CreativeType | null = null; // Store the type, it cannot be changed

	// Common Fields
	let name = $state('');
	let description = $state('');
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
	let isLoading = $state(true);
	let isLoadingDropdowns = $state(true); // Added missing declaration
	let dropdownError = $state<string | null>(null);
	let isSubmitting = $state(false);
	let formErrors = $state<Record<string, any>>({}); // Can contain nested errors
	let fetchError = $state<string | null>(null); // Separate error for initial fetch

	// --- Data Fetching (Initial Load + Dropdowns) ---
	$effect(() => {
		const idParam = $page.params.id;
		creativeId = parseInt(idParam, 10);

		async function loadInitialData() {
			isLoading = true; // Keep this for overall page load
			isLoadingDropdowns = true; // Also set dropdown loading
			fetchError = null;
			dropdownError = null;
			formErrors = {};

			if (isNaN(creativeId!)) {
				fetchError = 'Invalid Creative ID';
				isLoading = false;
				return;
			}

			try {
				// Fetch creative details and dropdown data concurrently
				const [creativeRes, campaignsRes, personasRes] = await Promise.all([
					fetch(`/api/creatives/${creativeId}`),
					fetch('/api/campaigns'),
					fetch('/api/personas')
					// TODO: Add fetch('/api/themes') later
				]);

				// Handle dropdown errors first
				if (!campaignsRes.ok) throw new Error('Failed to load campaigns');
				if (!personasRes.ok) throw new Error('Failed to load personas');
				campaignsList = await campaignsRes.json();
				personasList = await personasRes.json();
				// TODO: Handle themes

				// Handle creative fetch error
				if (creativeRes.status === 404) throw new Error('Creative not found');
				if (!creativeRes.ok) {
					const errResult = await creativeRes.json().catch(() => ({}));
					throw new Error(errResult.message || `HTTP error! status: ${creativeRes.status}`);
				}

				const data: CreativeEditData = await creativeRes.json();

				// Populate form state
				creativeType = data.type; // Store the type
				name = data.name;
				description = data.description ?? '';
				selectedCampaignId = data.campaignId ?? '';
				selectedPersonaId = data.personaId ?? '';
				// TODO: Set themeId later

				if (data.type === 'text' && data.textData) {
					textHeadline = data.textData.headline ?? '';
					textBody = data.textData.body ?? '';
					textCta = data.textData.callToAction ?? '';
				} else if (data.type === 'image' && data.imageData) {
					imageUrl = data.imageData.imageUrl ?? '';
					imageAltText = data.imageData.altText ?? '';
				}
				// TODO: Populate video/lp fields later

			} catch (e: any) {
				console.error('Failed to load edit data:', e);
				fetchError = e.message || 'Failed to load creative data.';
				// Separate dropdown error? Maybe not necessary if Promise.all fails
			} finally {
				isLoading = false; // Mark overall loading as done
				isLoadingDropdowns = false; // Mark dropdown loading as done
			}
		}

		loadInitialData();
	});

	// --- Form Submission ---
	async function handleSubmit() {
		if (!creativeId || !creativeType) return; // Should not happen if loaded

		isSubmitting = true;
		formErrors = {};
		fetchError = null; // Clear fetch error on submit attempt

		// Construct base payload (only fields that can change)
		let basePayload: Record<string, any> = {
			name: name,
			description: description || null,
			campaignId: selectedCampaignId || null,
			personaId: selectedPersonaId || null,
			// themeId: selectedThemeId || null, // TODO: Add later
		};

		// Construct type-specific payload
		let typePayload: Record<string, any> = {};
		let typeDataKey: string | null = null;

		if (creativeType === 'text') {
			typeDataKey = 'textData';
			typePayload = {
				headline: textHeadline || null,
				body: textBody, // Body is required for text type
				callToAction: textCta || null
			};
		} else if (creativeType === 'image') {
			typeDataKey = 'imageData';
			typePayload = {
				imageUrl: imageUrl, // URL is required for image type
				altText: imageAltText || null
			};
		}
		// TODO: Add cases for video/lp later

		// Combine payloads for the API call
		const finalPayload = { ...basePayload };
		if (typeDataKey && Object.keys(typePayload).length > 0) {
			finalPayload[typeDataKey] = typePayload;
		}


		try {
			const response = await fetch(`/api/creatives/${creativeId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(finalPayload)
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

			// Success! Navigate back to the detail page
			await goto(`/creatives/${creativeId}`);

		} catch (e: any) {
			console.error('Creative update error:', e);
			formErrors = { server: 'Failed to submit form. Please check your connection.' };
		} finally {
			isSubmitting = false;
		}
	}

	function getIcon(type: CreativeType | null) {
		if (!type) return FileText;
		switch (type) {
			case 'text': return FileText;
			case 'image': return ImageIcon;
			// case 'video': return Video; // Add later
			// case 'lp': return LayoutPanelLeft; // Add later
			default: return FileText;
		}
	}

</script>

<div class="container mx-auto max-w-2xl py-8">
	<div class="mb-6">
		<Button href={`/creatives/${creativeId ?? ''}`} variant="outline">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Creative
		</Button>
	</div>

	<h1 class="mb-6 text-2xl font-bold">Edit Creative</h1>

	{#if isLoading}
		<div class="flex justify-center p-12">
			<p>Loading creative data...</p>
			<!-- TODO: Add spinner -->
		</div>
	{:else if fetchError}
		<div class="flex flex-col items-center justify-center rounded border border-dashed border-red-500 bg-red-50 p-12 text-center text-red-700">
			<AlertCircle class="mb-2 h-8 w-8" />
			<h3 class="text-xl font-semibold">Error Loading Data</h3>
			<p class="mb-4 text-sm">{fetchError}</p>
			<Button href="/creatives" variant="outline">Go To Creatives List</Button>
		</div>
	{:else if creativeType} <!-- Only render form if type is known -->
		{#if formErrors.server}
			<div class="mb-4 flex items-center rounded border border-red-500 bg-red-50 p-3 text-sm text-red-700">
				<AlertCircle class="mr-2 h-4 w-4 flex-shrink-0" />
				<span>{formErrors.server}</span>
			</div>
		{/if}

		<form onsubmit={handleSubmit} class="space-y-6">
			<!-- Creative Type Display (Readonly) -->
			<div>
				<Label>Creative Type</Label>
				<div class="mt-1 flex items-center gap-2 rounded border bg-gray-100 p-2 text-muted-foreground">
					<svelte:component this={getIcon(creativeType)} class="h-5 w-5" />
					<span>{creativeType.charAt(0).toUpperCase() + creativeType.slice(1)} (Cannot be changed)</span>
				</div>
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
			{#if creativeType === 'text'}
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
			{:else if creativeType === 'image'}
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
				<Button href={`/creatives/${creativeId ?? ''}`} variant="outline">Cancel</Button>
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
