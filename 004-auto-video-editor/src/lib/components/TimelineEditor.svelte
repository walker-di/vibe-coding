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

    // Update the clips array for the specific track
    currentTimeline.tracks[targetTrackIndex].clips = e.detail.items;
    // Potentially save the state or trigger an update event here
    console.log(`DND Finalized for track ${trackId}:`, e.detail.items);
  }
  let playheadPosition = $state(0); // Position in seconds, initially 0
  const timeRulerInterval = 1; // Show marker every 1 second
  let timeMarkers: { time: number; positionPercent: number }[] = $state([]); // Use $state for the array

  // Calculate markers using $effect when totalDuration changes
  $effect(() => {
    const newMarkers: { time: number; positionPercent: number }[] = [];
    const duration = currentTimeline.totalDuration; // Get reactive value
    for (let time = 0; time <= duration; time += timeRulerInterval) {
      const positionPercent = duration > 0 ? (time / duration) * 100 : 0;
      newMarkers.push({ time, positionPercent });
    }
    timeMarkers = newMarkers; // Update the state variable
  });

</script>

<div class="timeline-editor border border-secondary rounded p-2 bg-light position-relative">
  <h5 class="mb-3">Timeline</h5>

  <!-- Time Ruler -->
  <div class="time-ruler position-relative mb-2" style="height: 20px; background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
    {#each timeMarkers as marker (marker.time)}
      <div class="time-marker position-absolute" style:left="{`${marker.positionPercent}%`}">
        <span class="time-label">{marker.time}s</span>
      </div>
    {/each}
     <!-- Playhead Indicator in Ruler -->
     <div class="playhead-ruler position-absolute" style:left="{`${(playheadPosition / currentTimeline.totalDuration) * 100}%`}"></div>
  </div>

  <!-- Tracks Area -->
  <div class="tracks-container position-relative">
     <!-- Playhead Line -->
    <div class="playhead-line position-absolute" style:left="{`${(playheadPosition / currentTimeline.totalDuration) * 100}%`}"></div>

    {#each currentTimeline.tracks as track (track.id)}
      <div class="track mb-2 p-2 border rounded bg-white position-relative" data-track-id={track.id}>
        <span class="badge bg-secondary me-2">{track.type.toUpperCase()}</span>
      <!-- Apply dndzone to the clips area -->
      <div
        class="clips-area position-relative"
        style="height: 50px; background-color: #eee;"
        use:dndzone={{ items: track.clips, flipDurationMs, type: track.type }}
        on:consider={(e) => handleDndConsider(e, track.id)}
        on:finalize={(e) => handleDndFinalize(e, track.id)}
      >
        {#each track.clips as clip (clip.id)}
          <div
            class="clip position-absolute border rounded"
            animate:flip={{ duration: flipDurationMs }}
            style:left="{`${(clip.startTime / currentTimeline.totalDuration) * 100}%`}"
            style:width="{`${((clip.endTime - clip.startTime) / currentTimeline.totalDuration) * 100}%`}"
            style:height="100%"
            style:background-color={track.type === 'video' ? '#aaddff' : '#ffddaa'}
            title={`Clip ${clip.id} (${clip.startTime}s - ${clip.endTime}s)`}
            data-clip-id={clip.id}
          >
            <small class="p-1 d-block text-truncate">{clip.mediaId}</small>
          </div>
        {/each}
      </div>
    </div>
  {/each}
  </div>
</div>

<style>
  .time-ruler {
    overflow: hidden; /* Hide overflow labels for now */
    min-width: 600px; /* Match track min-width */
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
  .timeline-editor {
    overflow-x: auto;
  }
  .track {
    min-width: 600px; /* Ensure tracks have some minimum width */
  }
  .clips-area {
    /* Styles for the area containing clips */
  }
  .clip {
    cursor: grab;
    overflow: hidden;
    font-size: 0.75rem;
    box-sizing: border-box; /* Include border in width/height */
  }
  .clip:active {
    cursor: grabbing;
  }
</style>
