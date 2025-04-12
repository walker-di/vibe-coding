<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { AlertCircle, FileText, Image as ImageIcon, Video as VideoIcon, Link as LinkIcon, Brain } from 'lucide-svelte'; // Keep Brain for default emotion icon and AI button
	import CardSelector from '$lib/components/shared/CardSelector.svelte';
	import AiGenerationDialog from '$lib/components/shared/AiGenerationDialog.svelte'; // Import AI Dialog
	import { appealFeatures } from '$lib/constants';
	import type { CreativeType, VideoPlatform, VideoFormat, VideoEmotion, AppealFeature } from '$lib/constants';
	import { creativeTypes, videoPlatforms, videoFormats, videoEmotions } from '$lib/components/constants';
	import type { campaigns } from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';

	// --- Types for Props ---
	// Restore complex types
	type Campaign = Pick<InferSelectModel<typeof campaigns>, 'id' | 'name'>;
	type Theme = Pick<InferSelectModel<typeof themes>, 'id' | 'title'>;
	type VideoTemplate = Pick<InferSelectModel<typeof videoTemplates>, 'id' | 'name' | 'templateCode' | 'previewUrl'>;


	// --- Props ---
	let {
		personaId = null,
		productId = null,
		campaignsList = [],
		isLoadingDropdowns = false,
		dropdownError = null,
		onSubmit, // Required callback
		onCancel, // Required callback
		isSubmitting = false,
		formErrors = {},
		initialData = null
	} = $props<{
		personaId?: number | null;
		productId?: number | null;
		campaignsList?: Campaign[]; // Restore original type
		isLoadingDropdowns?: boolean;
		dropdownError?: string | null;
		onSubmit: (formData: Record<string, any>) => Promise<void>;
		onCancel: () => void;
		isSubmitting?: boolean;
		formErrors?: Record<string, any>;
		initialData?: Record<string, any> | null;
	}>();

	// --- AI Dialog State ---
	let showAiDialog = $state(false);

	// --- Internal Form State ---
	let name = $state(initialData?.name || '');
	let description = $state(initialData?.description || '');
	let selectedType = $state<CreativeType | ''>(initialData?.type || '');
	let selectedCampaignId = $state<number | ''>(initialData?.campaignId || '');
	let selectedThemeId = $state<any>(null);
	

	// Text Fields
	let textHeadline = $state(initialData?.textData?.headline || '');
	let textBody = $state(initialData?.textData?.body || '');
	let textCta = $state(initialData?.textData?.callToAction || '');
	let textAppealFeature = $state(initialData?.textData?.appealFeature || ''); // Added
	let textEmotion = $state(initialData?.textData?.emotion || ''); // Added
	let textPlatformNotes = $state(initialData?.textData?.platformNotes || ''); // Added

	// Image Fields
	let imageUrl = $state(initialData?.imageData?.imageUrl || '');
	let imageAltText = $state(initialData?.imageData?.altText || '');
	let imageAppealFeature = $state(initialData?.imageData?.appealFeature || ''); // Added
	let imageEmotion = $state(initialData?.imageData?.emotion || ''); // Added
	let imagePlatformNotes = $state(initialData?.imageData?.platformNotes || ''); // Added

	// Video Fields
	let videoUrl = $state(initialData?.videoData?.videoUrl || '');
	let videoPlatform = $state<VideoPlatform | ''>(initialData?.videoData?.platform || '');
	let videoFormat = $state<VideoFormat | ''>(initialData?.videoData?.format || '');
	let videoDuration = $state<number | ''>(initialData?.videoData?.duration || '');
	let videoAppealFeature = $state<AppealFeature | ''>(initialData?.videoData?.appealFeature || '');
	let videoEmotion = $state<VideoEmotion | ''>(initialData?.videoData?.emotion || '');
	

	// LP Fields
	let lpPageUrl = $state(initialData?.lpData?.pageUrl || '');
	let lpHeadline = $state(initialData?.lpData?.headline || '');
	let lpKeySections = $state(initialData?.lpData?.keySections ? JSON.stringify(initialData.lpData.keySections, null, 2) : '');
	let lpAppealFeature = $state(initialData?.lpData?.appealFeature || ''); // Added
	let lpEmotion = $state(initialData?.lpData?.emotion || ''); // Added
	let lpPlatformNotes = $state(initialData?.lpData?.platformNotes || ''); // Added

	// --- AI Generation Handler ---
	function handleAiGenerated(generatedData: any) {
		console.log("AI Generated Data Received:", generatedData);
		// Update common fields
		name = generatedData.name ?? name;
		description = generatedData.description ?? description;

		// Update type-specific fields, checking for existence
		if (generatedData.textData && selectedType === 'text') {
			textHeadline = generatedData.textData.headline ?? textHeadline;
			textBody = generatedData.textData.body ?? textBody;
			textCta = generatedData.textData.callToAction ?? textCta;
			textAppealFeature = generatedData.textData.appealFeature ?? textAppealFeature;
			textEmotion = generatedData.textData.emotion ?? textEmotion;
			textPlatformNotes = generatedData.textData.platformNotes ?? textPlatformNotes;
		}
		if (generatedData.imageData && selectedType === 'image') {
			imageUrl = generatedData.imageData.imageUrl ?? imageUrl;
			imageAltText = generatedData.imageData.altText ?? imageAltText;
			imageAppealFeature = generatedData.imageData.appealFeature ?? imageAppealFeature;
			imageEmotion = generatedData.imageData.emotion ?? imageEmotion;
			imagePlatformNotes = generatedData.imageData.platformNotes ?? imagePlatformNotes;
		}
		if (generatedData.videoData && selectedType === 'video') {
			videoUrl = generatedData.videoData.videoUrl ?? videoUrl;
			videoPlatform = generatedData.videoData.platform ?? videoPlatform;
			videoFormat = generatedData.videoData.format ?? videoFormat;
			videoDuration = generatedData.videoData.duration ?? videoDuration;
			videoAppealFeature = generatedData.videoData.appealFeature ?? videoAppealFeature;
			videoEmotion = generatedData.videoData.emotion ?? videoEmotion;
			// videoTemplateId is not generated by AI
		}
		if (generatedData.lpData && selectedType === 'lp') {
			lpPageUrl = generatedData.lpData.pageUrl ?? lpPageUrl;
			lpHeadline = generatedData.lpData.headline ?? lpHeadline;
			// Handle JSON string for keySections carefully
			if (generatedData.lpData.keySections) {
				try {
					// Attempt to format if it's valid JSON, otherwise keep as is
					const parsed = JSON.parse(generatedData.lpData.keySections);
					lpKeySections = JSON.stringify(parsed, null, 2);
				} catch {
					lpKeySections = generatedData.lpData.keySections; // Keep raw string if parsing fails
				}
			} else {
				lpKeySections = ''; // Clear if null/undefined
			}
			lpAppealFeature = generatedData.lpData.appealFeature ?? lpAppealFeature;
			lpEmotion = generatedData.lpData.emotion ?? lpEmotion;
			lpPlatformNotes = generatedData.lpData.platformNotes ?? lpPlatformNotes;
		}
	}

	// --- Effect to populate from initialData (if provided) ---
	$effect(() => {
		if (initialData) {
			// Re-assign state variables if initialData changes
			name = initialData.name || '';
			description = initialData.description || '';
			selectedType = initialData.type || '';
			selectedCampaignId = initialData.campaignId || '';
			
			textHeadline = initialData.textData?.headline || '';
			textBody = initialData.textData?.body || '';
			textCta = initialData.textData?.callToAction || '';
			textAppealFeature = initialData.textData?.appealFeature || ''; // Added
			textEmotion = initialData.textData?.emotion || ''; // Added
			textPlatformNotes = initialData.textData?.platformNotes || ''; // Added
			imageUrl = initialData.imageData?.imageUrl || '';
			imageAltText = initialData.imageData?.altText || '';
			imageAppealFeature = initialData.imageData?.appealFeature || ''; // Added
			imageEmotion = initialData.imageData?.emotion || ''; // Added
			imagePlatformNotes = initialData.imageData?.platformNotes || ''; // Added
			videoUrl = initialData.videoData?.videoUrl || '';
			videoPlatform = initialData.videoData?.platform || '';
			videoFormat = initialData.videoData?.format || '';
			videoDuration = initialData.videoData?.duration || '';
			videoAppealFeature = initialData.videoData?.appealFeature || '';
			videoEmotion = initialData.videoData?.emotion || '';
			
			lpPageUrl = initialData.lpData?.pageUrl || '';
			lpHeadline = initialData.lpData?.headline || '';
			lpKeySections = initialData.lpData?.keySections ? JSON.stringify(initialData.lpData.keySections, null, 2) : '';
			lpAppealFeature = initialData.lpData?.appealFeature || ''; // Added
			lpEmotion = initialData.lpData?.emotion || ''; // Added
			lpPlatformNotes = initialData.lpData?.platformNotes || ''; // Added
		}
	});

	// --- Internal Submit Handler ---
	function handleInternalSubmit() {
		// No need for event.preventDefault() explicitly here,
		// as calling an async function via onSubmit prop handles it.
		let localFormErrors: Record<string, any> = {};
		let parsingErrorOccurred = false;
		let typeSpecificPayload: Record<string, any> = {};

		const finalPayload: Record<string, any> = {
			name: name,
			description: description || null,
			type: selectedType,
			campaignId: selectedCampaignId || null,
			personaId: personaId, // Include personaId if provided by parent
			themeId: selectedThemeId || null,
		};

		if (!name) localFormErrors.name = 'Name is required.';
		if (!selectedType) localFormErrors.type = 'Creative Type is required.';

		switch (selectedType) {
			case 'text':
				if (!textBody) {
					if (!localFormErrors.textData) localFormErrors.textData = {};
					localFormErrors.textData.body = 'Body is required.';
				}
				typeSpecificPayload = {
					headline: textHeadline || null,
					body: textBody,
					callToAction: textCta || null,
					appealFeature: textAppealFeature || null, // Added
					emotion: textEmotion || null, // Added
					platformNotes: textPlatformNotes || null // Added
				};
				finalPayload.textData = typeSpecificPayload;
				break;
			case 'image':
				// Image URL is now optional, so no validation needed
				typeSpecificPayload = {
					imageUrl: imageUrl || null, // Convert empty string to null
					altText: imageAltText || null,
					appealFeature: imageAppealFeature || null, // Added
					emotion: imageEmotion || null, // Added
					platformNotes: imagePlatformNotes || null // Added
				};
				finalPayload.imageData = typeSpecificPayload;
				break;
			case 'video':
				typeSpecificPayload = {
					videoUrl: videoUrl || null, platform: videoPlatform || null, format: videoFormat || null,
					duration: videoDuration || null, appealFeature: videoAppealFeature || null,
					emotion: videoEmotion || null, templateId: videoTemplateId || null,
				};
				finalPayload.videoData = typeSpecificPayload;
				break;
			case 'lp':
				if (!lpPageUrl) {
					if (!localFormErrors.lpData) localFormErrors.lpData = {};
					localFormErrors.lpData.pageUrl = 'Page URL is required.';
				}
				let parsedKeySections = null;
				if (lpKeySections) {
					try {
						parsedKeySections = JSON.parse(lpKeySections);
					} catch (parseError: any) {
						if (!localFormErrors.lpData) localFormErrors.lpData = {};
					localFormErrors.lpData.keySections = 'Invalid JSON format for Key Sections.';
						parsingErrorOccurred = true;
					}
				}
				if (!parsingErrorOccurred) {
					typeSpecificPayload = {
						pageUrl: lpPageUrl,
						headline: lpHeadline || null,
						keySections: parsedKeySections,
						appealFeature: lpAppealFeature || null, // Added
						emotion: lpEmotion || null, // Added
						platformNotes: lpPlatformNotes || null // Added
					};
					finalPayload.lpData = typeSpecificPayload;
				}
				break;
		}

		if (Object.keys(localFormErrors).length > 0 || parsingErrorOccurred) {
			console.warn("Local validation errors:", localFormErrors);
			// Update parent's formErrors state - Parent needs to handle this
			// For now, we proceed to onSubmit, which will likely fail and set parent errors via API response.
		}

		onSubmit(finalPayload); // Call the parent's onSubmit handler
	}

	// --- Helper to gather current form data for AI ---
	function getCurrentFormDataForAI() {
		const data: Record<string, any> = {
			name,
			description,
			type: selectedType,
			campaignId: selectedCampaignId || null,
			themeId: selectedThemeId || null,
			personaId: personaId,
			// Include type-specific data only if the type matches
			textData: selectedType === 'text' ? { headline: textHeadline, body: textBody, callToAction: textCta, appealFeature: textAppealFeature, emotion: textEmotion, platformNotes: textPlatformNotes } : null,
			imageData: selectedType === 'image' ? { imageUrl, altText: imageAltText, appealFeature: imageAppealFeature, emotion: imageEmotion, platformNotes: imagePlatformNotes } : null,
			videoData: selectedType === 'video' ? { videoUrl, platform: videoPlatform, format: videoFormat, duration: videoDuration, appealFeature: videoAppealFeature, emotion: videoEmotion, templateId: videoTemplateId || null } : null,
			lpData: selectedType === 'lp' ? { pageUrl: lpPageUrl, headline: lpHeadline, keySections: lpKeySections, appealFeature: lpAppealFeature, emotion: lpEmotion, platformNotes: lpPlatformNotes } : null,
		};
		// Clean up null type-specific data
		if (!data.textData) delete data.textData;
		if (!data.imageData) delete data.imageData;
		if (!data.videoData) delete data.videoData;
		if (!data.lpData) delete data.lpData;
		return data;
	}

