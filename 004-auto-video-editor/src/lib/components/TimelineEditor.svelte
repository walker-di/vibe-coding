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
		mediaMap = new Map<string, MediaItem>(),
		onDeleteTrack = (trackId: string) => {} // Default no-op function
	}: {
		timeline?: Timeline;
		playheadPosition?: number;
		isPlaying?: boolean;
		mediaMap?: Map<string, MediaItem>;
		onDeleteTrack?: (trackId: string) => void; // Callback prop for deleting a track
	} = $props();

	// No need for dummy data here if timeline is always provided or handled externally

	const flipDurationMs = 200;

	function handleDndConsider(e: CustomEvent<DndEvent<Clip>>, trackId: string) {
		if (!timeline) return;
		const targetTrackIndex = timeline.tracks.findIndex(t => t.id === trackId);
		if (targetTrackIndex === -1) return;
		// Make sure to filter out potential duplicates if dndzone adds the item multiple times during consider
		const currentIds = new Set(timeline.tracks[targetTrackIndex].clips.map(c => c.id));
		const incomingItems = e.detail.items.filter(item => !currentIds.has(item.id));
		// Combine existing and new *valid* items (dndzone might temporarily add duplicates or items being moved out)
		// A more robust approach might involve directly manipulating based on info, but this helps prevent duplicates during 'consider'
		// Or simply assign directly as dndzone expects:
		timeline.tracks[targetTrackIndex].clips = e.detail.items;
		timeline = timeline; // Ensure reactivity if directly manipulating nested array
	}


	function handleDndFinalize(e: CustomEvent<DndEvent<Clip>>, trackId: string) {
		if (!timeline) return; // Guard against undefined timeline
		const targetTrackIndex = timeline.tracks.findIndex(t => t.id === trackId);
		if (targetTrackIndex === -1) return;

		const targetTrack = timeline.tracks[targetTrackIndex];
		const finalItemsInTarget = e.detail.items as Clip[]; // This is the final state for the *target* zone
		const movedItemId = e.detail.info.id;

		// --- Find original source ---
		let originalClipData: Clip | undefined;
		let sourceTrackId: string | undefined;
		for (const track of timeline.tracks) {
			// Look in the *previous state* if available, otherwise search current timeline state before modification
			// Note: dndzone's `items` in `e.detail` *already reflect the finalized state of the target zone*.
			// We need to find the source *before* this finalize event conceptually completed the move.
			// A robust way is to store the source zone ID in the drag start event info,
			// but dnd-action doesn't easily expose that in finalize across zones.
			// Alternative: Search *all* tracks *except the target* for the ID *before* updating the target track.
			// However, since `consider` might have already moved items visually, let's rely on searching the whole timeline *state*
			// as it is *before* we process this finalize event fully.

			const foundClip = track.clips.find(c => c.id === movedItemId);
			if (foundClip) {
				originalClipData = foundClip; // Found the clip's data
				sourceTrackId = track.id;    // Found the clip's original track
				// Don't break yet if it's a media item, as it won't be in the timeline tracks yet
				if (!mediaMap?.has(movedItemId)) {
					break; // Break if found an existing clip
				}
			}
		}


		const targetTrackId = trackId; // ID of the track where the drop occurred (passed as argument)

		let needsReassignment = false; // Flag if we modified the timeline structure

		// --- Case 1: Dropped MediaItem (Adding new clip) ---
		const droppedMediaItem = mediaMap?.get(movedItemId);
		if (droppedMediaItem && !originalClipData) { // Ensure it's not an existing clip being moved
			needsReassignment = true;
			if (droppedMediaItem.type !== targetTrack.type) {
				console.warn(`Cannot drop media of type ${droppedMediaItem.type} onto a ${targetTrack.type} track.`);
				// Remove the placeholder added by 'consider' / 'finalize'
				targetTrack.clips = finalItemsInTarget.filter(c => c.id !== movedItemId);
			} else if (!droppedMediaItem.duration || isNaN(Number(droppedMediaItem.duration)) || Number(droppedMediaItem.duration) <= 0) {
				console.error("Cannot add media item without valid duration:", droppedMediaItem);
				targetTrack.clips = finalItemsInTarget.filter(c => c.id !== movedItemId);
			} else {
				const placeholderIndex = finalItemsInTarget.findIndex(item => item.id === movedItemId); // Find the placeholder by ID

				// Calculate append position (simple append for now, no overlap check needed for append)
				const existingClips = finalItemsInTarget.filter(c => c.id !== movedItemId); // Exclude placeholder
				const lastClipEndTime = existingClips.length > 0
					? Math.max(...existingClips.map(c => c.endTime))
					: 0;
				const startTime = lastClipEndTime; // Simple append
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
					// If placeholder wasn't found (shouldn't happen with dndzone finalize), just append
					console.warn("Placeholder for new media item not found in finalize items, appending instead.");
					finalItemsInTarget.push(newClip);
				}
				targetTrack.clips = finalItemsInTarget; // Update the target track
			}
		}
		// --- Case 2: Dropped Clip (Reordering or Moving Track) ---
		else if (originalClipData) { // It's an existing clip
			const movedClip = finalItemsInTarget.find(c => c.id === movedItemId); // Find the actual clip in the target list

			if (!movedClip) {
				console.error(`Finalize Error: Moved clip with ID ${movedItemId} not found in target track's final items.`);
				// Attempt recovery? Revert target track? Too risky. Log and hope dndzone state is okay.
				targetTrack.clips = finalItemsInTarget; // Trust dnd-action's list
				needsReassignment = true;
			} else {
				needsReassignment = true; // Something changed (reorder or move)

				// If moved between tracks
				if (sourceTrackId && sourceTrackId !== targetTrackId) {
					console.log(`Moving clip ${movedClip.id} from track ${sourceTrackId} to ${targetTrackId}`);

					// 1. Remove from Source Track (if it still exists there - might have been removed by 'consider')
					const sourceTrackIndex = timeline.tracks.findIndex(t => t.id === sourceTrackId);
					if (sourceTrackIndex > -1) {
						const clipIndexInSource = timeline.tracks[sourceTrackIndex].clips.findIndex(c => c.id === movedClip.id);
						if (clipIndexInSource > -1) {
							timeline.tracks[sourceTrackIndex].clips.splice(clipIndexInSource, 1);
							console.log(`Removed clip ${movedClip.id} from source track ${sourceTrackId}`);
						} else {
							// This can happen if 'consider' already updated the source list implicitly
							console.log(`Clip ${movedClip.id} already removed from source track ${sourceTrackId} (likely by 'consider').`);
						}
					} else {
						console.warn(`Finalize Warning: Source track ${sourceTrackId} not found.`);
					}

					// 2. Update Clip's Track ID in Target Track's Data
					movedClip.trackId = targetTrackId;

					// 3. Assign final items to Target Track
					targetTrack.clips = finalItemsInTarget;
					console.log(`Finalized clips on target track ${targetTrackId}:`, targetTrack.clips);

					// --- Snapping Logic (Applied after cross-track move) ---
					applySnapping(movedClip, finalItemsInTarget.filter(c => c.id !== movedClip.id)); // Pass other clips for snapping check

				}
				// If reordering within the same track
				else {
					targetTrack.clips = finalItemsInTarget; // Assign first to get rough position

					// --- Snapping Logic (Applied after same-track reorder) ---
					applySnapping(movedClip, finalItemsInTarget.filter(c => c.id !== movedClip.id)); // Pass other clips

					console.log(`Reordered clips on track ${targetTrackId} (snapped):`, targetTrack.clips);
				}
			}
		} else {
            // This case might occur if the source was external and not in mediaMap (e.g., file drop from OS)
            // Or if the item was removed during drag externally.
            console.warn(`Finalize: Could not identify the source for item ${movedItemId}. Finalizing target track state only.`);
            targetTrack.clips = finalItemsInTarget.filter(item => {
                // Attempt to filter out items that shouldn't be there (e.g., non-clips if source was unknown)
                // This is a fallback, proper handling depends on expected drag sources.
                return timeline.tracks.some(t => t.clips.some(c => c.id === item.id)) || mediaMap?.has(item.id);
            });
             needsReassignment = true;
        }


		// Trigger reactivity by reassigning the timeline object if needed
		if (needsReassignment) {
			timeline = timeline;
		}
	}


	// --- Snapping Helper Function ---
	function applySnapping(movedClip: Clip, otherClipsInTrack: Clip[]) {
		if (!timeline || pixelsPerSecond <= 0) return;

		const snapThresholdPx = 10; // Pixels
		const snapThresholdSeconds = snapThresholdPx / pixelsPerSecond;
		const movedClipDuration = movedClip.endTime - movedClip.startTime;

		// Calculate the *current* position based on the *potential* drop location
        // dndzone usually places the item somewhat correctly, but we might refine it.
        // Let's use the position already present in the movedClip object as finalized by dndzone
        const rawStartTime = movedClip.startTime;
		const rawEndTime = movedClip.endTime;


		let bestSnapDelta = Infinity;
		let finalStartTime = rawStartTime; // Start with the raw position

		// Potential snap targets: playhead + other clips' starts/ends
		const snapTargets: number[] = [playheadPosition];
		otherClipsInTrack.forEach(clip => {
			snapTargets.push(clip.startTime, clip.endTime);
		});

		// Check snapping for movedClip's start time
		snapTargets.forEach(targetTime => {
			const delta = Math.abs(rawStartTime - targetTime);
			if (delta < snapThresholdSeconds && delta < Math.abs(bestSnapDelta)) {
				bestSnapDelta = targetTime - rawStartTime; // Keep the sign
				finalStartTime = targetTime; // Snap start to target
			}
		});

		// Check snapping for movedClip's end time
		snapTargets.forEach(targetTime => {
			const delta = Math.abs(rawEndTime - targetTime);
			if (delta < snapThresholdSeconds && delta < Math.abs(bestSnapDelta)) {
				bestSnapDelta = targetTime - rawEndTime; // Keep the sign
				finalStartTime = targetTime - movedClipDuration; // Snap end to target (adjust start)
			}
		});


		// If a snap occurred (bestSnapDelta is smaller than threshold)
		if (Math.abs(bestSnapDelta) < snapThresholdSeconds) {
			const snappedStartTime = finalStartTime;
			const snappedEndTime = snappedStartTime + movedClipDuration;

			// --- Overlap Check against other clips ---
			let overlaps = false;
			for (const otherClip of otherClipsInTrack) {
				// Check for overlap: (StartA < EndB) and (EndA > StartB)
                // Use a tiny epsilon to avoid issues with exact float matches at edges
                const epsilon = 0.001;
				if (snappedStartTime < otherClip.endTime - epsilon && snappedEndTime > otherClip.startTime + epsilon) {
					overlaps = true;
					console.log(`Snap reverted: Overlap detected with clip ${otherClip.id}`);
					break;
				}
			}

			// Apply snap only if no overlap
			if (!overlaps && snappedStartTime >= 0) { // Also ensure start time isn't negative
				console.log(`Snapping clip ${movedClip.id} from ${rawStartTime.toFixed(2)} to ${snappedStartTime.toFixed(2)}`);
				movedClip.startTime = snappedStartTime;
				movedClip.endTime = snappedEndTime;
			} else {
				// Revert to raw position if snap caused overlap or negative time
                // Ensure the object reflects this if it was temporarily modified
                movedClip.startTime = rawStartTime;
                movedClip.endTime = rawEndTime;
                console.log(`Snap reverted for clip ${movedClip.id}, using original drop position ${rawStartTime.toFixed(2)}`);
			}
		}
		// If no snap occurred, movedClip retains its raw position from dndzone finalize
	}

	// --- NEW: Delete Clip Function (with gap closing) ---
	function deleteClip(trackId: string, clipId: string) {
		if (!timeline) return;
		console.log(`Attempting to delete clip ${clipId} from track ${trackId}`);

		const targetTrackIndex = timeline.tracks.findIndex(t => t.id === trackId);
		if (targetTrackIndex === -1) {
			console.error(`Delete failed: Track ${trackId} not found.`);
			return;
		}

		const track = timeline.tracks[targetTrackIndex];
		const targetClipIndex = track.clips.findIndex(c => c.id === clipId);
		if (targetClipIndex === -1) {
			console.error(`Delete failed: Clip ${clipId} not found in track ${trackId}.`);
			return;
		}

		// --- Gap Closing Logic ---
		// 1. Get end time of the clip *before* the deleted one (or 0 if it's the first)
		const previousClipEndTime = targetClipIndex > 0 ? track.clips[targetClipIndex - 1].endTime : 0;

		// 2. Remove the clip
		const deletedClip = track.clips.splice(targetClipIndex, 1)[0]; // Get the deleted clip details if needed later
		console.log(`Deleted clip ${clipId} from track ${trackId}`);

		// 3. Shift subsequent clips
		let lastEndTime = previousClipEndTime;
		for (let i = targetClipIndex; i < track.clips.length; i++) {
			const currentClip = track.clips[i];
			const duration = currentClip.endTime - currentClip.startTime;
			currentClip.startTime = lastEndTime;
			currentClip.endTime = lastEndTime + duration;
			lastEndTime = currentClip.endTime; // Update for the next iteration
			console.log(`Shifted clip ${currentClip.id} to start at ${currentClip.startTime.toFixed(2)}`);
		}

		// Trigger reactivity
		timeline = timeline;
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
		// Add a small buffer? No, just use max + 1 if empty for visual minimum.
        // Ensure ruler extends slightly beyond last clip end for better visibility.
		return maxEndTime > 0 ? maxEndTime + (10 / pixelsPerSecond) : 1; // Add a little time padding based on zoom, or 1s min
	});

	// --- Effects ---

	// (Option 1 Integration) Effect to update pixelsPerSecond using minimum duration logic
	$effect(() => {
		const _ww = windowWidth; // Depend on window width changes
		const actualDuration = actualTotalDuration(); // Get the real max end time

		// Use actual duration, but ensure it's not zero to avoid division by zero
        const durationForScaling = Math.max(actualDuration, 1); // Use at least 1s for scaling base

		console.log(`Effect (pixelsPerSecond) - Actual Max Duration: ${actualDuration.toFixed(2)}, Duration Used for Scaling: ${durationForScaling.toFixed(2)}`);

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
			// Ensure we cover the full actual duration
			if (time > duration + interval) break; // Go slightly beyond duration


			const positionPx = time * pps;
			const isMajor = i % majorIntervalMultiplier === 0;
			let label = '';
			if (isMajor || interval < 0.5) { // Label majors, or all if very granular
				if (time < 1 && time > 0) { // Sub-second formatting
					label = `${time.toFixed(1)}s`;
				} else if (time % 1 === 0) { // Whole seconds
					// Optional: Convert to M:SS for longer times
					if (time >= 60) {
						const minutes = Math.floor(time / 60);
						const seconds = time % 60;
						label = `${minutes}:${seconds.toString().padStart(2, '0')}`;
					} else {
						label = `${time.toFixed(0)}s`;
					}
				} else { // Fractional seconds > 1
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
	function onTrimPointerDown(e: PointerEvent, clip: Clip, handle: 'start' | 'end') {
		if (!timeline || isTrimming) return; // Prevent starting new trim if already trimming
		e.preventDefault();
		e.stopPropagation(); // Prevent drag start

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
			// Constraint: Timeline start cannot be negative
			newStartTime = Math.max(0, newStartTime);
			// Constraint: Cannot drag start handle beyond end handle
			newStartTime = Math.min(newStartTime, maxStartTime);


			// Constraint: Cannot drag source start time below 0
			if (newSourceStartTime < 0) {
				// How much did we try to go below zero?
				const overshoot = 0 - newSourceStartTime;
				newSourceStartTime = 0;
				// Adjust timeline start time back by the overshoot amount (in seconds)
				newStartTime = initialClip.startTime + deltaTime + overshoot;
                // Re-apply constraints after adjustment
                newStartTime = Math.max(0, newStartTime);
                newStartTime = Math.min(newStartTime, maxStartTime);
			}

			// Apply constrained values
			clip.startTime = newStartTime;
			clip.sourceStartTime = newSourceStartTime;
			// Ensure endTime and sourceEndTime don't change
			clip.endTime = initialClip.endTime;
			clip.sourceEndTime = initialClip.sourceEndTime;


		} else { // handle === 'end'
			let newEndTime = initialClip.endTime + deltaTime;
			let newSourceEndTime = initialClip.sourceEndTime + deltaTime;

			// Constraint: Cannot make clip shorter than min duration from the start
			const minEndTime = initialClip.startTime + minClipDuration;
			// Constraint: Cannot drag end handle before start handle
            newEndTime = Math.max(newEndTime, minEndTime);


			// Constraint: Cannot drag source end time beyond media duration
			if (newSourceEndTime > mediaDuration) {
				// How much did we try to go beyond the duration?
				const overshoot = newSourceEndTime - mediaDuration;
				newSourceEndTime = mediaDuration;
				// Adjust timeline end time back by the overshoot amount (in seconds)
				newEndTime = initialClip.endTime + deltaTime - overshoot;
                // Re-apply constraint after adjustment
                newEndTime = Math.max(newEndTime, minEndTime);
			}

			// Apply constrained values
			clip.endTime = newEndTime;
			clip.sourceEndTime = newSourceEndTime;
			// Ensure startTime and sourceStartTime don't change
			clip.startTime = initialClip.startTime;
			clip.sourceStartTime = initialClip.sourceStartTime;

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
		if (targetElement && targetElement.hasPointerCapture && targetElement.hasPointerCapture(e.pointerId)) {
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
	function splitClipAtPlayhead() {
		console.log('Splitting at playheadPosition:', playheadPosition); // <-- ADDED LOG
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

	// --- Exposed Method for Parent Interaction ---
	export function getTimeFromXCoordinate(clientX: number): number {
		if (!timelineEditorElement || pixelsPerSecond <= 0) {
			console.warn('Cannot calculate time from coordinate: Missing element or invalid pixelsPerSecond.');
			return -1; // Indicate error or invalid state
		}
		const rect = timelineEditorElement.getBoundingClientRect();
		const scrollLeft = timelineEditorElement.scrollLeft;
		const relativeX = clientX - rect.left + scrollLeft;
		const time = relativeX / pixelsPerSecond;
		// Ensure time is not negative and potentially clamp to total duration?
		// For now, just ensure non-negative.
		return Math.max(0, time);
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
						<div class="track mb-1 border rounded bg-white d-flex align-items-center" data-track-id={track.id}>
							<!-- Removed Track Header -->
							<div
								class="clips-area flex-grow-1"
								use:dndzone={{
										items: track.clips,
										flipDurationMs,
										type: track.type // Ensure only compatible items can be dropped
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

										<!-- *** NEW: Delete Clip Button *** -->
										<button
											class="btn btn-sm btn-danger delete-clip-btn"
											onclick={(e) => { e.stopPropagation(); deleteClip(track.id, clip.id); }}
											title="Delete clip"
										>
											× <!-- Simple 'x' icon -->
										</button>
										<!-- *** END NEW *** -->
									</div>
								{/each}
							</div>
							 <!-- Delete Track Button (Moved to end) -->
							 <button
								class="btn btn-sm btn-outline-danger delete-track-btn ms-1"
								onclick={() => onDeleteTrack(track.id)}
								title="Delete Track"
							>
								× <!-- Simple 'x' icon -->
							</button>
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
		/* Add overall container styles if needed */
	}
	.timeline-editor {
		overflow-x: auto;
		width: 100%;
		position: relative;
		/* background-color: #e9ecef; */ /* Optional background for scroll area */
		/* border: 1px solid #dee2e6; */ /* Optional border */
	}
	.timeline-inner {
		 min-width: 100%; /* Ensures it fills at least the container width */
		 position: relative;
		 /* background-color: white; */ /* Background for the content area */
		 padding-bottom: 10px; /* Space at the bottom */
	}

	/* --- Time Ruler Styles --- */
	.time-ruler {
		position: relative; /* Changed from sticky for simpler layout */
		overflow: visible; /* Allow labels to potentially overflow slightly */
		height: 25px; /* Adjust height as needed */
		/* background-color: #f8f9fa; */ /* Light background */
		/* border-bottom: 1px solid #dee2e6; */ /* Separator line */
	}
	.time-ruler-background {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 25px; /* Match ruler height */
		background-color: #f8f9fa;
		border-bottom: 1px solid #dee2e6;
		z-index: 0; /* Behind markers and playhead */
	}
	.time-marker {
		position: absolute;
		bottom: 0;
		width: 1px;
		background-color: #ccc; /* Minor tick color */
		z-index: 1; /* Above background */
	}
	.time-marker-minor { height: 8px; } /* Minor tick height */
	.time-marker-major { height: 15px; background-color: #999;} /* Major tick height and color */
	 .time-marker .time-label {
		position: absolute;
		bottom: 100%; /* Position above the tick line */
		left: 2px; /* Slight offset from the tick */
		transform: translateY(-2px); /* Small gap */
		font-size: 0.7rem;
		color: #6c757d;
		white-space: nowrap;
	}
	.playhead-ruler {
		position: absolute;
		top: 0; /* Align to top of ruler */
		bottom: 0; /* Stretch to bottom */
		width: 2px;
		background-color: red;
		z-index: 10; /* Above markers */
		transform: translateX(-1px); /* Center the line on the pixel */
		pointer-events: none; /* Allow clicks through */
	}

	/* --- Tracks Area Styles --- */
	.tracks-container {
		 position: relative; /* For absolute positioning of playhead */
		 /* margin-top: 5px; */ /* Optional spacing below ruler */
	}
	.playhead-line {
		position: absolute;
		top: -25px; /* Extend up into the ruler area visually */
		bottom: 0; /* Stretch to bottom of container */
		width: 2px;
		background-color: red;
		z-index: 5; /* Above clips, below active elements */
		pointer-events: none; /* Allow clicks through */
		transform: translateX(-1px); /* Center the line */
	}
	.track {
		 /* Removed display: flex and flex-direction */
		 background-color: #f1f3f5; /* Slightly different from clips area */
		 /* Ensure clips-area can still fill space if needed, though block layout might suffice */
	}

	/* Removed .track-header CSS rules */

	.clips-area {
		/* flex-grow: 1 is now on the element */
		position: relative; /* Needed for absolute positioning of clips */
		height: 60px; /* Fixed height for track content */
		background-color: #e9ecef;
		/* Optional subtle background pattern */
		background-image: linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px);
		background-size: 1px 10px; /* Creates subtle horizontal lines */
		overflow: hidden; /* Hide parts of clips that might render outside */
		/* border-radius: 0.2rem; */ /* Match parent track border */
	}

	/* --- Clip Styling --- */
	.clip {
		position: absolute;
		top: 10px; /* Position clip within the clips-area */
		height: 40px; /* Height of the clip representation */
		/* background-color: defined inline */
		cursor: grab;
		overflow: hidden;
		font-size: 0.75rem;
		box-sizing: border-box; /* Include border in width/height */
		display: flex;
		align-items: center; /* Vertically center content (label) */
		padding: 0; /* Remove default padding */
		z-index: 2; /* Above track background */
	}

	.clip:active {
		cursor: grabbing;
		z-index: 3; /* Bring active clip to front */
	}
	.clip-label {
		pointer-events: none; /* Allow clicks/drags through label */
		flex-grow: 1; /* Allow label to take up space */
		text-align: center;
		margin: 0 10px; /* Space between label and handles/delete button */
		color: #333;
		font-size: 0.7rem;
		overflow:hidden; /* Prevent long names breaking layout */
		white-space:nowrap;
	}
	.trim-handle {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 8px; /* Width of the handle */
		cursor: ew-resize; /* East-West resize cursor */
		background-color: rgba(0, 0, 0, 0.3); /* Semi-transparent handle */
		border: 1px solid rgba(255, 255, 255, 0.7); /* Subtle border */
		z-index: 4; /* Above clip content, below active clip */
		flex-shrink: 0; /* Prevent handles from shrinking */
	}
	 .trim-handle:hover {
		 background-color: rgba(0, 0, 0, 0.5); /* Darker on hover */
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

	/* --- NEW: Delete Clip Button Style --- */
	.delete-clip-btn {
		position: absolute;
		top: 1px;
		right: 1px;
		width: 16px; /* Small size */
		height: 16px;
		padding: 0;
		font-size: 10px; /* Small 'x' */
		line-height: 14px; /* Center 'x' */
		border-radius: 50%; /* Circle button */
		z-index: 4; /* Same level as trim handles */
		opacity: 0.6; /* Slightly transparent */
		transition: opacity 0.2s ease-in-out;
	}
	.clip:hover .delete-clip-btn {
		opacity: 1; /* Fully visible on clip hover */
	}
	.delete-clip-btn:hover {
		background-color: #dc3545; /* Bootstrap danger color */
		border-color: #dc3545;
		color: white;
	}
	/* --- END NEW --- */

	.delete-track-btn {
		/* Style the delete button for the whole track */
		width: 24px;
		height: 24px;
		padding: 0;
		line-height: 1;
		font-size: 1rem;
		align-self: center; /* Center vertically within the track div */
		/* margin-left is now handled by ms-1 class */
		margin-right: 4px; /* Add some space at the end */
		flex-shrink: 0; /* Prevent shrinking */
	}
</style>
