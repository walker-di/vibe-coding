<script lang="ts">
	import { page } from '$app/stores';
	import ProjectEditorLayout from '$lib/components/ProjectEditorLayout.svelte';
	import MediaLibrary from '$lib/components/MediaLibrary.svelte';
	import MediaUpload from '$lib/components/MediaUpload.svelte';
	import type { MediaItem } from '$lib/types'; // Import the newly defined type

	let projectId = $state('');
	let mediaItems = $state<MediaItem[]>([]);
	let isLoadingMedia = $state(true);
	let mediaError = $state<string | null>(null);
	let projectName = $state('Loading...'); // Add state for project name

	// Fetch media and project details when projectId changes
	$effect(() => {
		const currentProjectId = $page.params.projectId;
		if (currentProjectId && currentProjectId !== projectId) {
			projectId = currentProjectId;
			// Reset state while loading new project data
			mediaItems = [];
			projectName = 'Loading...';
			isLoadingMedia = true;
			mediaError = null;
			// Fetch both project details (for name) and media
			fetchProjectData(projectId);
		} else if (!currentProjectId) {
			projectId = '';
			mediaItems = [];
			projectName = 'Error';
			mediaError = 'Project ID not found in URL.';
			isLoadingMedia = false;
		}
	});

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

</script>

<ProjectEditorLayout>
	<!-- Pass content via named snippets -->
	{#snippet headerPanel()}
		<span class="navbar-brand mb-0 h1">Editing: {projectName}</span>
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
		<!-- Placeholder -->
		<h6>Timeline Area</h6>
		<p class="text-muted small">Timeline tracks and clips will appear here.</p>
	{/snippet}

</ProjectEditorLayout>

<style>
	/* Page-specific styles if needed */
	.alert-sm {
		font-size: 0.8rem;
	}
</style>
