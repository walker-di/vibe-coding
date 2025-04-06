<script lang="ts">
	import { page } from '$app/stores';
	import ProjectEditorLayout from '$lib/components/ProjectEditorLayout.svelte';
	import MediaLibrary from '$lib/components/MediaLibrary.svelte';
	import MediaUpload from '$lib/components/MediaUpload.svelte';
	import TimelineEditor from '$lib/components/TimelineEditor.svelte'; // Import TimelineEditor
	import type { MediaItem, Timeline } from '$lib/types'; // Import Timeline type

	let projectId = $state('');
	let mediaItems = $state<MediaItem[]>([]);
	let isLoadingMedia = $state(true);
	let isLoadingTimeline = $state(true); // Separate loading state for timeline
	let mediaError = $state<string | null>(null);
	let timelineError = $state<string | null>(null); // Separate error state for timeline
	let projectName = $state('Loading...'); // Add state for project name
	let projectTimeline = $state<Timeline | undefined>(undefined); // State for timeline data (use undefined)

	// Fetch media and project details when projectId changes
	$effect(() => {
		const currentProjectId = $page.params.projectId;
		if (currentProjectId && currentProjectId !== projectId) {
			projectId = currentProjectId;
			// Reset state while loading new project data
			mediaItems = [];
			projectTimeline = undefined; // Reset timeline to undefined
			projectName = 'Loading...';
			isLoadingMedia = true;
			isLoadingTimeline = true;
			mediaError = null;
			timelineError = null;
			// Fetch project data (media and timeline)
			fetchProjectData(projectId);
		} else if (!currentProjectId) {
			projectId = '';
			mediaItems = [];
			projectTimeline = undefined; // Reset timeline to undefined
			projectName = 'Error';
			mediaError = 'Project ID not found in URL.';
			isLoadingMedia = false;
			isLoadingTimeline = false;
		}
	});

	async function fetchProjectData(id: string) {
		if (!id) return;
		isLoadingMedia = true;
		isLoadingTimeline = true;
		mediaError = null;
		timelineError = null;

		try {
			// Fetch project details (placeholder)
			projectName = `Project ${id.substring(0, 8)}...`;

			// Fetch media and timeline in parallel
			const [mediaResult, timelineResult] = await Promise.allSettled([
				fetch(`/api/projects/${id}/media`),
				fetch(`/api/projects/${id}/timeline`)
			]);

			// Process media result
			if (mediaResult.status === 'fulfilled') {
				const response = mediaResult.value;
				if (!response.ok) {
					const errorText = await response.text();
					throw new Error(`Media fetch failed: ${response.status} - ${errorText}`);
				}
				const fetchedMedia = await response.json();
				mediaItems = fetchedMedia.map((item: any) => ({
					id: item.id,
					projectId: item.projectId,
					name: item.name,
					type: item.type,
					sourcePath: item.sourcePath,
					duration: item.duration,
					uploadedAt: item.uploadedAt
				}));
			} else {
				console.error('Failed to fetch media:', mediaResult.reason);
				mediaError = mediaResult.reason instanceof Error ? mediaResult.reason.message : 'Failed to load media.';
				mediaItems = [];
			}

			// Process timeline result
			if (timelineResult.status === 'fulfilled') {
				const response = timelineResult.value;
				if (!response.ok) {
					// 404 might be acceptable if timeline hasn't been created yet
					if (response.status !== 404) {
						const errorText = await response.text();
						throw new Error(`Timeline fetch failed: ${response.status} - ${errorText}`);
					} else {
						projectTimeline = undefined; // No timeline saved yet (use undefined)
					}
				} else {
					const fetchedTimelineData = await response.json();
					// Add basic validation if needed
					projectTimeline = fetchedTimelineData.timeline; // API returns { timeline: ... }
				}
			} else {
				console.error('Failed to fetch timeline:', timelineResult.reason);
				timelineError = timelineResult.reason instanceof Error ? timelineResult.reason.message : 'Failed to load timeline.';
				projectTimeline = undefined; // Reset timeline to undefined
			}

		} catch (e) {
			console.error(`Failed to fetch data for project ${id}:`, e);
			// Set a general error if specific ones weren't caught
			const errorMsg = e instanceof Error ? e.message : 'Failed to load project data.';
			if (!mediaError) mediaError = errorMsg;
			if (!timelineError) timelineError = errorMsg;
			// Reset states on general error
			mediaItems = [];
			projectTimeline = undefined; // Reset timeline to undefined
			projectName = 'Error Loading Project';
		} finally {
			isLoadingMedia = false;
			isLoadingTimeline = false;
		}
	}
