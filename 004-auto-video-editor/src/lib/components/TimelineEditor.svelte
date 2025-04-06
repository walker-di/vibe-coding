<script lang="ts">
  // Basic Timeline Editor Component
  import { flip } from 'svelte/animate';
  import { dndzone, type DndEvent } from 'svelte-dnd-action';
  import type { Timeline, Track, Clip, MediaItem } from '$lib/types'; // Add MediaItem
  import { BROWSER } from 'esm-env';
  import { v4 as uuidv4 } from 'uuid'; // Import uuid for generating new clip IDs

  // Make timeline, playheadPosition, and isPlaying bindable props
  // Add mediaMap prop
  let {
	  timeline = $bindable(),
	  playheadPosition = $bindable(0),
	  isPlaying = $bindable(false),
	  mediaMap = new Map<string, MediaItem>() // Receive mediaMap, provide default
  }: {
	  timeline?: Timeline;
	  playheadPosition?: number;
	  isPlaying?: boolean;
	  mediaMap?: Map<string, MediaItem>;
  } = $props();

  // Dummy data for initial rendering (will be replaced by props/API data)
  const dummyTimeline: Timeline = {
    projectId: 'dummy-project',
    tracks: [
      {
        id: 'track-v1',
        type: 'video',
        clips: [
          { id: 'clip-v1-1', mediaId: 'media-vid-1', trackId: 'track-v1', startTime: 0, endTime: 5, sourceStartTime: 0, sourceEndTime: 5 },
          { id: 'clip-v1-2', mediaId: 'media-vid-2', trackId: 'track-v1', startTime: 7, endTime: 12, sourceStartTime: 2, sourceEndTime: 7 },
        ]
      },
      {
        id: 'track-a1',
        type: 'audio',
        clips: [
          { id: 'clip-a1-1', mediaId: 'media-aud-1', trackId: 'track-a1', startTime: 1, endTime: 8, sourceStartTime: 0, sourceEndTime: 7 },
        ]
      }
    ],
    totalDuration: 15 // Example duration
  };

  // Use dummy data if no timeline prop is provided initially
  let currentTimeline = $derived(timeline ?? dummyTimeline); // Use derived for reactivity to prop changes
  const flipDurationMs = 200; // Animation duration

  function handleDndConsider(e: CustomEvent<DndEvent<Clip>>, trackId: string) {
	if (!timeline) return; // Guard against undefined timeline
    const targetTrackIndex = timeline.tracks.findIndex(t => t.id === trackId);
    if (targetTrackIndex === -1) return;

    // Update the clips array for the specific track
    timeline.tracks[targetTrackIndex].clips = e.detail.items;
  }

  function handleDndFinalize(e: CustomEvent<DndEvent<Clip>>, trackId: string) {
	if (!timeline) return; // Guard against undefined timeline
     const targetTrackIndex = timeline.tracks.findIndex(t => t.id === trackId);
    if (targetTrackIndex === -1) return;

    // Update the clips array for the specific track with the reordered items
    timeline.tracks[targetTrackIndex].clips = e.detail.items;
    console.log(`DND Finalized for track ${trackId}. New order:`, e.detail.items);
  }

  let zoomLevel = $state(1); // Zoom level, 1 = 100%
  const timeRulerInterval = 1; // Base interval for markers

  // --- Zoom Controls ---
  function zoomIn() {
    zoomLevel = Math.min(zoomLevel * 1.5, 10);
  }
  function zoomOut() {
    zoomLevel = Math.max(zoomLevel / 1.5, 0.1);
  }

  // --- Time Ruler Calculation ---
  let timeMarkers: { time: number; positionPercent: number }[] = $state([]);
  $effect(() => {
	if (!timeline) return;
    const newMarkers: { time: number; positionPercent: number }[] = [];
    const duration = timeline.totalDuration;
    const interval = timeRulerInterval;
    const totalWidthPercent = 100 * zoomLevel;

    for (let time = 0; time <= duration; time += interval) {
      const positionPercent = duration > 0 ? (time / duration) * totalWidthPercent : 0;
      newMarkers.push({ time, positionPercent });
    }
    timeMarkers = newMarkers;
  });

  // --- Calculated Styles ---
  const timelineInnerWidth = $derived(`${100 * zoomLevel}%`);
  const getPlayheadLeft = $derived(`${timeline?.totalDuration && timeline.totalDuration > 0 ? (playheadPosition / timeline.totalDuration) * 100 * zoomLevel : 0}%`);

  // --- Trim Logic State ---
  let isTrimming = $state(false);
  let trimTarget: { clip: Clip; handle: 'start' | 'end'; initialX: number; initialClip: Clip } | null = $state(null);
  let timelineInnerElement: HTMLDivElement | undefined = $state(); // To get width for calculations

  // Calculate pixels per second based on container width and duration
  const pixelsPerSecond = $derived(() => {
	if (!timelineInnerElement || !timeline?.totalDuration || timeline.totalDuration <= 0) {
		return 10; // Default pixels per second if not calculable
	}
	const totalWidthPx = timelineInnerElement.offsetWidth;
	return totalWidthPx / timeline.totalDuration;
  });

  // --- Trim Event Handlers ---
  function onTrimPointerDown(e: PointerEvent, clip: Clip, handle: 'start' | 'end') {
	if (!timeline || isTrimming) return; // Prevent starting new trim if already trimming
	e.preventDefault();
	e.stopPropagation();

	isTrimming = true;
	trimTarget = {
		clip,
		handle,
		initialX: e.clientX,
		initialClip: { ...clip } // Store initial state
	};

	(e.target as HTMLElement).setPointerCapture(e.pointerId);
	document.addEventListener('pointermove', onTrimPointerMove);
	document.addEventListener('pointerup', onTrimPointerUp, { once: true });

	console.log(`Trim start: ${handle} handle of clip ${clip.id}`);
  }

  function onTrimPointerMove(e: PointerEvent) {
	if (!isTrimming || !trimTarget || !timeline || !timelineInnerElement) return;
	e.preventDefault();

	const deltaX = e.clientX - trimTarget.initialX;
	const pps = pixelsPerSecond();
	if (pps <= 0) return;

	const deltaTime = deltaX / pps;
	const { clip, handle, initialClip } = trimTarget;
	const media = mediaMap?.get(clip.mediaId);
	const mediaDuration = media?.duration ?? Infinity;
	const minClipDuration = 0.1; // Minimum allowed clip duration in seconds

	// Directly modify the clip object within the bound timeline state
	if (handle === 'start') {
		let newStartTime = initialClip.startTime + deltaTime;
		let newSourceStartTime = initialClip.sourceStartTime + deltaTime;

		// Constraint: Cannot make clip shorter than min duration from the end
		const maxStartTime = initialClip.endTime - minClipDuration;
		newStartTime = Math.min(newStartTime, maxStartTime);

		// Constraint: Cannot drag source start time below 0
		if (newSourceStartTime < 0) {
			const sourceClampDelta = 0 - newSourceStartTime;
			newSourceStartTime = 0;
			// Adjust timeline start time proportionally
			newStartTime = initialClip.startTime + sourceClampDelta;
		}

		// Apply constrained values
		clip.startTime = Math.max(0, newStartTime); // Ensure timeline start isn't negative
		clip.sourceStartTime = newSourceStartTime;
		// End times remain the same

	} else { // handle === 'end'
		let newEndTime = initialClip.endTime + deltaTime;
		let newSourceEndTime = initialClip.sourceEndTime + deltaTime;

		// Constraint: Cannot make clip shorter than min duration from the start
		const minEndTime = initialClip.startTime + minClipDuration;
		newEndTime = Math.max(newEndTime, minEndTime);

		// Constraint: Cannot drag source end time beyond media duration
		if (newSourceEndTime > mediaDuration) {
			const sourceClampDelta = newSourceEndTime - mediaDuration;
			newSourceEndTime = mediaDuration;
			// Adjust timeline end time proportionally
			newEndTime = initialClip.endTime - sourceClampDelta;
		}

		// Apply constrained values
		clip.endTime = newEndTime;
		clip.sourceEndTime = newSourceEndTime;
		// Start times remain the same
	}
	// console.log('Trim move:', clip); // Log changes during move
  }

  function onTrimPointerUp(e: PointerEvent) {
	if (!isTrimming || !trimTarget) return;
	e.preventDefault();
	(e.target as HTMLElement).releasePointerCapture(e.pointerId);
	document.removeEventListener('pointermove', onTrimPointerMove);
	// No need to remove pointerup listener as { once: true } was used

	console.log(`Trim end: ${trimTarget.handle} handle of clip ${trimTarget.clip.id}`, trimTarget.clip);
	isTrimming = false;
	trimTarget = null;
	// Timeline state is already updated due to direct mutation
  }

  // --- Split Logic ---
  function splitClipAtPlayhead() {
	if (!timeline) return;
	const minClipDuration = 0.1; // Minimum duration for split parts

	// Find the clip under the playhead
	let targetClip: Clip | null = null;
	let targetTrackIndex = -1;
	let targetClipIndex = -1;

	for (let i = 0; i < timeline.tracks.length; i++) {
		const track = timeline.tracks[i];
		for (let j = 0; j < track.clips.length; j++) {
			const clip = track.clips[j];
			// Check if playhead is strictly within the clip (not exactly at start/end)
			if (playheadPosition > clip.startTime && playheadPosition < clip.endTime) {
				targetClip = clip;
				targetTrackIndex = i;
				targetClipIndex = j;
				break;
			}
		}
		if (targetClip) break;
	}

	if (!targetClip) {
		console.warn('Split failed: Playhead not positioned within a clip.');
		return;
	}

	// Check if split point is too close to the edges
	if (playheadPosition - targetClip.startTime < minClipDuration || targetClip.endTime - playheadPosition < minClipDuration) {
		console.warn(`Split failed: Playhead too close to clip edge (min duration: ${minClipDuration}s).`);
		return;
	}

	// Calculate split time in source media
	const splitTimeInSource = targetClip.sourceStartTime + (playheadPosition - targetClip.startTime);

	// Create the first part of the split clip
	const clipA: Clip = {
		...targetClip,
		id: uuidv4(), // Generate new ID
		endTime: playheadPosition,
		sourceEndTime: splitTimeInSource
	};

	// Create the second part of the split clip
	const clipB: Clip = {
		...targetClip,
		id: uuidv4(), // Generate new ID
		startTime: playheadPosition,
		sourceStartTime: splitTimeInSource
	};

	// Replace the original clip with the two new clips in the timeline state
	timeline.tracks[targetTrackIndex].clips.splice(targetClipIndex, 1, clipA, clipB);

	console.log(`Split clip ${targetClip.id} at ${playheadPosition.toFixed(2)}s into ${clipA.id} and ${clipB.id}`);
  }

