<script lang="ts">
	import { goto } from '$app/navigation';
	// Removed duplicate Button import
	import { Button } from '$lib/components/ui/button';
	import { AlertCircle } from 'lucide-svelte'; // Keep AlertCircle
	// Import types needed for dropdown data
	import type { campaigns, personas, themes, videoTemplates } from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';
	import CreativeForm from '$lib/components/creatives/CreativeForm.svelte'; // Import the new form component


	// --- Types ---
	type Campaign = Pick<InferSelectModel<typeof campaigns>, 'id' | 'name'>;
	type Persona = Pick<InferSelectModel<typeof personas>, 'id' | 'name'>;
	type Theme = Pick<InferSelectModel<typeof themes>, 'id' | 'title'>;
	// Need more fields for CardSelector options (used by CreativeForm)
	type VideoTemplate = Pick<InferSelectModel<typeof videoTemplates>, 'id' | 'name' | 'templateCode' | 'previewUrl'>;


	// --- State ---
	// Keep only state needed for this page: dropdown data and UI state
	// Form field state is now managed within CreativeForm.svelte

	// Dropdown Data
	let campaignsList = $state<Campaign[]>([]);
	// Personas list is fetched but not passed to the form component in this route
	let personasList = $state<Persona[]>([]); // Keep fetching for now, might remove later if truly unused
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
	// This function now receives the payload from the CreativeForm component
	async function handleSubmit(formData: Record<string, any>) {
		isSubmitting = true;
		formErrors = {}; // Clear previous errors

		// Note: formData already contains type-specific data nested correctly
		// and includes personaId (which will be null from this route)

		try {
			const response = await fetch('/api/creatives', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData) // Send the data received from the component
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

	<!-- Use the CreativeForm component -->
	<CreativeForm
		{campaignsList}
		{themesList}
		{videoTemplatesList}
		{isLoadingDropdowns}
		{dropdownError}
		onSubmit={handleSubmit}
		onCancel={() => goto('/creatives')}
		isSubmitting={isSubmitting}
		formErrors={formErrors}
		personaId={null}
		productId={null}
	/>
</div>