</script>

{#if formErrors.server}
	<div class="mb-4 flex items-center rounded border border-red-500 bg-red-50 p-3 text-sm text-red-700">
		<!-- Use AlertCircle if imported -->
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="mr-2 h-4 w-4 flex-shrink-0"><path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.557 13.004c1.155 1.994-.293 4.5-2.599 4.5H4.443c-2.306 0-3.753-2.506-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clip-rule="evenodd" /></svg>
		<span>{formErrors.server}</span>
	</div>
{/if}

<form onsubmit={handleInternalSubmit} class="space-y-6"> <!-- Corrected: Removed |preventDefault -->
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
	<div class="flex items-end gap-2">
		<div class="flex-grow">
			<Label for="name" class={formErrors.name ? 'text-red-600' : ''}>Creative Name *</Label>
			<Input id="name" name="name" type="text" required maxlength={150} bind:value={name} disabled={isSubmitting} class={formErrors.name ? 'border-red-500' : ''} placeholder="e.g., Summer Sale Ad Copy V1" />
			{#if formErrors.name}<p class="mt-1 text-sm text-red-600">{formErrors.name}</p>{/if}
		</div>
		<!-- AI Generation Button -->
		{#if productId && personaId && selectedType}
			<Button
				type="button"
				variant="outline"
				size="icon"
				onclick={() => showAiDialog = true}
				disabled={isSubmitting || !selectedType}
				title="Generate with AI"
			>
				<Brain class="h-4 w-4" />
			</Button>
		{/if}
	</div>
	<div>
		<Label for="description" class={formErrors.description ? 'text-red-600' : ''}>Description (Optional)</Label>
		<Textarea id="description" name="description" rows={3} bind:value={description} disabled={isSubmitting} class={formErrors.description ? 'border-red-500' : ''} />
		{#if formErrors.description}<p class="mt-1 text-sm text-red-600">{formErrors.description}</p>{/if}
	</div>

	<!-- Linking Fields (No Persona Selector Here) -->
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
			<!-- Added Text Appeal/Emotion/Platform -->
			<div class="space-y-2">
				<CardSelector
					label="Appeal Feature (Optional)"
					id="textAppealFeature"
					options={appealFeatures.map(f => ({ value: f, label: f }))}
					selectedValue={textAppealFeature}
					onSelect={(value) => textAppealFeature = value as AppealFeature}
					disabled={isSubmitting}
					error={!!formErrors.textData?.appealFeature}
					gridCols="grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
				/>
				{#if formErrors.textData?.appealFeature}<p class="mt-1 text-sm text-red-600">{formErrors.textData.appealFeature}</p>{/if}
			</div>
			<div class="space-y-2">
				<CardSelector
					label="Stimulating Emotion (Optional)"
					id="textEmotion"
					options={videoEmotions.map(e => ({ value: e, label: e, icon: Brain }))}
					selectedValue={textEmotion}
					onSelect={(value) => textEmotion = value as VideoEmotion}
					disabled={isSubmitting}
					error={!!formErrors.textData?.emotion}
					gridCols="grid-cols-2 sm:grid-cols-3"
				/>
				{#if formErrors.textData?.emotion}<p class="mt-1 text-sm text-red-600">{formErrors.textData.emotion}</p>{/if}
			</div>
			<div>
				<Label for="textPlatformNotes" class={formErrors.textData?.platformNotes ? 'text-red-600' : ''}>Platform Notes (Optional)</Label>
				<Textarea id="textPlatformNotes" name="textPlatformNotes" rows={2} bind:value={textPlatformNotes} disabled={isSubmitting} class={formErrors.textData?.platformNotes ? 'border-red-500' : ''} />
				{#if formErrors.textData?.platformNotes}<p class="mt-1 text-sm text-red-600">{formErrors.textData.platformNotes}</p>{/if}
			</div>
		</section>
	{:else if selectedType === 'image'}
		<section class="space-y-4 rounded border p-4">
			<h3 class="flex items-center text-lg font-semibold"><ImageIcon class="mr-2 h-5 w-5"/> Image Creative Details</h3>
			<div>
				<Label for="imageUrl" class={formErrors.imageData?.imageUrl ? 'text-red-600' : ''}>Image URL (Optional)</Label>
				<Input id="imageUrl" name="imageUrl" type="url" bind:value={imageUrl} disabled={isSubmitting} class={formErrors.imageData?.imageUrl ? 'border-red-500' : ''} placeholder="https://..." />
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
			<!-- Added Image Appeal/Emotion/Platform -->
			<div class="space-y-2">
				<CardSelector
					label="Appeal Feature (Optional)"
					id="imageAppealFeature"
					options={appealFeatures.map(f => ({ value: f, label: f }))}
					selectedValue={imageAppealFeature}
					onSelect={(value) => imageAppealFeature = value as AppealFeature}
					disabled={isSubmitting}
					error={!!formErrors.imageData?.appealFeature}
					gridCols="grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
				/>
				{#if formErrors.imageData?.appealFeature}<p class="mt-1 text-sm text-red-600">{formErrors.imageData.appealFeature}</p>{/if}
			</div>
			<div class="space-y-2">
				<CardSelector
					label="Stimulating Emotion (Optional)"
					id="imageEmotion"
					options={videoEmotions.map(e => ({ value: e, label: e, icon: Brain }))}
					selectedValue={imageEmotion}
					onSelect={(value) => imageEmotion = value as VideoEmotion}
					disabled={isSubmitting}
					error={!!formErrors.imageData?.emotion}
					gridCols="grid-cols-2 sm:grid-cols-3"
				/>
				{#if formErrors.imageData?.emotion}<p class="mt-1 text-sm text-red-600">{formErrors.imageData.emotion}</p>{/if}
			</div>
			<div>
				<Label for="imagePlatformNotes" class={formErrors.imageData?.platformNotes ? 'text-red-600' : ''}>Platform Notes (Optional)</Label>
				<Textarea id="imagePlatformNotes" name="imagePlatformNotes" rows={2} bind:value={imagePlatformNotes} disabled={isSubmitting} class={formErrors.imageData?.platformNotes ? 'border-red-500' : ''} />
				{#if formErrors.imageData?.platformNotes}<p class="mt-1 text-sm text-red-600">{formErrors.imageData.platformNotes}</p>{/if}
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
							icon: Brain // Simplified icon logic for debugging
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
					options={videoTemplatesList.map((t: VideoTemplate) => ({ // Explicitly type 't'
						value: t.id,
						label: t.name || t.templateCode || `Template ${t.id}`,
						previewUrl: t.previewUrl || undefined,
						description: t.templateCode ? `Code: ${t.templateCode}` : undefined
					}))}
					selectedValue={videoTemplateId}
					onSelect={(value) => videoTemplateId = value as number}
					disabled={isSubmitting || videoTemplatesList.length === 0}
					error={!!formErrors.videoData?.templateId}
					gridCols="grid-cols-2 sm:grid-cols-3"
					cardClass="min-h-[100px]"
				/>
				{#if videoTemplatesList.length === 0 && !isLoadingDropdowns}<p class="mt-1 text-sm text-gray-500">No video templates available.</p>{/if}
				{#if formErrors.videoData?.templateId}<p class="mt-1 text-sm text-red-600">{formErrors.videoData.templateId}</p>{/if}
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
				<Textarea id="lpKeySections" name="lpKeySections" rows={4} bind:value={lpKeySections} disabled={isSubmitting} class={formErrors.lpData?.keySections ? 'border-red-500' : ''} placeholder='' />
				{#if formErrors.lpData?.keySections}<p class="mt-1 text-sm text-red-600">{formErrors.lpData.keySections}</p>{/if}
			</div>
			<!-- Added LP Appeal/Emotion/Platform -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<Label for="lpAppealFeature" class={formErrors.lpData?.appealFeature ? 'text-red-600' : ''}>Appeal Feature (Optional)</Label>
					<Input id="lpAppealFeature" name="lpAppealFeature" type="text" maxlength={150} bind:value={lpAppealFeature} disabled={isSubmitting} class={formErrors.lpData?.appealFeature ? 'border-red-500' : ''} />
					{#if formErrors.lpData?.appealFeature}<p class="mt-1 text-sm text-red-600">{formErrors.lpData.appealFeature}</p>{/if}
				</div>
				<div>
					<Label for="lpEmotion" class={formErrors.lpData?.emotion ? 'text-red-600' : ''}>Stimulating Emotion (Optional)</Label>
					<Input id="lpEmotion" name="lpEmotion" type="text" maxlength={100} bind:value={lpEmotion} disabled={isSubmitting} class={formErrors.lpData?.emotion ? 'border-red-500' : ''} />
					{#if formErrors.lpData?.emotion}<p class="mt-1 text-sm text-red-600">{formErrors.lpData.emotion}</p>{/if}
				</div>
			</div>
			<div>
				<Label for="lpPlatformNotes" class={formErrors.lpData?.platformNotes ? 'text-red-600' : ''}>Platform Notes (Optional)</Label>
				<Textarea id="lpPlatformNotes" name="lpPlatformNotes" rows={2} bind:value={lpPlatformNotes} disabled={isSubmitting} class={formErrors.lpData?.platformNotes ? 'border-red-500' : ''} />
				{#if formErrors.lpData?.platformNotes}<p class="mt-1 text-sm text-red-600">{formErrors.lpData.platformNotes}</p>{/if}
			</div>
		</section>
	{/if}


	<!-- Actions -->
	<!-- Actions -->
	<div class="flex justify-end gap-2 pt-4">
		<Button type="button" onclick={onCancel} variant="outline" disabled={isSubmitting}>Cancel</Button>
		<Button type="submit" disabled={isSubmitting || !selectedType}>
			{#if isSubmitting}
				Submitting...
				<!-- TODO: Add spinner icon -->
			{:else}
				Submit Creative
			{/if}
		</Button>
	</div>
</form>

<!-- AI Generation Dialog -->
{#if productId && personaId}
<AiGenerationDialog
	bind:open={showAiDialog}
	apiUrl={`/api/products/${productId}/personas/${personaId}/creatives/generate`}
	currentData={getCurrentFormDataForAI()}
	onGenerated={handleAiGenerated}
	dialogTitle="Generate Creative Content"
	dialogDescription="Provide instructions for the AI to generate or refine the creative details based on the selected type, product, and persona."
	instructionPlaceholder="e.g., Write ad copy focusing on [feature] for young professionals. Make it exciting!"
	disabled={!selectedType}
/>
{/if}
