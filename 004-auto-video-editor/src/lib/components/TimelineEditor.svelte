<script lang="ts">
  // Basic Timeline Editor Component
  import { flip } from 'svelte/animate';
  import { dndzone, type DndEvent } from 'svelte-dnd-action';
  import type { Timeline, Track, Clip, MediaItem } from '$lib/types'; // Add MediaItem
  // import { BROWSER } from 'esm-env'; // Not strictly needed for logic shown
  import { v4 as uuidv4 } from 'uuid'; // Import uuid for generating new clip IDs
  import { tick } from 'svelte'; // Import tick

  // --- Configuration Constants ---
  const MIN_DURATION_FOR_SCALING = 30; // (Option 1) Min timeline duration (seconds) used for PPS calculation when zoomed out
  const MIN_RULER_PIXEL_SPACING = 40; // (Option 2) Target minimum pixels between ruler markers (Reduced from 45)

  let windowWidth = $state(0);

  let {
	  timeline = $bindable(),
	  playheadPosition = $bindable(0),
	  isPlaying = $bindable(false),
	  mediaMap = new Map<string, MediaItem>()
  }: {
	  timeline?: Timeline;
	  playheadPosition?: number;
	  isPlaying?: boolean;
	  mediaMap?: Map<string, MediaItem>;
  } = $props();

  // No need for dummy data here if timeline is always provided or handled externally

  const flipDurationMs = 200;

  function handleDndConsider(e: CustomEvent<DndEvent<Clip>>, trackId: string) {
    if (!timeline) return;
    const targetTrackIndex = timeline.tracks.findIndex(t => t.id === trackId);
    if (targetTrackIndex === -1) return;
    timeline.tracks[targetTrackIndex].clips = e.detail.items;
  }

  function handleDndFinalize(e: CustomEvent<DndEvent<Clip>>, trackId: string) {
    // ... (Keep your existing DND finalize logic) ...
	if (!timeline) return; // Guard against undefined timeline
     const targetTrackIndex = timeline.tracks.findIndex(t => t.id === trackId);
    if (targetTrackIndex === -1) return;

    const targetTrack = timeline.tracks[targetTrackIndex];
    const finalItemsInTarget = e.detail.items as Clip[]; // This is the final state for the *target* zone
    const movedItemId = e.detail.info.id;
    // Find the original clip and its track ID from the current timeline state
    let originalClipData: Clip | undefined;
    let sourceTrackId: string | undefined;
    for (const track of timeline.tracks) {
        originalClipData = track.clips.find(c => c.id === movedItemId);
        if (originalClipData) {
            sourceTrackId = track.id; // Found it, store the track ID
            break;
        }
    }
    const targetTrackId = trackId; // ID of the track where the drop occurred (passed as argument)

    let needsReassignment = false; // Flag if we modified the timeline structure

    // --- Case 1: Dropped MediaItem (Adding new clip) ---
    // Check if the moved item ID exists in the mediaMap, indicating it's a MediaItem from the library
    const droppedMediaItem = mediaMap?.get(movedItemId);
    if (droppedMediaItem) {
        needsReassignment = true;
        if (droppedMediaItem.type !== targetTrack.type) {
            console.warn(`Cannot drop media of type ${droppedMediaItem.type} onto a ${targetTrack.type} track.`);
            // Remove the placeholder added by 'consider' if it's still there
            targetTrack.clips = targetTrack.clips.filter(c => c.id !== movedItemId); // Filter by ID
        } else if (!droppedMediaItem.duration || isNaN(Number(droppedMediaItem.duration)) || Number(droppedMediaItem.duration) <= 0) {
            console.error("Cannot add media item without valid duration:", droppedMediaItem);
            targetTrack.clips = targetTrack.clips.filter(c => c.id !== movedItemId);
        } else {
            // Find the placeholder item added by 'consider' (it might have a temporary ID or the media ID)
            // Or, more reliably, calculate position based on drop coordinates (future enhancement)
            // For now, append it based on the finalItemsInTarget provided by dndzone
            const placeholderIndex = finalItemsInTarget.findIndex(item => item.id === movedItemId); // Find the placeholder by ID

            // Calculate append position (simple append for now)
            const existingClips = finalItemsInTarget.filter(c => c.id !== movedItemId); // Exclude placeholder
            const lastClipEndTime = existingClips.length > 0
                ? Math.max(...existingClips.map(c => c.endTime))
                : 0;
            const startTime = lastClipEndTime;
            const duration = Number(droppedMediaItem.duration);
            const endTime = startTime + duration;

            const newClip: Clip = {
                id: uuidv4(), // Generate a *new* unique ID for the clip instance
                mediaId: droppedMediaItem.id, // Link to the original media
                trackId: targetTrackId, // Set the correct track ID
                startTime: startTime,
                endTime: endTime,
                sourceStartTime: 0,
                sourceEndTime: duration,
            };
            console.log(`Creating new clip from MediaItem ${droppedMediaItem.id} at ${startTime.toFixed(2)}s on track ${targetTrackId}`, newClip);

            // Replace the placeholder in the finalItems array with the new clip
            if (placeholderIndex !== -1) {
                finalItemsInTarget.splice(placeholderIndex, 1, newClip);
            } else {
                // If placeholder wasn't found (shouldn't happen often), just append
                finalItemsInTarget.push(newClip);
            }
            targetTrack.clips = finalItemsInTarget; // Update the target track
        }
    }
    // --- Case 2: Dropped Clip (Reordering or Moving Track) ---
    else {
        const movedClip = finalItemsInTarget.find(c => c.id === movedItemId); // Find the actual clip in the target list

        if (!movedClip) {
             console.error(`Finalize Error: Moved clip with ID ${movedItemId} not found in target track's final items.`);
             // Attempt recovery? Maybe just log and don't modify state further?
             // For now, we'll proceed assuming dndzone handles target state correctly if only reordering.
             targetTrack.clips = finalItemsInTarget; // Trust dnd-action's list for reordering
             needsReassignment = true; // Reordered, so update
        } else if (originalClipData && sourceTrackId && sourceTrackId !== targetTrackId) {
            // --- Moving Clip Between Tracks ---
            // Ensure the clip found in the target list is the one we identified earlier
            if (movedClip.id !== originalClipData.id) {
                 console.error(`Finalize Error: Mismatch between identified original clip (${originalClipData.id}) and clip found in target items (${movedClip.id}). Aborting move.`);
                 // Potentially revert target track state? For now, just log and don't proceed with move.
                 targetTrack.clips = timeline.tracks[targetTrackIndex].clips; // Revert to state before finalize? Risky.
            } else {
                needsReassignment = true;
                console.log(`Moving clip ${movedClip.id} from track ${sourceTrackId} to ${targetTrackId}`);

                // 1. Remove from Source Track (using the sourceTrackId found from originalClipData)
                const sourceTrackIndex = timeline.tracks.findIndex(t => t.id === sourceTrackId);
                if (sourceTrackIndex > -1) { // Check if source track exists
                    const clipIndexInSource = timeline.tracks[sourceTrackIndex].clips.findIndex(c => c.id === movedClip.id);
                    if (clipIndexInSource > -1) { // Check if clip was found in source
                        timeline.tracks[sourceTrackIndex].clips.splice(clipIndexInSource, 1);
                        console.log(`Removed clip ${movedClip.id} from source track ${sourceTrackId}`);
                    } else { // Clip wasn't found in source track
                        console.warn(`Finalize Warning: Clip ${movedClip.id} not found in source track ${sourceTrackId} for removal.`);
                    } // Correctly closes the inner if/else (clip found in source)
                } else { // Source track wasn't found
                    console.warn(`Finalize Warning: Source track ${sourceTrackId} not found.`);
                } // Correctly closes the outer if/else (source track found)

                // 2. Update Clip's Track ID in Target Track's Data
                movedClip.trackId = targetTrackId; // Ensure the trackId property is correct

                // 3. Assign final items to Target Track
                targetTrack.clips = finalItemsInTarget;
                console.log(`Finalized clips on target track ${targetTrackId}:`, targetTrack.clips);
                // --- Snapping Logic (Applied after cross-track move) ---
                applySnapping(movedClip, finalItemsInTarget);

            } // Closes the 'else' for successful move (movedClip.id === originalClipData.id)
        } else if (movedClip) { // Check movedClip exists for same-track reorder
             // --- Reordering Within Same Track ---
            needsReassignment = true; // Order changed
            targetTrack.clips = finalItemsInTarget; // Assign first to get rough position

            // --- Snapping Logic (Applied after same-track reorder) ---
            applySnapping(movedClip, finalItemsInTarget);

            console.log(`Reordered clips on track ${targetTrackId} (snapped):`, targetTrack.clips);
        }
    }


    // Trigger reactivity by reassigning the timeline object if needed
    if (needsReassignment) {
        timeline = timeline;
    }
  }


  // --- Snapping Helper Function ---
  function applySnapping(movedClip: Clip, clipsInTrack: Clip[]) {
      if (!timeline || pixelsPerSecond <= 0) return;

      const snapThresholdPx = 10; // Pixels
      const snapThresholdSeconds = snapThresholdPx / pixelsPerSecond;
      const movedClipDuration = movedClip.endTime - movedClip.startTime;

      // Use the current position from the dnd action as the raw position
      const rawStartTime = movedClip.startTime;
      const rawEndTime = movedClip.endTime;

      let bestSnapDelta = Infinity;
      let finalStartTime = rawStartTime; // Start with the raw position

      // Potential snap targets
      const snapTargets: number[] = [playheadPosition];
      clipsInTrack.forEach(clip => {
          if (clip.id !== movedClip.id) { // Don't snap to self
              snapTargets.push(clip.startTime, clip.endTime);
          }
      });

      // Check snapping for movedClip's start time
      snapTargets.forEach(targetTime => {
          const delta = Math.abs(rawStartTime - targetTime);
          if (delta < snapThresholdSeconds && delta < Math.abs(bestSnapDelta)) {
              bestSnapDelta = targetTime - rawStartTime; // Keep the sign
              finalStartTime = targetTime;
          }
      });

      // Check snapping for movedClip's end time
      snapTargets.forEach(targetTime => {
          const delta = Math.abs(rawEndTime - targetTime);
          if (delta < snapThresholdSeconds && delta < Math.abs(bestSnapDelta)) {
              bestSnapDelta = targetTime - rawEndTime; // Keep the sign
              finalStartTime = targetTime - movedClipDuration; // Adjust start based on end snap
          }
      });


      // If a snap occurred (bestSnapDelta is not Infinity)
      if (Math.abs(bestSnapDelta) < snapThresholdSeconds) {
          const snappedStartTime = finalStartTime;
          const snappedEndTime = snappedStartTime + movedClipDuration;

          // --- Overlap Check ---
          let overlaps = false;
          for (const otherClip of clipsInTrack) {
              if (otherClip.id === movedClip.id) continue; // Skip self
              // Check for overlap: (StartA < EndB) and (EndA > StartB)
              if (snappedStartTime < otherClip.endTime && snappedEndTime > otherClip.startTime) {
                  overlaps = true;
                  console.log(`Snap reverted: Overlap detected with clip ${otherClip.id}`);
                  break;
              }
          }

          // Apply snap only if no overlap
          if (!overlaps) {
              console.log(`Snapping clip ${movedClip.id} from ${rawStartTime.toFixed(2)} to ${snappedStartTime.toFixed(2)}`);
              movedClip.startTime = snappedStartTime;
              movedClip.endTime = snappedEndTime;
          } else {
               // Revert to raw position if snap caused overlap (already done by not assigning)
               // Ensure the clip object reflects the raw position if it was modified temporarily
               movedClip.startTime = rawStartTime;
               movedClip.endTime = rawEndTime;
          }
      }
      // If no snap occurred, movedClip retains its rawStartTime/rawEndTime
  }


  let zoomLevel = $state(1);
  //Removed: const timeRulerInterval = 1; // Now dynamic

  // --- Zoom Controls with Centering ---
  async function zoom(direction: 'in' | 'out') {
    if (!timelineEditorElement) return;
    const container = timelineEditorElement;
    const oldZoom = zoomLevel;
    const oldScrollLeft = container.scrollLeft;
    const containerWidth = container.offsetWidth;
    const referenceX = containerWidth / 2; // Zoom relative to center
    const oldPPS = pixelsPerSecond;

    if (oldPPS <= 0 && direction === 'in') { // Allow zoom out even if pps is 0 initially
        console.warn(`Zoom ${direction} - Aborted: oldPPS <= 0`);
        return;
    }

    // Avoid division by zero if oldPPS is 0 when calculating timeAtCenter
    const timeAtCenter = oldPPS > 0 ? (oldScrollLeft + referenceX) / oldPPS : 0;


    let newZoom: number;
    if (direction === 'in') {
        newZoom = Math.min(oldZoom * 1.5, 10);
    } else {
        newZoom = Math.max(oldZoom / 1.5, 0.1); // Keep min zoom level reasonable
    }

    if (newZoom === oldZoom) return; // No change

    console.log(`Zoom ${direction} - Time@Center: ${timeAtCenter.toFixed(2)}, OldZoom: ${oldZoom.toFixed(2)}, NewZoom: ${newZoom.toFixed(2)}`);
    zoomLevel = newZoom;

    // Wait for Svelte to update DOM/styles based on new zoomLevel
    // and for the pixelsPerSecond effect to re-run
    await tick();

    // Now get the updated pixelsPerSecond calculated by the effect
    const newPPS = pixelsPerSecond;
    console.log(`Zoom ${direction} - NewPPS: ${newPPS.toFixed(2)}`);

    if (newPPS <= 0) {
         console.warn(`Zoom ${direction} - Cannot adjust scroll: newPPS <= 0`);
         return; // Avoid division by zero / invalid scroll
    }

    // Calculate new scroll position to keep timeAtCenter at referenceX
    const newScrollLeft = (timeAtCenter * newPPS) - referenceX;
    container.scrollLeft = Math.max(0, newScrollLeft); // Apply and ensure not negative
    console.log(`Zoom ${direction} - Adjusted scrollLeft from ${oldScrollLeft.toFixed(0)} to ${container.scrollLeft.toFixed(0)}`);
  }

  function zoomIn() { zoom('in'); }
  function zoomOut() { zoom('out'); }

  // --- Calculated Styles ---
  const timelineInnerWidth = $derived(`${100 * zoomLevel}%`);

  // --- State Variables ---
  let isTrimming = $state(false);
  let trimTarget: { clip: Clip; handle: 'start' | 'end'; initialX: number; initialClip: Clip } | null = $state(null);
  let timelineInnerElement: HTMLDivElement | undefined = $state();
  let timelineEditorElement: HTMLDivElement | undefined = $state();
  let pixelsPerSecond = $state(10); // Default value, will be calculated
  let timeMarkers: { time: number; positionPx: number; label: string; isMajor: boolean }[] = $state([]); // Enhanced marker type

  // --- Derived State ---
  // (Option 1 Integration) Calculate the *actual* max duration based on clips
  const actualTotalDuration = $derived(() => {
    if (!timeline?.tracks || timeline.tracks.length === 0) return 0;
    let maxEndTime = 0;
    for (const track of timeline.tracks) {
        for (const clip of track.clips) {
            if (clip.endTime > maxEndTime) maxEndTime = clip.endTime;
        }
    }
    // console.log(`Derived (actualTotalDuration) - Result: ${maxEndTime.toFixed(2)}`);
    // Add a small buffer (e.g., 10%) to ensure last marker might be visible? Or just return max.
    return maxEndTime > 0 ? maxEndTime + 1 : 1; // Ensure at least 1s duration visually if empty
  });

  // --- Effects ---

  // (Option 1 Integration) Effect to update pixelsPerSecond using minimum duration logic
  $effect(() => {
    const _ww = windowWidth; // Depend on window width changes
    const actualDuration = actualTotalDuration(); // Get the real max end time

    // --- MODIFIED: Always use actualDuration for scaling ---
    const durationForScaling = actualDuration;
    // --- END MODIFIED ---

    console.log(`Effect (pixelsPerSecond) - Actual Max Duration: ${actualDuration.toFixed(2)}, Duration Used for Scaling: ${durationForScaling.toFixed(2)}`); // Log remains useful

    if (!timelineEditorElement || durationForScaling <= 0) {
        console.log('Effect (pixelsPerSecond): Using default (10) - No element or zero/negative duration');
        pixelsPerSecond = 10;
    } else {
        const containerWidthPx = timelineEditorElement.offsetWidth;
        const effectiveWidthPx = containerWidthPx * zoomLevel; // Scaled width based on container and zoom
        const pps = effectiveWidthPx / durationForScaling; // Calculate PPS using the chosen scaling duration
        console.log(`Effect (pixelsPerSecond) - Container Width: ${containerWidthPx}, Zoom: ${zoomLevel.toFixed(2)}, Effective Width: ${effectiveWidthPx.toFixed(2)}, Calculated PPS: ${pps.toFixed(3)}`);
        pixelsPerSecond = pps > 0 ? pps : 0.0001; // Ensure PPS doesn't become zero or negative
    }
  });

  // (Option 2 Integration) Effect for Dynamic Time Ruler Calculation
  $effect(() => {
    const duration = actualTotalDuration(); // Use ACTUAL duration to know the total time span
    const pps = pixelsPerSecond; // Use the calculated (potentially adjusted) PPS

    const newMarkers: { time: number; positionPx: number; label: string; isMajor: boolean }[] = [];

    if (!timelineEditorElement || pps <= 0 || duration <= 0) {
        timeMarkers = []; // Clear markers if calculation is not possible
        return;
    }

    // --- Calculate dynamic interval based on desired pixel spacing ---
    let interval = 1; // Default interval in seconds
    const secondsPerMinSpacing = MIN_RULER_PIXEL_SPACING / pps;

    // Determine a 'nice' interval (powers of 1, 2, 5, 10, etc.)
    const niceIntervals = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600]; // Seconds
    interval = niceIntervals.find(i => i >= secondsPerMinSpacing) ?? niceIntervals[niceIntervals.length - 1];

    // Determine major/minor intervals (e.g., every 5th or 10th interval)
    let majorIntervalMultiplier = 5;
    if (interval >= 60) majorIntervalMultiplier = 2; // e.g., 60s, 120s (major)
    else if (interval >= 10) majorIntervalMultiplier = 3; // e.g., 10s, 20s, 30s (major)
	else if (interval >= 1) majorIntervalMultiplier = 5; // e.g. 1s -> 5s is major
	else majorIntervalMultiplier = 10; // e.g. 0.1s -> 1s is major


    console.log(`Effect (Time Markers) - Duration: ${duration.toFixed(2)}s, PPS: ${pps.toFixed(3)}px/s, Calculated Interval: ${interval}s`);

    for (let i = 0; ; ++i) {
        const time = i * interval;
        if (time > duration + interval) break; // Go slightly beyond duration to ensure last marker potentially visible

        const positionPx = time * pps;
        const isMajor = i % majorIntervalMultiplier === 0;
        let label = '';
        if (isMajor || interval < 1) { // Label major ticks, or all ticks if sub-second
            if (time % 1 === 0) { // Whole seconds
                label = `${time.toFixed(0)}s`;
            } else { // Sub-second
                label = `${time.toFixed(1)}s`;
            }
        }


        // Add marker if it's within reasonable bounds (optional optimization)
        // const viewStartPx = timelineEditorElement.scrollLeft;
        // const viewEndPx = viewStartPx + timelineEditorElement.offsetWidth;
        // if (positionPx >= viewStartPx - 100 && positionPx <= viewEndPx + 100) {}
        newMarkers.push({ time, positionPx, label, isMajor });

    }
    timeMarkers = newMarkers;
  });


  // --- Derived State that depends on pixelsPerSecond ---
  const getPlayheadLeftPx = $derived(playheadPosition * pixelsPerSecond);

  // --- Trim Event Handlers ---
  // ... (Keep your existing onTrimPointerDown, Move, Up logic) ...
  // It correctly uses the current `pixelsPerSecond` state variable.
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
	const pps = pixelsPerSecond; // Use the state variable
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
			newStartTime = initialClip.startTime + sourceClampDelta; // This might need refinement if snapping involved
		}

		// Constraint: Timeline start cannot be negative
		newStartTime = Math.max(0, newStartTime);

		// Apply constrained values
		clip.startTime = newStartTime;
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
			newEndTime = initialClip.endTime - sourceClampDelta; // This might need refinement
		}

		// Apply constrained values
		clip.endTime = newEndTime;
		clip.sourceEndTime = newSourceEndTime;
		// Start times remain the same
	}
	// Trigger reactivity explicitly as we mutated nested state
	timeline = timeline;
	// console.log('Trim move:', clip); // Log changes during move
  }

  function onTrimPointerUp(e: PointerEvent) {
	if (!isTrimming || !trimTarget) return;
	e.preventDefault();
	// Check if the event target still exists before releasing capture
	const targetElement = e.target as HTMLElement;
	if (targetElement && targetElement.hasPointerCapture(e.pointerId)) {
		targetElement.releasePointerCapture(e.pointerId);
	}
	document.removeEventListener('pointermove', onTrimPointerMove);
	// No need to remove pointerup listener as { once: true } was used

	console.log(`Trim end: ${trimTarget.handle} handle of clip ${trimTarget.clip.id}`, trimTarget.clip);
	isTrimming = false;
	trimTarget = null;
	// Timeline state is already updated due to direct mutation & reassignment in move
  }

  // --- Split Logic ---
  // ... (Keep your existing splitClipAtPlayhead logic) ...
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
	// Trigger reactivity
	timeline = timeline;

	console.log(`Split clip ${targetClip.id} at ${playheadPosition.toFixed(2)}s into ${clipA.id} and ${clipB.id}`);
  }

