<script lang="ts">
  // Basic Timeline Editor Component
  import { flip } from 'svelte/animate';
  import { dndzone, type DndEvent } from 'svelte-dnd-action';
  import type { Timeline, Track, Clip } from '$lib/types'; // Assuming types are defined here

  let { timeline = $bindable() }: { timeline?: Timeline } = $props();

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
  let currentTimeline = $state(timeline ?? dummyTimeline);
  const flipDurationMs = 200; // Animation duration

  function handleDndConsider(e: CustomEvent<DndEvent<Clip>>, trackId: string) {
    const targetTrackIndex = currentTimeline.tracks.findIndex(t => t.id === trackId);
    if (targetTrackIndex === -1) return;

    // Update the clips array for the specific track
    currentTimeline.tracks[targetTrackIndex].clips = e.detail.items;
    // Note: This simple update assumes dragging only within the same track for now.
    // More complex logic needed for dragging between tracks or from media library.
  }

  function handleDndFinalize(e: CustomEvent<DndEvent<Clip>>, trackId: string) {
     const targetTrackIndex = currentTimeline.tracks.findIndex(t => t.id === trackId);
    if (targetTrackIndex === -1) return;

    // Update the clips array for the specific track with the reordered items
    // We are removing the automatic time recalculation for now to fix the snapping bug.
    // Clips will keep their original start/end times but maintain the new order.
    currentTimeline.tracks[targetTrackIndex].clips = e.detail.items;

    // Optional: Recalculate total duration if needed, but avoid changing clip times here.
    // let overallMaxEndTime = 0;
    // currentTimeline.tracks.forEach(track => {
    //   track.clips.forEach(clip => {
    //     overallMaxEndTime = Math.max(overallMaxEndTime, clip.endTime);
    //   });
    // });
    // currentTimeline.totalDuration = Math.max(1, Math.ceil(overallMaxEndTime));

    console.log(`DND Finalized for track ${trackId}. New order:`, e.detail.items);
    // console.log(`Current Total Duration: ${currentTimeline.totalDuration}`);
  }
  let playheadPosition = $state(0); // Position in seconds, initially 0
  let zoomLevel = $state(1); // Zoom level, 1 = 100%
  const timeRulerInterval = 1; // Base interval for markers

  // --- Zoom Controls ---
  function zoomIn() {
    zoomLevel = Math.min(zoomLevel * 1.5, 10); // Increase zoom, max 10x
  }
  function zoomOut() {
    zoomLevel = Math.max(zoomLevel / 1.5, 0.1); // Decrease zoom, min 0.1x
  }

  // --- Time Ruler Calculation (adjusts based on zoom) ---
  let timeMarkers: { time: number; positionPercent: number }[] = $state([]);

  $effect(() => {
    const newMarkers: { time: number; positionPercent: number }[] = [];
    const duration = currentTimeline.totalDuration;
    // Adjust interval based on zoom? For now, keep it simple.
    const interval = timeRulerInterval;
    const totalWidthPercent = 100 * zoomLevel; // Total width relative to container

    for (let time = 0; time <= duration; time += interval) {
      const positionPercent = duration > 0 ? (time / duration) * totalWidthPercent : 0;
      newMarkers.push({ time, positionPercent });
    }
    timeMarkers = newMarkers;
  });

  // --- Calculated Styles based on Zoom ---
  // Note: getClipLeft/Width are not used when using flexbox layout for clips
  const timelineInnerWidth = $derived(`${100 * zoomLevel}%`);
  // const getClipLeft = (clip: Clip) => `${currentTimeline.totalDuration > 0 ? (clip.startTime / currentTimeline.totalDuration) * 100 * zoomLevel : 0}%`;
  // const getClipWidth = (clip: Clip) => `${currentTimeline.totalDuration > 0 ? ((clip.endTime - clip.startTime) / currentTimeline.totalDuration) * 100 * zoomLevel : 0}%`;
  const getPlayheadLeft = () => `${currentTimeline.totalDuration > 0 ? (playheadPosition / currentTimeline.totalDuration) * 100 * zoomLevel : 0}%`;

</script>

<div class="timeline-editor-container border border-secondary rounded p-2 bg-light">
  <div class="d-flex justify-content-between align-items-center mb-2">
    <h5 class="mb-0">Timeline</h5>
    <!-- Zoom Controls -->
    <div>
      <button class="btn btn-sm btn-outline-secondary me-1" onclick={zoomOut} disabled={zoomLevel <= 0.1}>-</button>
      <span class="me-1">Zoom: {Math.round(zoomLevel * 100)}%</span>
      <button class="btn btn-sm btn-outline-secondary" onclick={zoomIn} disabled={zoomLevel >= 10}>+</button>
    </div>
  </div>

  <div class="timeline-editor position-relative">
    <!-- Inner container that scrolls and scales -->
    <div class="timeline-inner" style:width={timelineInnerWidth}>
      <!-- Time Ruler -->
      <div class="time-ruler position-relative mb-2" style="height: 20px; background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
        {#each timeMarkers as marker (marker.time)}
          <div class="time-marker position-absolute" style:left="{`${marker.positionPercent}%`}">
            <span class="time-label">{marker.time}s</span>
          </div>
        {/each}
        <!-- Playhead Indicator in Ruler -->
        <div class="playhead-ruler position-absolute" style:left={getPlayheadLeft()}></div>
      </div>

      <!-- Tracks Area -->
      <div class="tracks-container position-relative">
        <!-- Playhead Line -->
        <div class="playhead-line position-absolute" style:left={getPlayheadLeft()}></div>

        {#each currentTimeline.tracks as track (track.id)}
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
                  class="clip border rounded mx-1"
                  animate:flip={{ duration: flipDurationMs }}
                  style:height="40px"
                  style:min-width="{`${(clip.endTime - clip.startTime) * 20 * zoomLevel}px`}"
                  style:background-color={track.type === 'video' ? '#aaddff' : '#ffddaa'}
                  title={`Clip ${clip.id} (${clip.startTime}s - ${clip.endTime}s)`}
                  data-clip-id={clip.id}>
                  <small class="p-1 d-block text-truncate">{clip.mediaId}</small>
                </div>
              {/each}
            </div>
          </div>
        {/each}
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
    justify-content: center;
    padding: 0 0.5rem; /* Add some padding */
  }
  .clip:active {
    cursor: grabbing;
  }
</style>
