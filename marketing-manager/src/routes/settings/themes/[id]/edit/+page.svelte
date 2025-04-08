<script lang="ts">
	import { page } from '$app/stores'; // Keep one import
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import ThemeForm from '$lib/components/settings/ThemeForm.svelte'; // Import shared form
	import type { ThemePayload, ThemeInputData } from '$lib/types/theme.types'; // Import types from types file
	import { AlertCircle, ArrowLeft } from 'lucide-svelte';

	// State
	let themeId = $derived($page.params.id);
	let initialFormData = $state<ThemeInputData | null>(null); // Store fetched data for the form
	let themeTitle = $state<string>(''); // Store title for display

	let isLoading = $state<boolean>(true);
	let loadError = $state<string | null>(null);
	let isSubmitting = $state<boolean>(false);
	let formErrors = $state<Record<string, any>>({});

	// Fetch existing theme data
	$effect(() => {
		async function loadThemeData() {
			if (!themeId) {
				loadError = 'Theme ID missing from URL.';
				isLoading = false;
				return;
			}
			isLoading = true;
			loadError = null;
			initialFormData = null; // Reset form data
			themeTitle = '';

			try {
				const response = await fetch(`/api/themes/${themeId}`);
				if (!response.ok) {
					if (response.status === 404) {
						throw new Error('Theme not found.');
					}
					throw new Error(`Failed to load theme data: ${response.statusText}`);
				}
				const themeData: ThemeInputData & { title: string } = await response.json();
				initialFormData = themeData; // Set data for the form
				themeTitle = themeData.title; // Store title

			} catch (e: any) {
				console.error("Error loading theme data:", e);
				loadError = e.message || "An unknown error occurred while loading theme data.";
			} finally {
				isLoading = false;
			}
		}
		loadThemeData();
	});

	// Handle form submission for update
	async function handleSubmit(payload: ThemePayload) {
		if (!themeId) return;

		isSubmitting = true;
		formErrors = {};
		loadError = null; // Clear load error on submit attempt

		try {
			const response = await fetch(`/api/themes/${themeId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			const result = await response.json();

			if (!response.ok) {
				if (response.status === 400 && result.errors) {
					formErrors = result.errors;
				} else {
					formErrors = { server: result.message || 'An unknown server error occurred.' };
				}
				console.error("Form Errors:", formErrors);
				return; // Stop on error
			}

			await goto('/settings/themes'); // Redirect back to the list on success

		} catch (e: any) {
			console.error('Theme update error:', e);
			formErrors = { server: 'Failed to submit update. Please check your connection.' };
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		goto('/settings/themes');
	}
</script>

<div class="container mx-auto max-w-2xl py-8">
	<div class="mb-6">
		<Button href="/settings/themes" variant="outline">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Themes
		</Button>
	</div>

	<h1 class="mb-6 text-2xl font-bold">Edit Theme {themeTitle ? `"${themeTitle}"` : `(ID: ${themeId})`}</h1>

	{#if isLoading}
		<p class="text-center">Loading theme data...</p>
	{:else if loadError}
		<div class="mb-4 flex items-center rounded border border-red-500 bg-red-50 p-3 text-sm text-red-700">
			<AlertCircle class="mr-2 h-4 w-4 flex-shrink-0" />
			<span>{loadError}</span>
		</div>
	{:else if initialFormData}
		<ThemeForm
			initialData={initialFormData}
			onSubmit={handleSubmit}
			onCancel={handleCancel}
			{isSubmitting}
			{formErrors}
		/>
	{:else}
		<!-- Should not happen if loading is done and no error, but handle anyway -->
		<p class="text-center text-red-600">Could not load theme data.</p>
	{/if}
</div>