</script>

<svelte:window bind:innerWidth={windowWidth} />

<div class="timeline-editor-container border border-secondary rounded p-2 bg-light">
  <div class="d-flex justify-content-between align-items-center mb-2">
    <h5 class="mb-0">Timeline</h5>
    <div class="d-flex align-items-center">
	  <button class="btn btn-sm btn-outline-secondary me-3" onclick={splitClipAtPlayhead} title="Split clip at playhead">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-scissors" viewBox="0 0 16 16">
           <path d="M3.5 3.5c-.614-.884-.074-1.962.858-2.5L8 7.226 11.642 1c.932.538 1.472 1.616.858 2.5L8.81 8.61l1.556 2.661a2.5 2.5 0 1 1-.794.637L8 9.73l-1.572 2.177a2.5 2.5 0 1 1-.794-.637L7.19 8.61zm2.5 10a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0m7 0a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0"/>
         </svg>
	  </button>
      <button class="btn btn-sm btn-outline-secondary me-1" onclick={zoomOut} disabled={zoomLevel <= 0.1}>-</button>
      <span class="me-1">Zoom: {Math.round(zoomLevel * 100)}%</span>
      <button class="btn btn-sm btn-outline-secondary" onclick={zoomIn} disabled={zoomLevel >= 10}>+</button>
    </div>
  </div>

  <div class="timeline-editor position-relative" bind:this={timelineEditorElement}>
    <div class="timeline-inner" style:width={timelineInnerWidth} bind:this={timelineInnerElement}>
      <!-- Time Ruler -->
      <div class="time-ruler position-relative mb-2 no-select">
        {#each timeMarkers as marker (marker.time)}
          <div
             class:time-marker={true}
             class:time-marker-major={marker.isMajor}
             class:time-marker-minor={!marker.isMajor}
             style:left="{`${marker.positionPx}px`}"
          >
            {#if marker.label}
              <span class="time-label">{marker.label}</span>
            {/if}
          </div>
        {/each}
        
        <div class="time-ruler-background"></div>
        
        <div class="playhead-ruler position-absolute" style:left="{`${getPlayheadLeftPx}px`}"></div>
      </div>

      <!-- Tracks Area -->
      <div class="tracks-container position-relative">
        <!-- Playhead Line -->
        <div class="playhead-line position-absolute" style:left="{`${getPlayheadLeftPx}px`}"></div>

        {#if timeline && timeline.tracks && timeline.tracks.length > 0}
          {#each timeline.tracks as track (track.id)}
            <div class="track mb-1 border rounded bg-white" data-track-id={track.id}> 
             <div class="track-header"> <span class="badge bg-secondary m-1">{track.type.toUpperCase()}</span></div>
              <div
                class="clips-area" 
                use:dndzone={{
                    items: track.clips,
                    flipDurationMs,
                    type: track.type
                }}
                onconsider={(e) => handleDndConsider(e, track.id)}
                onfinalize={(e) => handleDndFinalize(e, track.id)}
              >
                {#each track.clips as clip (clip.id)}
                  {@const clipWidth = Math.max(1, (clip.endTime - clip.startTime) * pixelsPerSecond)} 
                  {@const clipLeft = clip.startTime * pixelsPerSecond}
                  <div
                    class="clip border rounded position-absolute"
                    animate:flip={{ duration: flipDurationMs }}
                    style:left="{`${clipLeft}px`}"
                    style:width="{`${clipWidth}px`}"
                    style:background-color={track.type === 'video' ? '#aaddff' : '#ffddaa'}
                    title={`Clip ${clip.mediaId}\n(${clip.startTime.toFixed(2)}s - ${clip.endTime.toFixed(2)}s)`}
                    data-clip-id={clip.id}
                  >
                    <div
                      class="trim-handle trim-handle-start"
                      onpointerdown={(e) => onTrimPointerDown(e, clip, 'start')}
                    ></div>
                    <small class="clip-label text-truncate">{clip.mediaId}</small>
                    <div
                      class="trim-handle trim-handle-end"
                      onpointerdown={(e) => onTrimPointerDown(e, clip, 'end')}
                    ></div>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        {:else}
          <p class="text-muted p-3 text-center">Timeline is empty. Drag media here.</p>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .no-select {
      user-select: none;
      -webkit-user-select: none; 
      -moz-user-select: none; 
      -ms-user-select: none; 
  }
  .timeline-editor-container {
    
  }
  .timeline-editor {
    overflow-x: auto;
    width: 100%;
    position: relative;
    
    
    
  }
  .timeline-inner {
     min-width: 100%;
     position: relative;
     
     
     padding-bottom: 10px; 
  }

  /* --- Time Ruler Styles --- */
  .time-ruler {
    position: relative; 
    overflow: visible; 
    height: 25px; 
    
  }
  .time-ruler-background {
	  position: absolute;
	  top: 0;
	  left: 0;
	  right: 0;
	  height: 25px; 
	  background-color: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
	  z-index: 0; 
  }
  .time-marker {
    position: absolute;
    bottom: 0;
    width: 1px;
    background-color: #ccc;
    z-index: 1; 
  }
  .time-marker-minor { height: 8px; } 
  .time-marker-major { height: 15px; background-color: #999;}
   .time-marker .time-label {
    position: absolute;
    bottom: 100%;
    left: 2px;
    transform: translateY(-2px); 
    font-size: 0.7rem;
    color: #6c757d;
    white-space: nowrap;
  }
  .playhead-ruler {
    position: absolute;
    top: 0;
    bottom: 0; 
    width: 2px;
    background-color: red;
    z-index: 10;
    transform: translateX(-1px);
    pointer-events: none;
  }

  /* --- Tracks Area Styles --- */
  .tracks-container {
     position: relative;
     
     
  }
  .playhead-line {
    position: absolute;
    top: 0; 
    bottom: 0; 
    width: 2px;
    background-color: red;
    z-index: 5;
    pointer-events: none;
    transform: translateX(-1px);
  }
  .track {
     
     display: flex;
	 flex-direction: row;
     background-color: #f1f3f5;
     
     
  }
  .track-header {
	  flex: 0 0 auto;
	  width: 30px; 
	  padding: 2px;
	  writing-mode: vertical-lr;
	  text-orientation: mixed;
	  text-align: center;
	  background-color: #e9ecef;
	  border-right: 1px solid #dee2e6;
	  display:flex;
	  align-items: center; 
	  justify-content: center; 
	  font-size: 0.7rem;
	  font-weight: bold;
	  color: #495057;
  }

  .clips-area {
    flex-grow: 1;
    position: relative; 
    height: 60px; 
	background-color: #e9ecef;
	background-image: linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px);
	background-size: 1px 10px;
	overflow: hidden;
    
  }

  /* --- Clip Styling (mostly unchanged) --- */
  .clip {
	position: absolute;
    top: 10px; 
    height: 40px; 
    
    cursor: grab;
    overflow: hidden;
    font-size: 0.75rem;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    padding: 0;
	z-index: 2;
  }
  
  .clip:active {
    cursor: grabbing;
	z-index: 3; 
  }
  .clip-label {
    pointer-events: none;
    flex-grow: 1;
    text-align: center;
    margin: 0 10px; 
	color: #333;
	font-size: 0.7rem;
	overflow:hidden;
	white-space:nowrap;
  }
  .trim-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 8px;
    cursor: ew-resize;
    background-color: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.7);
    z-index: 4; 
	flex-shrink: 0;
  }
   .trim-handle:hover {
	   background-color: rgba(0, 0, 0, 0.5);
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
