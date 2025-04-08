<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { AlertCircle, ArrowLeft, FileText, Image as ImageIcon, Video as VideoIcon, Link as LinkIcon, Heart, Zap, Smile, Wind, Brain } from 'lucide-svelte'; // Added icons
	import CardSelector from '$lib/components/shared/CardSelector.svelte'; // Import CardSelector
	// Import constants and types from the new shared file
	import { creativeTypes, videoPlatforms, videoFormats, videoEmotions, appealFeatures } from '$lib/constants';
	import type { CreativeType, VideoPlatform, VideoFormat, VideoEmotion, AppealFeature } from '$lib/constants';
	// Import types
	import type {
		creatives as creativesTable,
		campaigns as campaignsTable,
		personas as personasTable,
		themes as themesTable, // Added Theme
		videoTemplates as videoTemplatesTable, // Added VideoTemplate
		creativeText as creativeTextTable,
		creativeImage as creativeImageTable,
		creativeVideo as creativeVideoTable, // Added Video
		creativeLp as creativeLpTable // Added LP
	} from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';

	// --- Types ---
	// Use Pick for dropdowns to minimize data transfer
	type Campaign = Pick<InferSelectModel<typeof campaignsTable>, 'id' | 'name'>;
	type Persona = Pick<InferSelectModel<typeof personasTable>, 'id' | 'name'>;
	type Theme = Pick<InferSelectModel<typeof themesTable>, 'id' | 'title'>; // Added Theme type
	type VideoTemplate = Pick<InferSelectModel<typeof videoTemplatesTable>, 'id' | 'name' | 'templateCode' | 'previewUrl'>; // Added VideoTemplate type

	// Type for the data fetched initially (includes all possible nested data)
	type CreativeEditData = InferSelectModel<typeof creativesTable> & {
		textData: InferSelectModel<typeof creativeTextTable> | null;
		imageData: InferSelectModel<typeof creativeImageTable> | null;
		videoData: InferSelectModel<typeof creativeVideoTable> | null; // Added Video data
		lpData: InferSelectModel<typeof creativeLpTable> | null; // Added LP data
	};

	// --- State ---
	let creativeId: number | null = null;
	let creativeType: CreativeType | null = null; // Store the type, it cannot be changed

	// Common Fields
	let name = $state('');
	let description = $state('');
	let selectedCampaignId = $state<number | ''>('');
	let selectedPersonaId = $state<number | ''>('');
	let selectedThemeId = $state<number | ''>(''); // Added Theme ID state

	// Text Fields
	let textHeadline = $state('');
	let textBody = $state('');
	let textCta = $state('');

	// Image Fields
	let imageUrl = $state('');
	let imageAltText = $state('');

	// Video Fields
	let videoUrl = $state('');
	let videoPlatform = $state<VideoPlatform | ''>('');
	let videoFormat = $state<VideoFormat | ''>(''); // Note: videoFormat is not currently used in the form UI
	let videoDuration = $state<number | ''>('');
	let videoAppealFeature = $state<AppealFeature | ''>('');
	let videoEmotion = $state<VideoEmotion | ''>('');
	let videoTemplateId = $state<number | ''>('');

	// LP Fields
	let lpPageUrl = $state('');
	let lpHeadline = $state('');
	let lpKeySections = $state(''); // Keep as string for textarea binding

	// Dropdown Data
	let campaignsList = $state<Campaign[]>([]);
	let personasList = $state<Persona[]>([]);
	let themesList = $state<Theme[]>([]); // Added themes list state
	let videoTemplatesList = $state<VideoTemplate[]>([]); // Added video templates list state

	// UI State
	let isLoading = $state(true);
	let isLoadingDropdowns = $state(true);
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
				// Fetch creative details and all dropdown data concurrently
				const [creativeRes, campaignsRes, personasRes, themesRes, videoTemplatesRes] = await Promise.all([
					fetch(`/api/creatives/${creativeId}`),
					fetch('/api/campaigns'),
					fetch('/api/personas'),
					fetch('/api/themes'),
					fetch('/api/video-templates')
				]);

				// Handle dropdown errors first
				if (!campaignsRes.ok) throw new Error(`Failed to load campaigns (${campaignsRes.status})`);
				if (!personasRes.ok) throw new Error(`Failed to load personas (${personasRes.status})`);
				if (!themesRes.ok) throw new Error(`Failed to load themes (${themesRes.status})`);
				if (!videoTemplatesRes.ok) throw new Error(`Failed to load video templates (${videoTemplatesRes.status})`);

				campaignsList = await campaignsRes.json();
				personasList = await personasRes.json();
				themesList = await themesRes.json();
				videoTemplatesList = await videoTemplatesRes.json();

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
				selectedThemeId = data.themeId ?? ''; // Set themeId

				if (data.type === 'text' && data.textData) {
					textHeadline = data.textData.headline ?? '';
					textBody = data.textData.body; // Body is required, should not be null
					textCta = data.textData.callToAction ?? '';
				} else if (data.type === 'image' && data.imageData) {
					imageUrl = data.imageData.imageUrl; // URL is required
					imageAltText = data.imageData.altText ?? '';
				} else if (data.type === 'video' && data.videoData) {
					videoUrl = data.videoData.videoUrl ?? '';
					videoPlatform = data.videoData.platform ?? '';
					videoFormat = data.videoData.format ?? '';
					videoDuration = data.videoData.duration ?? '';
					videoAppealFeature = data.videoData.appealFeature ?? '';
					videoEmotion = data.videoData.emotion ?? '';
					videoTemplateId = data.videoData.templateId ?? '';
				} else if (data.type === 'lp' && data.lpData) {
					lpPageUrl = data.lpData.pageUrl; // URL is required
					lpHeadline = data.lpData.headline ?? '';
					// Safely stringify JSON for textarea binding
					lpKeySections = data.lpData.keySections ? JSON.stringify(data.lpData.keySections, null, 2) : '';
				}

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
		let parsingErrorOccurred = false;

		// Construct base payload (only fields that can change)
		let basePayload: Record<string, any> = {
			name: name,
			description: description || null,
			campaignId: selectedCampaignId || null,
			personaId: selectedPersonaId || null,
			themeId: selectedThemeId || null, // Added themeId
		};

		// Construct type-specific payload
		let typePayload: Record<string, any> = {};
		let typeDataKey: string | null = null;

		switch (creativeType) {
			case 'text':
				typeDataKey = 'textData';
				typePayload = {
					headline: textHeadline || null,
					body: textBody, // Body is required for text type
					callToAction: textCta || null
				};
				break;
			case 'image':
				typeDataKey = 'imageData';
				typePayload = {
					imageUrl: imageUrl, // URL is required for image type
					altText: imageAltText || null
				};
				break;
			case 'video':
				typeDataKey = 'videoData';
				typePayload = {
					videoUrl: videoUrl || null,
					platform: videoPlatform || null,
					format: videoFormat || null,
					duration: videoDuration || null,
					appealFeature: videoAppealFeature || null,
					emotion: videoEmotion || null,
					templateId: videoTemplateId || null,
				};
				break;
			case 'lp':
				typeDataKey = 'lpData';
				let parsedKeySections = null;
				if (lpKeySections) {
					try {
						parsedKeySections = JSON.parse(lpKeySections);
					} catch (parseError: any) {
						formErrors = { ...formErrors, lpData: { ...(formErrors.lpData ?? {}), keySections: 'Invalid JSON format for Key Sections.' } };
						console.error('LP Key Sections JSON parse error:', parseError);
						parsingErrorOccurred = true;
					}
				}
				if (!parsingErrorOccurred) {
					typePayload = {
						pageUrl: lpPageUrl, // URL is required
						headline: lpHeadline || null,
						keySections: parsedKeySections
					};
				}
				break;
		}

		// Combine payloads for the API call
		const finalPayload = { ...basePayload };
		if (typeDataKey && Object.keys(typePayload).length > 0 && !parsingErrorOccurred) {
			finalPayload[typeDataKey] = typePayload;
		}

		if (parsingErrorOccurred) {
			isSubmitting = false;
			return;
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
			case 'video': return VideoIcon; // Added Video
			case 'lp': return LinkIcon; // Added LP
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
					<div>
						<Label for="themeId" class={formErrors.themeId ? 'text-red-600' : ''}>Link to Theme (Optional)</Label>
						<select id="themeId" name="themeId" bind:value={selectedThemeId} disabled={isSubmitting || themesList.length === 0} class={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${formErrors.themeId ? 'border-red-500' : ''}`}>
							<option value="">-- None --</option>
							{#each themesList as theme (theme.id)}
								<option value={theme.id}>{theme.title}</option>
							{/each}
						</select>
						{#if themesList.length === 0 && !isLoadingDropdowns}<p class="mt-1 text-sm text-gray-500">No themes available.</p>{/if}
						{#if formErrors.themeId}<p class="mt-1 text-sm text-red-600">{formErrors.themeId}</p>{/if}
					</div>
				</div>
			{/if}


			<!-- Type-Specific Fields -->
			{#if creativeType === 'text'}
				<section class="space-y-4 rounded border p-4">
					<h3 class="flex items-center text-lg font-semibold"><FileText class="mr-2 h-5 w-5" /> Text Creative Details</h3>
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
					<h3 class="flex items-center text-lg font-semibold"><ImageIcon class="mr-2 h-5 w-5" /> Image Creative Details</h3>
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
			{:else if creativeType === 'video'}
				<section class="space-y-4 rounded border p-4">
					<h3 class="flex items-center text-lg font-semibold"><VideoIcon class="mr-2 h-5 w-5" /> Video Creative Details</h3>
					<div>
						<Label for="videoUrl" class={formErrors.videoData?.videoUrl ? 'text-red-600' : ''}>Video URL (Optional)</Label>
						<Input id="videoUrl" name="videoUrl" type="url" bind:value={videoUrl} disabled={isSubmitting} class={formErrors.videoData?.videoUrl ? 'border-red-500' : ''} placeholder="https://youtube.com/watch?v=..." />
						{#if formErrors.videoData?.videoUrl}<p class="mt-1 text-sm text-red-600">{formErrors.videoData.videoUrl}</p>{/if}
					</div>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<Label for="videoPlatform" class={formErrors.videoData?.platform ? 'text-red-600' : ''}>Platform (Optional)</Label>
							<select id="videoPlatform" name="videoPlatform" bind:value={videoPlatform} disabled={isSubmitting} class={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${formErrors.videoData?.platform ? 'border-red-500' : ''}`}>
								<option value="">-- Select Platform --</option>
								{#each videoPlatforms as platformOption (platformOption)}
									<option value={platformOption}>{platformOption}</option>
								{/each}
							</select>
							{#if formErrors.videoData?.platform}<p class="mt-1 text-sm text-red-600">{formErrors.videoData.platform}</p>{/if}
						</div>
						<div>
							<Label for="videoDuration" class={formErrors.videoData?.duration ? 'text-red-600' : ''}>Duration (seconds, Optional)</Label>
							<Input id="videoDuration" name="videoDuration" type="number" bind:value={videoDuration} disabled={isSubmitting} class={formErrors.videoData?.duration ? 'border-red-500' : ''} />
							{#if formErrors.videoData?.duration}<p class="mt-1 text-sm text-red-600">{formErrors.videoData.duration}</p>{/if}
						</div>
					</div>

					<!-- Appeal Feature -->
					<div class="space-y-2">
						<CardSelector
							label="Appeal Feature (Optional)"
							id="videoAppealFeature"
							options={appealFeatures.map(f => ({ value: f, label: f }))}
							selectedValue={videoAppealFeature}
							onSelect={(value) => videoAppealFeature = value as AppealFeature}
							disabled={isSubmitting}
							error={!!formErrors.videoData?.appealFeature}
							gridCols="grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
						/>
						{#if formErrors.videoData?.appealFeature}<p class="mt-1 text-sm text-red-600">{formErrors.videoData.appealFeature}</p>{/if}
					</div>

					<!-- Stimulating Emotion -->
					<div class="space-y-2">
						<CardSelector
							label="Stimulating Emotion (Optional)"
							id="videoEmotion"
							options={videoEmotions.map(e => ({
								value: e,
								label: e,
								icon: e === 'Heartwarming' ? Heart :
									e === 'Anxious' ? Zap :
									e === 'Calm' ? Wind :
									e === 'Awe' ? Smile :
									e === 'Energetic' ? Zap :
									Brain
							}))}
							selectedValue={videoEmotion}
							onSelect={(value) => videoEmotion = value as VideoEmotion}
							disabled={isSubmitting}
							error={!!formErrors.videoData?.emotion}
							gridCols="grid-cols-2 sm:grid-cols-3"
						/>
						{#if formErrors.videoData?.emotion}<p class="mt-1 text-sm text-red-600">{formErrors.videoData.emotion}</p>{/if}
					</div>

					<!-- Video Template -->
					<div class="space-y-2">
						<CardSelector
							label="Video Template (Optional)"
							id="videoTemplateId"
							options={videoTemplatesList.map(t => ({
								value: t.id,
								label: t.name || t.templateCode || `Template ${t.id}`,
								previewUrl: t.previewUrl || undefined,
								description: t.templateCode ? `Code: ${t.templateCode}` : undefined
							}))}
							selectedValue={videoTemplateId}
							onSelect={(value) => videoTemplateId = value as number}
							disabled={isSubmitting || isLoadingDropdowns || videoTemplatesList.length === 0}
							error={!!formErrors.videoData?.templateId}
							gridCols="grid-cols-2 sm:grid-cols-3"
							cardClass="min-h-[100px]"
						/>
						{#if videoTemplatesList.length === 0 && !isLoadingDropdowns}<p class="mt-1 text-sm text-gray-500">No video templates available.</p>{/if}
						{#if formErrors.videoData?.templateId}<p class="mt-1 text-sm text-red-600">{formErrors.videoData.templateId}</p>{/if}
					</div>
				</section>
			{:else if creativeType === 'lp'}
				<section class="space-y-4 rounded border p-4">
					<h3 class="flex items-center text-lg font-semibold"><LinkIcon class="mr-2 h-5 w-5" /> Landing Page Creative Details</h3>
					<div>
						<Label for="lpPageUrl" class={formErrors.lpData?.pageUrl ? 'text-red-600' : ''}>Page URL *</Label>
						<Input id="lpPageUrl" name="lpPageUrl" type="url" required bind:value={lpPageUrl} disabled={isSubmitting} class={formErrors.lpData?.pageUrl ? 'border-red-500' : ''} placeholder="https://example.com/landing" />
						{#if formErrors.lpData?.pageUrl}<p class="mt-1 text-sm text-red-600">{formErrors.lpData.pageUrl}</p>{/if}
					</div>
					<div>
						<Label for="lpHeadline" class={formErrors.lpData?.headline ? 'text-red-600' : ''}>Headline (Optional)</Label>
						<Input id="lpHeadline" name="lpHeadline" type="text" maxlength={200} bind:value={lpHeadline} disabled={isSubmitting} class={formErrors.lpData?.headline ? 'border-red-500' : ''} />
						{#if formErrors.lpData?.headline}<p class="mt-1 text-sm text-red-600">{formErrors.lpData.headline}</p>{/if}
					</div>
					<div>
						<Label for="lpKeySections" class={formErrors.lpData?.keySections ? 'text-red-600' : ''}>Key Sections (JSON Array, Optional)</Label>
						<Textarea id="lpKeySections" name="lpKeySections" rows={4} bind:value={lpKeySections} disabled={isSubmitting} class={formErrors.lpData?.keySections ? 'border-red-500' : ''} placeholder='' />
						{#if formErrors.lpData?.keySections}<p class="mt-1 text-sm text-red-600">{formErrors.lpData.keySections}</p>{/if}
					</div>
				</section>
			{/if}

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
