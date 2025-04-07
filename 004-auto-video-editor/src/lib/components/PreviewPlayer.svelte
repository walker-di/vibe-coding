<script lang="ts">
	import type { Timeline, MediaItem, Clip } from '$lib/types'; // Use MediaItem
	import { BROWSER } from 'esm-env';
	import { tick } from 'svelte'; // Import tick

	// Define the expected structure for active clip details
	interface ActiveClipDetail {
		mediaId: string;
		sourceUrl: string; // Assuming MediaItem has sourcePath which needs prefixing
		clipStartTime: number;
		clipSourceStartTime: number;
		clipEndTime: number; // Needed for logic potentially
		clipSourceEndTime: number; // Needed for logic potentially
	}

	let {
		timeline, // Reactive timeline object
		playheadPosition = $bindable(0), // Make bindable, default to 0
		mediaMap // Map<string, MediaItem> for easy media lookup
	}: {
		timeline: Timeline;
		playheadPosition?: number; // Make optional as it has default
		mediaMap: Map<string, MediaItem>;
	} = $props();

	let videoElement: HTMLVideoElement | undefined = $state();
	let activeClipInfo: ActiveClipDetail | null = $derived(getActiveClipInfo());
	let isPlaying = $state(false); // Local state reflecting video element's status
	let isSeeking = $state(false); // Flag to prevent timeupdate feedback loop during seeks
	let wasPlayingBeforeSeek = $state(false); // NEW: Track if playing before seek started

	// Function to determine the active clip based on playheadPosition and timeline
	function getActiveClipInfo(): ActiveClipDetail | null {
		if (!timeline || !timeline.tracks) return null;

		for (const track of timeline.tracks) {
			// For now, just consider the first video track for simplicity
			// TODO: Handle multiple tracks, audio tracks etc.
			if (track.type === 'video') {
				for (const clip of track.clips) {
					if (playheadPosition >= clip.startTime && playheadPosition < clip.endTime) {
						const media = mediaMap.get(clip.mediaId);
						if (media) {
							// Assuming sourcePath is relative to /static/
							// TODO: Make base path configurable or derive properly
							const sourceUrl = media.sourcePath;
							return {
								mediaId: clip.mediaId,
								sourceUrl: sourceUrl,
								clipStartTime: clip.startTime,
								clipSourceStartTime: clip.sourceStartTime,
								clipEndTime: clip.endTime,
								clipSourceEndTime: clip.sourceEndTime
							};
						}
					}
				}
			}
		}
		// console.log('No active clip found at position:', playheadPosition);
		return null;
	}

	// --- NEW Helper: Find the next clip starting exactly at a given time ---
	function findNextClip(startTime: number): Clip | null {
		if (!timeline || !timeline.tracks) return null;
		for (const track of timeline.tracks) {
			// TODO: Handle multiple tracks properly
			if (track.type === 'video') {
				// Sort clips by start time to reliably find the *next* one starting at the exact time
				const sortedClips = [...track.clips].sort((a, b) => a.startTime - b.startTime);
				for (const clip of sortedClips) {
					// Find the first clip that starts exactly at the given startTime (with tolerance)
					if (Math.abs(clip.startTime - startTime) < 0.01) {
						return clip;
					}
					// Optimization: if we've passed the target start time in the sorted list, stop searching this track
					if (clip.startTime > startTime) {
						break;
					}
				}
			}
		}
		return null;
	}


	// Effect to load source and seek when active clip or playhead changes
	$effect(() => {
		if (!BROWSER || !videoElement || !activeClipInfo) return;

		const currentSrc = videoElement.currentSrc || videoElement.src; // Handle potential differences
		const targetSrc = activeClipInfo.sourceUrl;

		// Load new source if needed
		if (!currentSrc || !currentSrc.endsWith(targetSrc)) {
			console.log('Loading new source:', targetSrc);
			videoElement.src = targetSrc;
			// Seeking will happen after metadata loads or if source is the same
		}

		// Seek logic
		const targetTimeInVideo = playheadPosition - activeClipInfo.clipStartTime + activeClipInfo.clipSourceStartTime;

		// Check if seeking is needed (avoid small floating point differences)
		// Allow seeking even if isPlaying is true, if the target time is significantly different (e.g., clip transition)
		if (Math.abs(videoElement.currentTime - targetTimeInVideo) > 0.2) {
			// No need to capture playing state here anymore, it's captured in handleTimeUpdate
			console.log(`Seeking video to: ${targetTimeInVideo.toFixed(2)} (Playhead: ${playheadPosition.toFixed(2)}).`);
			isSeeking = true; // Set flag before seeking
			videoElement.currentTime = targetTimeInVideo;
			// isSeeking flag will be reset by the 'seeked' event listener
			// Playback will be potentially resumed in handleSeeked based on wasPlayingBeforeSeek
		}
	});

	// Effect to manage video event listeners
	$effect(() => {
		if (!BROWSER || !videoElement) return;

		const video = videoElement; // Capture variable for cleanup function

		const handlePlay = () => {
			console.log('Video playing');
			isPlaying = true;
		};
		const handlePause = () => {
			// Add check if seeking to differentiate pauses
			console.log(`Video paused. Seeking: ${isSeeking}`);
			isPlaying = false;
		};
		const handleEnded = () => {
			console.log('Video ended');
			isPlaying = false;
			// Optionally move playhead back to start or handle looping?
		};
		const handleSeeked = () => {
			console.log('Video seeked');
			isSeeking = false; // Reset seeking flag
			// Only reset seeking flag. Playback control is handled elsewhere.
			console.log('Video seeked');
			isSeeking = false;
			wasPlayingBeforeSeek = false; // Reset flag here too
		};
		const handleTimeUpdate = () => {
			// Only process if playing, not seeking, and clip/video exist
			if (isPlaying && !isSeeking && activeClipInfo && video) {
				// Check if video's current time is at or beyond the source end time for this clip
				const sourceEndTime = activeClipInfo.clipSourceEndTime;
				if (video.currentTime >= sourceEndTime) { // Removed tolerance
					const clipEndTime = activeClipInfo.clipEndTime;
					console.log(`Reached source end time at ${sourceEndTime.toFixed(2)}s. Setting playhead to clip end ${clipEndTime.toFixed(2)}s.`);

					// Pause the video first
					video.pause();

					// Find the next clip
					const nextClip = findNextClip(clipEndTime);

					if (nextClip) {
						console.log(`Found next clip ${nextClip.id}. Setting playhead and attempting play.`);
						// Set playhead to start of next clip (triggers main effect to seek)
						playheadPosition = nextClip.startTime;
						// Immediately signal intent to play the next clip
						video.play().catch(e => console.error("Error playing next clip:", e));
					} else {
						console.log('No next clip found. Setting playhead to end.');
						// Set playhead to the end of the last clip
						playheadPosition = clipEndTime;
						// isPlaying should already be false due to pause
					}

					// Stop further processing for this time update event after handling the end condition
					return;
				}

				// --- If not at the end, update playhead normally ---
				const currentTimelinePos = video.currentTime - activeClipInfo.clipSourceStartTime + activeClipInfo.clipStartTime;
				// Ensure calculated position doesn't exceed clip end due to timing issues
				const effectiveTimelinePos = Math.min(currentTimelinePos, activeClipInfo.clipEndTime);
				if (Math.abs(playheadPosition - effectiveTimelinePos) > 0.05) {
					playheadPosition = effectiveTimelinePos;
				}
			}
		};
		// --- Corrected placement for handleLoadedMetadata ---
		const handleLoadedMetadata = () => {
			console.log('Video metadata loaded. Duration:', video.duration);
			// Potential place to re-trigger seek if source just loaded
			if (activeClipInfo) {
				const targetTimeInVideo = playheadPosition - activeClipInfo.clipStartTime + activeClipInfo.clipSourceStartTime;
				if (Math.abs(video.currentTime - targetTimeInVideo) > 0.2) {
					console.log(`Seeking video after metadata load to: ${targetTimeInVideo.toFixed(2)}`);
					isSeeking = true;
					video.currentTime = targetTimeInVideo;
				}
			}
		};
		const handleError = () => {
			console.error('Video Error:', video.error);
		};

		video.addEventListener('play', handlePlay);
		video.addEventListener('pause', handlePause);
		video.addEventListener('ended', handleEnded);
		video.addEventListener('seeked', handleSeeked);
		video.addEventListener('timeupdate', handleTimeUpdate);
		video.addEventListener('loadedmetadata', handleLoadedMetadata);
		video.addEventListener('error', handleError);

		// Cleanup function
		return () => {
			console.log('Cleaning up video listeners');
			video.removeEventListener('play', handlePlay);
			video.removeEventListener('pause', handlePause);
			video.removeEventListener('ended', handleEnded);
			video.removeEventListener('seeked', handleSeeked);
			video.removeEventListener('timeupdate', handleTimeUpdate);
			video.removeEventListener('loadedmetadata', handleLoadedMetadata);
			video.removeEventListener('error', handleError);
		};
	});


	// --- Public API / Parent Interaction ---
	// Call video element methods directly. State is updated by event handlers.
	export function play() {
		console.log('API: play() called');
		videoElement?.play().catch(e => console.error("API play error:", e));
	}
	export function pause() {
		console.log('API: pause() called');
		videoElement?.pause();
		// Explicitly set isPlaying false here in case pause event doesn't fire reliably
		// or if called while seeking
		isPlaying = false;
	}

</script>

<div class="preview-player-container">
	<video bind:this={videoElement} controls>
		<!-- Controls attribute added for basic browser controls initially -->
		Your browser does not support the video tag.
	</video>
	{#if activeClipInfo}
		<p>Active Clip: {activeClipInfo.mediaId} | Source: {activeClipInfo.sourceUrl}</p>
		<p>Playhead: {playheadPosition.toFixed(2)}s | Video Time: {videoElement?.currentTime.toFixed(2)}s</p>
	{:else}
		<p>No active clip at playhead position {playheadPosition.toFixed(2)}s</p>
	{/if}
	<p>Is Playing: {isPlaying}</p>
</div>

<style>
	.preview-player-container {
		width: 100%;
		background-color: #222;
		padding: 10px;
		color: white;
	}
	video {
		width: 100%;
		max-height: 400px; /* Example max height */
		display: block;
		background-color: black;
	}
	p {
		font-size: 0.8em;
		margin-top: 5px;
	}
</style>
