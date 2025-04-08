<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { AlertCircle, ArrowLeft } from 'lucide-svelte';
	// Import types
	import type {
		creatives as creativesTable,
		campaigns as campaignsTable,
		personas as personasTable,
		themes as themesTable,
		videoTemplates as videoTemplatesTable,
		creativeText as creativeTextTable,
		creativeImage as creativeImageTable,
		creativeVideo as creativeVideoTable,
		creativeLp as creativeLpTable
	} from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';
	import CreativeForm from '$lib/components/creatives/CreativeForm.svelte'; // Import shared form

	// --- Types ---
	type Campaign = Pick<InferSelectModel<typeof campaignsTable>, 'id' | 'name'>;
	type Persona = Pick<InferSelectModel<typeof personasTable>, 'id' | 'name'>;
	type Theme = Pick<InferSelectModel<typeof themesTable>, 'id' | 'title'>;
	type VideoTemplate = Pick<InferSelectModel<typeof videoTemplatesTable>, 'id' | 'name' | 'templateCode' | 'previewUrl'>;

	// Type for the data fetched initially
	type CreativeEditData = InferSelectModel<typeof creativesTable> & {
		textData: InferSelectModel<typeof creativeTextTable> | null;
		imageData: InferSelectModel<typeof creativeImageTable> | null;
		videoData: InferSelectModel<typeof creativeVideoTable> | null;
		lpData: InferSelectModel<typeof creativeLpTable> | null;
	};

	// --- State ---
	let creativeId: number | null = null;

	// Dropdown Data
	let campaignsList = $state<Campaign[]>([]);
	let personasList = $state<Persona[]>([]); // Still fetched, though not used by CreativeForm here
	let themesList = $state<Theme[]>([]);
	let videoTemplatesList = $state<VideoTemplate[]>([]);

	// UI State
	let isLoading = $state(true);
	let isLoadingDropdowns = $state(true);
	let dropdownError = $state<string | null>(null);
	let isSubmitting = $state(false);
	let formErrors = $state<Record<string, any>>({});
	let fetchError = $state<string | null>(null);
	let initialFormData = $state<CreativeEditData | null>(null);

	// --- Data Fetching ---
	$effect(() => {
		const idParam = $page.params.id;
		const parsedCreativeId = parseInt(idParam, 10);
		creativeId = isNaN(parsedCreativeId) ? null : parsedCreativeId;

		async function loadInitialData() {
			isLoading = true;
			isLoadingDropdowns = true;
			fetchError = null;
			dropdownError = null;
			formErrors = {};
			initialFormData = null;

			if (!creativeId) {
				fetchError = 'Invalid Creative ID';
				isLoading = false;
				isLoadingDropdowns = false;
				return;
			}

			try {
				const [creativeRes, campaignsRes, personasRes, themesRes, videoTemplatesRes] = await Promise.all([
					fetch(`/api/creatives/${creativeId}`),
					fetch('/api/campaigns'),
					fetch('/api/personas'),
					fetch('/api/themes'),
					fetch('/api/video-templates')
				]);

				let dropdownFetchError = null;
				if (!campaignsRes.ok) dropdownFetchError = `Failed to load campaigns (${campaignsRes.status})`;
				if (!personasRes.ok) dropdownFetchError = `Failed to load personas (${personasRes.status})`;
				if (!themesRes.ok) dropdownFetchError = `Failed to load themes (${themesRes.status})`;
				if (!videoTemplatesRes.ok) dropdownFetchError = `Failed to load video templates (${videoTemplatesRes.status})`;

				if (dropdownFetchError) {
					throw new Error(dropdownFetchError);
				}

				campaignsList = await campaignsRes.json();
				personasList = await personasRes.json();
				themesList = await themesRes.json();
				videoTemplatesList = await videoTemplatesRes.json();
				isLoadingDropdowns = false;

				if (creativeRes.status === 404) throw new Error('Creative not found');
				if (!creativeRes.ok) {
					const errResult = await creativeRes.json().catch(() => ({}));
					throw new Error(errResult.message || `HTTP error! status: ${creativeRes.status}`);
				}

				const data: CreativeEditData = await creativeRes.json();
				initialFormData = data;

			} catch (e: any) {
				console.error('Failed to load edit data:', e);
				if (isLoadingDropdowns) {
					dropdownError = e.message || 'Failed to load dropdown data.';
				} else {
					fetchError = e.message || 'Failed to load creative data.';
				}
			} finally {
				isLoading = false;
				isLoadingDropdowns = false;
			}
		}

		loadInitialData();
	});

	// --- Form Submission ---
	async function handleSubmit(formData: Record<string, any>) {
		if (!creativeId) return;

		isSubmitting = true;
		formErrors = {};
		fetchError = null;

		try {
			const response = await fetch(`/api/creatives/${creativeId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData)
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

			await goto(`/creatives/${creativeId}`);

		} catch (e: any) {
			console.error('Creative update error:', e);
			formErrors = { server: 'Failed to submit form. Please check your connection.' };
		} finally {
			isSubmitting = false;
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
		</div>
	{:else if fetchError}
		<div class="flex flex-col items-center justify-center rounded border border-dashed border-red-500 bg-red-50 p-12 text-center text-red-700">
			<AlertCircle class="mb-2 h-8 w-8" />
			<h3 class="text-xl font-semibold">Error Loading Data</h3>
			<p class="mb-4 text-sm">{fetchError}</p>
			<Button href="/creatives" variant="outline">Go To Creatives List</Button>
		</div>
	{:else if initialFormData}
		{#if formErrors.server}
			<div class="mb-4 flex items-center rounded border border-red-500 bg-red-50 p-3 text-sm text-red-700">
				<AlertCircle class="mr-2 h-4 w-4 flex-shrink-0" />
				<span>{formErrors.server}</span>
			</div>
		{/if}

		<CreativeForm
			initialData={initialFormData}
			{campaignsList}
			{themesList}
			{videoTemplatesList}
			{isLoadingDropdowns}
			{dropdownError}
			onSubmit={handleSubmit}
			onCancel={() => goto(`/creatives/${creativeId ?? ''}`)}
			isSubmitting={isSubmitting}
			formErrors={formErrors}
			personaId={null}
			productId={null}
		/>
	{:else}
		<div class="flex justify-center p-12">
			<p>Creative data not available.</p>
		</div>
	{/if}
</div>