</script>

<div class="timeline-editor-container border border-secondary rounded p-2 bg-light">
  <div class="d-flex justify-content-between align-items-center mb-2">
    <h5 class="mb-0">Timeline</h5>
    <!-- Controls -->
    <div class="d-flex align-items-center">
	  <!-- Split Button -->
	  <button class="btn btn-sm btn-outline-secondary me-3" onclick={splitClipAtPlayhead} title="Split clip at playhead">
		  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-scissors" viewBox="0 0 16 16">
			  <path d="M3.5 3.5c-.614-.884-.074-1.962.858-2.5L8 7.226 11.642 1c.932.538 1.472 1.616.858 2.5L8.81 8.61l1.556 2.661a2.5 2.5 0 1 1-.794.637L8 9.73l-1.572 2.177a2.5 2.5 0 1 1-.794-.637L7.19 8.61zm2.5 10a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0m7 0a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0"/>
		  </svg>
	  </button>
      <!-- Zoom Controls -->
      <button class="btn btn-sm btn-outline-secondary me-1" onclick={zoomOut} disabled={zoomLevel <= 0.1}>-</button>
      <span class="me-1">Zoom: {Math.round(zoomLevel * 100)}%</span>
      <button class="btn btn-sm btn-outline-secondary" onclick={zoomIn} disabled={zoomLevel >= 10}>+</button>
    </div>
  </div>

  <div class="timeline-editor position-relative">
    <!-- Inner container that scrolls and scales -->
    <div class="timeline-inner" style:width={timelineInnerWidth} bind:this={timelineInnerElement}>
      <!-- Time Ruler -->
      <div class="time-ruler position-relative mb-2" style="height: 20px; background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
        {#each timeMarkers as marker (marker.time)}
          <div class="time-marker position-absolute" style:left="{`${marker.positionPercent}%`}">
            <span class="time-label">{marker.time}s</span>
          </div>
        {/each}
        <!-- Playhead Indicator in Ruler -->
        <div class="playhead-ruler position-absolute" style:left={getPlayheadLeft}></div>
      </div>

      <!-- Tracks Area -->
      <div class="tracks-container position-relative">
        <!-- Playhead Line -->
        <div class="playhead-line position-absolute" style:left={getPlayheadLeft}></div>

        {#if timeline && timeline.tracks}
          {#each timeline.tracks as track (track.id)}
            <div class="track mb-2 p-2 border rounded bg-white position-relative" data-track-id={track.id}>
              <span class="badge bg-secondary me-2">{track.type.toUpperCase()}</span>
              <!-- Apply dndzone to the clips area -->
              <div
                class="clips-area position-relative"
                style="height: 50px; background-color: #eee;"
                use:dndzone={{ items: track.clips, flipDurationMs, type: track.type }}
                onconsider={(e) => handleDndConsider(e, track.id)}
                onfinalize={(e) => handleDndFinalize(e, track.id)}
              >
                {#each track.clips as clip (clip.id)}
                  <!-- Using flexbox layout now -->
                  <div
                    class="clip border rounded mx-1 position-relative"
                    animate:flip={{ duration: flipDurationMs }}
                    style:height="40px"
                    style:min-width="{`${(clip.endTime - clip.startTime) * 20 * zoomLevel}px`}"
                    style:background-color={track.type === 'video' ? '#aaddff' : '#ffddaa'}
                    title={`Clip ${clip.id} (${clip.startTime}s - ${clip.endTime}s)`}
                    data-clip-id={clip.id}
                    role="group"
                    aria-label={`Clip ${clip.id}`}
                  >
                    <!-- Trim Handles -->
                    <div
                      class="trim-handle trim-handle-start"
                      role="slider"
                      aria-label="Trim start"
                      onpointerdown={(e) => onTrimPointerDown(e, clip, 'start')}
                    ></div>
                    <small class="clip-label p-1 d-block text-truncate">{clip.mediaId}</small>
                    <div
                      class="trim-handle trim-handle-end"
                      role="slider"
                      aria-label="Trim end"
                      onpointerdown={(e) => onTrimPointerDown(e, clip, 'end')}
                    ></div>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        {:else}
          <p class="text-muted p-2">Timeline is empty or not loaded.</p>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .timeline-editor-container {
    /* Container for controls and the scrollable editor */
  }
  .timeline-editor {
    overflow-x: auto; /* Enable horizontal scrolling */
    width: 100%;
  }
  .timeline-inner {
     min-width: 100%; /* Ensure it's at least as wide as the container */
     position: relative; /* Needed for absolute positioning of children */
  }
  .time-ruler {
    overflow: hidden; /* Hide overflow labels for now */
    /* min-width removed, width controlled by timeline-inner */
  }
  .time-marker {
    border-left: 1px solid #ccc;
    height: 100%;
    font-size: 0.7rem;
    color: #6c757d;
    white-space: nowrap;
  }
   .time-marker .time-label {
    position: absolute;
    top: 0;
    left: 2px;
  }
  .playhead-ruler {
    top: 0;
    bottom: 0;
    width: 2px;
    background-color: red;
    z-index: 10;
  }
  .tracks-container {
     /* Container for tracks and playhead line */
  }
  .playhead-line {
    top: 0; /* Start from top of tracks container */
    bottom: 0; /* Extend to bottom */
    width: 2px;
    background-color: red;
    z-index: 5; /* Ensure it's above tracks but potentially below dragged items */
    pointer-events: none; /* Prevent interaction */
  }
  .track {
     /* min-width removed, width controlled by timeline-inner */
     position: relative; /* Keep for absolute positioning context if needed */
  }
  .clips-area {
    display: flex; /* Use flexbox for layout */
    align-items: center; /* Align items vertically */
    position: relative; /* Keep for dndzone and potential absolute elements later */
    min-width: 100%; /* Ensure it fills the track width */
    height: 50px; /* Keep original height */
  }
  .clip {
    cursor: grab;
    overflow: hidden;
    font-size: 0.75rem;
    box-sizing: border-box;
    flex-shrink: 0; /* Prevent clips from shrinking */
    display: flex; /* Use flex for content inside clip */
    align-items: center;
    /* justify-content: center; */ /* Removed to allow handles space */
    /* padding: 0 0.5rem; */ /* Removed padding */
  }
  .clip:active {
    cursor: grabbing;
  }
  .clip-label {
    pointer-events: none; /* Prevent label from interfering with drag */
    flex-grow: 1; /* Allow label to take up space */
    text-align: center;
    margin: 0 8px; /* Add margin to avoid overlap with handles */
  }
  .trim-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 8px; /* Width of the handle */
    cursor: ew-resize; /* East-West resize cursor */
    background-color: rgba(0, 0, 0, 0.5); /* Semi-transparent black */
    border: 1px solid #fff;
    z-index: 1; /* Ensure handles are clickable */
    flex-shrink: 0; /* Prevent handles from shrinking */
  }
  .trim-handle-start {
    left: 0;
    border-right: none;
    border-top-left-radius: 3px;
    border-bottom-left-radius: 3px;
  }
  .trim-handle-end {
    right: 0;
    border-left: none;
    border-top-right-radius: 3px;
    border-bottom-right-radius: 3px;
  }
</style>