/* Original fetchProjectData - replaced with parallel fetching above
	async function fetchProjectData(id: string) {
		if (!id) return;
		isLoadingMedia = true; // Use this state for combined loading
		mediaError = null;
		try {
			// Fetch project details (assuming GET /api/projects/:id exists or will be added)
			// For now, we'll just fetch media and use ID in header
			// const projectResponse = await fetch(`/api/projects/${id}`);
			// if (!projectResponse.ok) throw new Error('Failed to load project details');
			// const projectDetails = await projectResponse.json();
			// projectName = projectDetails.name;
			projectName = `Project ${id.substring(0, 8)}...`; // Placeholder name

			// Fetch media
			const mediaResponse = await fetch(`/api/projects/${id}/media`);
			if (!mediaResponse.ok) {
				const errorText = await mediaResponse.text();
				throw new Error(`HTTP error! status: ${mediaResponse.status} - ${errorText}`);
			}
			// Ensure the fetched data matches MediaItem structure
			const fetchedMedia = await mediaResponse.json();
			// Basic validation/mapping if needed:
			mediaItems = fetchedMedia.map((item: any) => ({
				id: item.id,
				projectId: item.projectId,
				name: item.name,
				type: item.type,
				sourcePath: item.sourcePath,
				duration: item.duration,
				uploadedAt: item.uploadedAt
			}));

		} catch (e) {
			console.error(`Failed to fetch data for project ${id}:`, e);
			mediaError = e instanceof Error ? e.message : 'Failed to load project data.';
			mediaItems = [];
			projectName = 'Error Loading Project';
		} finally {
			isLoadingMedia = false;
		}
	}
*/

	async function handleFilesSelected(files: FileList) {
		if (!projectId) {
			alert('Cannot upload: Project ID is missing.');
			return;
		}
		if (!files || files.length === 0) {
			return;
		}

		const formData = new FormData();
		for (let i = 0; i < files.length; i++) {
			formData.append('files', files[i]);
		}

		isLoadingMedia = true; // Indicate activity

		try {
			const response = await fetch(`/api/projects/${projectId}/media`, {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Upload failed: ${response.status} ${errorText}`);
			}
			await fetchProjectData(projectId); // Refresh data
		} catch (e) {
			console.error('Error uploading files:', e);
			mediaError = `Upload error: ${e instanceof Error ? e.message : 'Unknown error'}`;
			isLoadingMedia = false; // Reset loading on error if fetchProjectData isn't called
		}
		// isLoadingMedia is reset in fetchProjectData's finally block
	}

	function handleMediaSelect(item: MediaItem) {
		console.log('Media selected:', item);
		// TODO: Implement logic
	}

	// --- Debounce Utility ---
	function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
		let timeoutId: ReturnType<typeof setTimeout> | null = null;
		return (...args: Parameters<T>) => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
			timeoutId = setTimeout(() => {
				func(...args);
			}, wait);
		};
	}

	// --- Save Timeline Logic ---
	let isSaving = $state(false);
	let saveError = $state<string | null>(null);

	async function saveTimeline(timelineToSave: Timeline | undefined) {
		if (!projectId || !timelineToSave) {
			console.log('Skipping save: No project ID or timeline data.');
			return; // Don't save if no project ID or timeline is undefined/null
		}

		isSaving = true;
		saveError = null;
		console.log('Attempting to save timeline...');

		try {
			const response = await fetch(`/api/projects/${projectId}/timeline`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(timelineToSave) // Send the timeline data directly
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Save failed: ${response.status} - ${errorText}`);
			}

			const result = await response.json();
			console.log('Timeline saved successfully:', result.message);

		} catch (e) {
			console.error('Error saving timeline:', e);
			saveError = e instanceof Error ? e.message : 'Failed to save timeline.';
		} finally {
			isSaving = false;
		}
	}

	// Debounced version of the save function
	const debouncedSaveTimeline = debounce(saveTimeline, 1500); // Wait 1.5 seconds after last change

	// Effect to automatically save timeline when it changes
	$effect(() => {
		// Avoid saving during initial load or if timeline is still undefined
		if (!isLoadingTimeline && projectTimeline !== undefined) {
			// We need to capture the current value of projectTimeline for the debounced function
			const currentTimelineValue = projectTimeline;
			debouncedSaveTimeline(currentTimelineValue);
		}
	});

</script>

<ProjectEditorLayout>
	<!-- Pass content via named snippets -->
	{#snippet headerPanel()}
		<span class="navbar-brand mb-0 h1">Editing: {projectName}</span>
		{#if isSaving}
			<span class="badge bg-info ms-2">Saving...</span>
		{/if}
		{#if saveError}
			<span class="badge bg-danger ms-2" title={saveError}>Save Error!</span>
		{/if}
		<!-- Add other header controls later -->
	{/snippet}

	{#snippet mediaPanel()}
		<div class="p-2 border-bottom">
			<h6>Media Library</h6>
		</div>
		<div class="flex-grow-1 p-2 overflow-auto">
			{#if isLoadingMedia && mediaItems.length === 0} <!-- Show loading only initially -->
				<p>Loading media...</p>
			{:else if mediaError}
				<div class="alert alert-warning alert-sm p-1" role="alert">{mediaError}</div>
				<MediaLibrary mediaItems={[]} onMediaSelect={handleMediaSelect}/> <!-- Pass handler -->
			{:else}
				<MediaLibrary {mediaItems} onMediaSelect={handleMediaSelect} /> <!-- Pass handler -->
			{/if}
		</div>
		<div class="p-2 border-top">
			<MediaUpload onFilesSelected={handleFilesSelected} accept="video/*,audio/*" /> <!-- Pass handler -->
		</div>
	{/snippet}

	{#snippet previewPanel()}
		<!-- Placeholder -->
		<p>Preview Window Area</p>
	{/snippet}

	{#snippet timelinePanel()}
		{#if isLoadingTimeline}
			<p>Loading timeline...</p>
		{:else if timelineError}
			<div class="alert alert-warning alert-sm p-1" role="alert">{timelineError}</div>
			<!-- Optionally render editor with default/empty state on error -->
			<TimelineEditor />
		{:else}
			<!-- Bind projectTimeline to the editor's timeline prop -->
			<TimelineEditor bind:timeline={projectTimeline} />
		{/if}
	{/snippet}

</ProjectEditorLayout>

<style>
	/* Page-specific styles if needed */
	.alert-sm {
		font-size: 0.8rem;
	}
</style>
