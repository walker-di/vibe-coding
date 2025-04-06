<script lang="ts">
	import { page } from '$app/stores';
	import ProjectEditorLayout from '$lib/components/ProjectEditorLayout.svelte';
	import MediaLibrary from '$lib/components/MediaLibrary.svelte';
	import MediaUpload from '$lib/components/MediaUpload.svelte';
	import TimelineEditor from '$lib/components/TimelineEditor.svelte';
	import PreviewPlayer from '$lib/components/PreviewPlayer.svelte'; // Import PreviewPlayer
	import type { MediaItem, Timeline, Track, Clip } from '$lib/types'; // Import necessary types
	import { v4 as uuidv4 } from 'uuid'; // Import uuid

	// --- Core State ---
	let projectId = $state('');
	let mediaItems = $state<MediaItem[]>([]);
	// let mediaMap = $state(new Map<string, MediaItem>()); // Replaced with $derived below
	let isLoadingMedia = $state(true);
	let isLoadingTimeline = $state(true);
	let mediaError = $state<string | null>(null);
	let timelineError = $state<string | null>(null);
	let projectName = $state('Loading...');
	let projectTimeline = $state<Timeline | undefined>(undefined); // Use undefined initially

	// --- Shared Playback & Timeline State ---
	let playheadPosition = $state(0); // Current playhead time in seconds
	let isPlaying = $state(false); // Global playback state
	// Revert type, accept potential TS errors in effect for now
	let playerRef: PreviewPlayer | undefined = $state();

	// --- Utility Functions ---
	function createDefaultTimeline(id: string): Timeline {
		return {
			projectId: id,
			tracks: [], // Start with no tracks
			totalDuration: 0 // Start with zero duration
		};
	}

	// --- Derived State ---
	// Create mediaMap reactively based on mediaItems
	let mediaMap = $derived(() => {
		const map = new Map<string, MediaItem>();
		for (const item of mediaItems) {
			if (item && item.id) {
				map.set(item.id, item);
			}
		}
		console.log('Derived mediaMap updated:', map); // Log when it recomputes
		return map;
	});

	// --- Effects ---

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
			playheadPosition = 0; // Reset playhead
			isPlaying = false; // Reset playback state
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
					if (response.status === 404) {
						console.log('No timeline found on server, creating default.');
						projectTimeline = createDefaultTimeline(id); // Create default if 404
					} else {
						const errorText = await response.text();
						timelineError = `Timeline fetch failed: ${response.status} - ${errorText}`;
						projectTimeline = createDefaultTimeline(id); // Use default on other errors too
					}
				} else {
					const fetchedTimelineData = await response.json();
					// TODO: Add validation for fetchedTimelineData.timeline structure
					if (fetchedTimelineData && fetchedTimelineData.timeline) {
						projectTimeline = fetchedTimelineData.timeline;
					} else {
						console.warn('Timeline data fetched but invalid, using default.');
						timelineError = 'Fetched timeline data was invalid.';
						projectTimeline = createDefaultTimeline(id);
					}
				}
			} else {
				console.error('Failed to fetch timeline:', timelineResult.reason);
				timelineError = timelineResult.reason instanceof Error ? timelineResult.reason.message : 'Failed to load timeline.';
				projectTimeline = createDefaultTimeline(id); // Use default on fetch failure
			}

		} catch (e) {
			console.error(`Failed to fetch data for project ${id}:`, e);
			// Set a general error if specific ones weren't caught
			const errorMsg = e instanceof Error ? e.message : 'Failed to load project data.';
			if (!mediaError) mediaError = errorMsg;
			if (!timelineError) timelineError = errorMsg;
			mediaItems = [];
			projectTimeline = createDefaultTimeline(id); // Ensure timeline is default on error
			projectName = 'Error Loading Project';
		} finally {
			isLoadingMedia = false;
			isLoadingTimeline = false;
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
		console.log('Media selected (click):', item);
		if (!projectTimeline) {
			console.error('Cannot add clip: Timeline is not loaded.');
			return;
		}
		if (!item.duration) {
			console.error('Cannot add clip: Media item has no duration.', item);
			return;
		}

		// Find the first compatible track
		const targetTrackIndex = projectTimeline.tracks.findIndex(track => track.type === item.type);

		if (targetTrackIndex === -1) {
			console.warn(`No compatible track found for media type "${item.type}".`);
			// TODO: Optionally create a new track? For now, do nothing.
			return;
		}

		// Calculate start time (append to end of the target track)
		const targetTrackClips = projectTimeline.tracks[targetTrackIndex].clips;
		const lastClipEndTime = targetTrackClips.length > 0
			? Math.max(...targetTrackClips.map(c => c.endTime))
			: 0;
		const startTime = lastClipEndTime;
		const duration = Number(item.duration); // Ensure duration is number
		const endTime = startTime + duration;

		// Create the new clip
		const newClip: Clip = {
			id: uuidv4(), // Need uuid library imported
			mediaId: item.id,
			trackId: projectTimeline.tracks[targetTrackIndex].id,
			startTime: startTime,
			endTime: endTime,
			sourceStartTime: 0,
			sourceEndTime: duration,
		};

		console.log(`Adding new clip from click: ${item.id} to track ${newClip.trackId} at ${startTime.toFixed(2)}s`, newClip);

		// Add the new clip to the track
		projectTimeline.tracks[targetTrackIndex].clips.push(newClip);

		// Update total duration if necessary
		if (endTime > projectTimeline.totalDuration) {
			projectTimeline.totalDuration = endTime;
		}

		// Trigger reactivity by reassigning (important for Svelte 5 state)
		projectTimeline = projectTimeline;
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

	// Effect to control player playback based on shared isPlaying state
	$effect(() => {
		// Attempt to call methods directly on the ref obtained via bind:this
		if (!playerRef) return;

		if (isPlaying) {
			playerRef.play();
		} else {
			playerRef.pause();
		}
	});

</script>

<ProjectEditorLayout>
	<!-- Pass content via named snippets -->
	{#snippet headerPanel()}
		<span class="navbar-brand mb-0 h1">Editing: {projectName}</span>
		<!-- Playback Controls -->
		<button class="btn btn-sm btn-secondary ms-3" onclick={() => isPlaying = !isPlaying} disabled={!projectTimeline || isLoadingTimeline || isLoadingMedia}>
			{isPlaying ? 'Pause' : 'Play'}
		</button>
		<span class="ms-2">Time: {playheadPosition.toFixed(2)}s</span>
		<!-- Save Status -->
		{#if isSaving}
			<span class="badge bg-info ms-3">Saving...</span>
		{/if}
		{#if saveError}
			<span class="badge bg-danger ms-3" title={saveError}>Save Error!</span>
		{/if}
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
				<MediaLibrary mediaItems={[]} onMediaSelect={handleMediaSelect} /> <!-- Pass handler -->
			{:else}
				<MediaLibrary {mediaItems} onMediaSelect={handleMediaSelect} /> <!-- Pass handler -->
			{/if}
		</div>
		<div class="p-2 border-top">
			<MediaUpload onFilesSelected={handleFilesSelected} accept="video/*,audio/*" /> <!-- Pass handler -->
		</div>
	{/snippet}

	{#snippet previewPanel()}
		{#if isLoadingTimeline || isLoadingMedia}
			<p>Loading player...</p>
		{:else if !projectTimeline}
			<p>Timeline not available.</p> <!-- Should not happen with default timeline logic -->
		{:else}
			<!-- Instantiate PreviewPlayer -->
			<PreviewPlayer
				bind:this={playerRef}
				timeline={projectTimeline}
				bind:playheadPosition
				mediaMap={mediaMap()}
			/>
		{/if}
	{/snippet}

	{#snippet timelinePanel()}
		{#if isLoadingTimeline}
			<p>Loading timeline...</p>
		{:else if timelineError && !projectTimeline} <!-- Show error only if timeline failed AND is still undefined -->
			<div class="alert alert-danger alert-sm p-1" role="alert">
				Error loading timeline: {timelineError}. Cannot initialize editor.
			</div>
		{:else if !projectTimeline}
			<p>Initializing timeline...</p> <!-- Should be brief as default is created -->
		{:else}
			<!-- Bind projectTimeline to the editor's timeline prop -->
			<!-- Also pass shared playback state -->
			<TimelineEditor
				bind:timeline={projectTimeline}
				bind:playheadPosition
				bind:isPlaying
				mediaMap={mediaMap()}
			/>
		{/if}
	{/snippet}

</ProjectEditorLayout>

<style>
	/* Page-specific styles if needed */
	.alert-sm {
		font-size: 0.8rem;
	}
</style>
