<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { AlertCircle, FileText, Image as ImageIcon, Video as VideoIcon, Link as LinkIcon } from 'lucide-svelte';
	// Import videoEmotions enum directly
	import { campaigns as campaignsTable, personas as personasTable, themes as themesTable, videoTemplates as videoTemplatesTable, creativeTypes as creativeTypesEnum, videoPlatforms, videoFormats, videoEmotions } from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';

	// --- Types ---
	type Campaign = Pick<InferSelectModel<typeof campaignsTable>, 'id' | 'name'>;
	type Persona = Pick<InferSelectModel<typeof personasTable>, 'id' | 'name'>;
	type Theme = Pick<InferSelectModel<typeof themesTable>, 'id' | 'title'>;
	type VideoTemplate = Pick<InferSelectModel<typeof videoTemplatesTable>, 'id' | 'name' | 'templateCode'>;
	const creativeTypes = ['text', 'image', 'video', 'lp'] as const;
	type CreativeType = typeof creativeTypes[number];

	// --- State ---
	// Common Fields
	let name = $state('');
	let description = $state('');
	let selectedType = $state<CreativeType | ''>('');
	let selectedCampaignId = $state<number | ''>('');
	let selectedPersonaId = $state<number | ''>('');
	let selectedThemeId = $state<number | ''>('');

	// Text Fields
	let textHeadline = $state('');
	let textBody = $state('');
	let textCta = $state('');

	// Image Fields
	let imageUrl = $state('');
	let imageAltText = $state('');

	// Video Fields (Placeholders)
	let videoUrl = $state('');
	let videoPlatform = $state<typeof videoPlatforms[number] | ''>('');
	let videoFormat = $state<typeof videoFormats[number] | ''>('');
	let videoDuration = $state<number | ''>('');
	let videoAppealFeature = $state(''); // Keep as string for now, could be enum later
	let videoEmotion = $state<typeof videoEmotions[number] | ''>('');
	let videoTemplateId = $state<number | ''>('');

	// Options for Video Fields
	const appealFeatures = ['Product Feature Focus', 'Benefit Focus', 'Problem/Solution', 'Testimonial/Social Proof', 'Comparison', 'Storytelling', 'Humor', 'Educational'] as const; // Example options

	// LP Fields (Placeholders)
	let lpPageUrl = $state('');
	let lpHeadline = $state('');
	let lpKeySections = $state('');

	// Dropdown Data
	let campaignsList = $state<Campaign[]>([]);
	let personasList = $state<Persona[]>([]);
	let themesList = $state<Theme[]>([]);
	let videoTemplatesList = $state<VideoTemplate[]>([]);

	// UI State
	let isLoadingDropdowns = $state(true);
	let dropdownError = $state<string | null>(null);
	let isSubmitting = $state(false);
	let formErrors = $state<Record<string, any>>({});

	// --- Data Fetching for Dropdowns ---
	$effect(() => {
		async function fetchDropdownData() {
			isLoadingDropdowns = true;
			dropdownError = null;
			try {
				const [campaignsRes, personasRes, themesRes, videoTemplatesRes] = await Promise.all([
					fetch('/api/campaigns'),
					fetch('/api/personas'),
					fetch('/api/themes'),
					fetch('/api/video-templates')
				]);

				if (!campaignsRes.ok) throw new Error(`Failed to load campaigns (${campaignsRes.status})`);
				if (!personasRes.ok) throw new Error(`Failed to load personas (${personasRes.status})`);
				if (!themesRes.ok) throw new Error(`Failed to load themes (${themesRes.status})`);
				if (!videoTemplatesRes.ok) throw new Error(`Failed to load video templates (${videoTemplatesRes.status})`);

				campaignsList = await campaignsRes.json();
				personasList = await personasRes.json();
				themesList = await themesRes.json();
				videoTemplatesList = await videoTemplatesRes.json();

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
		let parsingErrorOccurred = false;
		let typeSpecificPayload: Record<string, any> = {};

		const finalPayload: Record<string, any> = {
			name: name,
			description: description || null,
			type: selectedType,
			campaignId: selectedCampaignId || null,
			personaId: selectedPersonaId || null,
			themeId: selectedThemeId || null,
		};

		switch (selectedType) {
			case 'text':
				typeSpecificPayload = {
					headline: textHeadline || null,
					body: textBody,
					callToAction: textCta || null
				};
				finalPayload.textData = typeSpecificPayload;
				break;
			case 'image':
				typeSpecificPayload = {
					imageUrl: imageUrl,
					altText: imageAltText || null
				};
				finalPayload.imageData = typeSpecificPayload;
				break;
			case 'video':
				typeSpecificPayload = {
					videoUrl: videoUrl || null,
					platform: videoPlatform || null,
					format: videoFormat || null,
					duration: videoDuration || null,
					appealFeature: videoAppealFeature || null,
					emotion: videoEmotion || null,
					templateId: videoTemplateId || null,
				};
				finalPayload.videoData = typeSpecificPayload;
				break;
			case 'lp':
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
					typeSpecificPayload = {
						pageUrl: lpPageUrl,
						headline: lpHeadline || null,
						keySections: parsedKeySections
					};
					finalPayload.lpData = typeSpecificPayload;
				}
				break;
		}

		if (parsingErrorOccurred) {
			isSubmitting = false;
			return;
		}

		try {
			const response = await fetch('/api/creatives', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(finalPayload)
			});

			const result = await response.json();

			if (!response.ok) {
				if (response.status === 400 && result.errors) {
					formErrors = result.errors;
				} else {
					formErrors = { server: result.message || 'An unknown server error occurred.' };
				}
				console.log("Form Errors:", formErrors);
				return;
			}

			await goto('/creatives');

		} catch (e: any) {
			console.error('Creative submission error:', e);
			formErrors = { server: 'Failed to submit form. Please check your connection or review server logs.' };
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
				{#each creativeTypes as typeOption (typeOption)}
					<option value={typeOption}>{typeOption.charAt(0).toUpperCase() + typeOption.slice(1)}</option>
				{/each}
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
		{:else if selectedType === 'video'}
			<section class="space-y-4 rounded border p-4">
				<h3 class="flex items-center text-lg font-semibold"><VideoIcon class="mr-2 h-5 w-5"/> Video Creative Details</h3>
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
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<Label for="videoAppealFeature" class={formErrors.videoData?.appealFeature ? 'text-red-600' : ''}>Appeal Feature (Optional)</Label>
						<select id="videoAppealFeature" name="videoAppealFeature" bind:value={videoAppealFeature} disabled={isSubmitting} class={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${formErrors.videoData?.appealFeature ? 'border-red-500' : ''}`}>
							<option value="">-- Select Appeal --</option>
							{#each appealFeatures as feature (feature)}
								<option value={feature}>{feature}</option>
							{/each}
						</select>
						{#if formErrors.videoData?.appealFeature}<p class="mt-1 text-sm text-red-600">{formErrors.videoData.appealFeature}</p>{/if}
					</div>
					<div>
						<Label for="videoEmotion" class={formErrors.videoData?.emotion ? 'text-red-600' : ''}>Stimulating Emotion (Optional)</Label>
						<select id="videoEmotion" name="videoEmotion" bind:value={videoEmotion} disabled={isSubmitting} class={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${formErrors.videoData?.emotion ? 'border-red-500' : ''}`}>
							<option value="">-- Select Emotion --</option>
							{#each videoEmotions as emotionOption (emotionOption)}
								<option value={emotionOption}>{emotionOption}</option>
							{/each}
						</select>
						{#if formErrors.videoData?.emotion}<p class="mt-1 text-sm text-red-600">{formErrors.videoData.emotion}</p>{/if}
					</div>
				</div>
				<div>
					<Label for="videoTemplateId" class={formErrors.videoData?.templateId ? 'text-red-600' : ''}>Video Template (Optional)</Label>
					<select id="videoTemplateId" name="videoTemplateId" bind:value={videoTemplateId} disabled={isSubmitting || videoTemplatesList.length === 0} class={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${formErrors.videoData?.templateId ? 'border-red-500' : ''}`}>
						<option value="">-- None --</option>
						{#each videoTemplatesList as template (template.id)}
							<option value={template.id}>{template.name || template.templateCode}</option>
						{/each}
					</select>
					{#if videoTemplatesList.length === 0 && !isLoadingDropdowns}<p class="mt-1 text-sm text-gray-500">No video templates available.</p>{/if}
				</div>
			</section>
		{:else if selectedType === 'lp'}
			<section class="space-y-4 rounded border p-4">
				<h3 class="flex items-center text-lg font-semibold"><LinkIcon class="mr-2 h-5 w-5"/> Landing Page Creative Details</h3>
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
					<Textarea id="lpKeySections" name="lpKeySections" rows={4} bind:value={lpKeySections} disabled={isSubmitting} class={formErrors.lpData?.keySections ? 'border-red-500' : ''} placeholder='[{"title": "Hero"}, {"title": "Features"}]' />
					{#if formErrors.lpData?.keySections}<p class="mt-1 text-sm text-red-600">{formErrors.lpData.keySections}</p>{/if}
				</div>
			</section>
		{/if}


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
