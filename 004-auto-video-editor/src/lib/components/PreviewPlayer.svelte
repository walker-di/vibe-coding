<script lang="ts">
	import type { Timeline, MediaItem, Clip } from '$lib/types'; // Use MediaItem
	import { BROWSER } from 'esm-env';

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
			// Capture playing state *before* initiating seek
			wasPlayingBeforeSeek = isPlaying;
			console.log(`Seeking video to: ${targetTimeInVideo.toFixed(2)} (Playhead: ${playheadPosition.toFixed(2)}). Was playing: ${wasPlayingBeforeSeek}`);
			isSeeking = true; // Set flag before seeking
			videoElement.currentTime = targetTimeInVideo;
			// isSeeking flag will be reset by the 'seeked' event listener below
			// Playback will be potentially resumed in handleSeeked
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
			console.log('Video paused');
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
			// If the video was playing before the seek started, set the state to reflect that we *should* be playing.
			if (wasPlayingBeforeSeek) {
				console.log('Seek finished, setting isPlaying intent to true.');
				isPlaying = true; // Set the desired state
			}
			// Reset the tracking flag
			wasPlayingBeforeSeek = false;
			// A separate effect will handle calling video.play() based on isPlaying state when not seeking.
		};
		const handleTimeUpdate = () => {
			// Only process if playing, not seeking, and clip/video exist
			if (isPlaying && !isSeeking && activeClipInfo && video) {
				// Check if video's current time is at or beyond the source end time for this clip
				// Use a small tolerance (e.g., 0.05s) to avoid missing the exact end due to event timing
				const sourceEndTime = activeClipInfo.clipSourceEndTime;
				if (video.currentTime >= sourceEndTime - 0.05) {
					const clipEndTime = activeClipInfo.clipEndTime;
					console.log(`Reached source end time near ${sourceEndTime.toFixed(2)}s. Setting playhead to clip end ${clipEndTime.toFixed(2)}s.`);

					// Set playhead exactly to the clip's timeline end time.
					// This will trigger the main $effect to find the next clip (if any) and handle seeking/loading.
					// The handleSeeked function will handle resuming playback if wasPlayingBeforeSeek was true.
					if (Math.abs(playheadPosition - clipEndTime) > 0.01) { // Avoid redundant updates
						// Important: Capture playing state *before* changing playhead, as this might trigger effects immediately
						wasPlayingBeforeSeek = isPlaying;
						playheadPosition = clipEndTime;
					} else {
						// If playhead is already at the end, but video is still playing (somehow?), pause it.
						console.log(`Playhead already at clip end ${clipEndTime.toFixed(2)}s, but timeupdate fired. Pausing.`);
						video.pause();
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

	// --- NEW Effect: Sync video play/pause state with isPlaying state ---
	$effect(() => {
		if (!videoElement || isSeeking) {
			// Don't interfere while seeking
			return;
		}

		if (isPlaying) {
			// If state says play, and we're not already playing (or pending play), play it.
			if (videoElement.paused) {
				console.log('Effect: isPlaying is true, calling video.play()');
				videoElement.play().catch(error => {
					console.error("Error attempting to play video:", error);
					// If play fails, reset state
					isPlaying = false;
				});
			}
		} else {
			// If state says pause, and we're not already paused, pause it.
			if (!videoElement.paused) {
				console.log('Effect: isPlaying is false, calling video.pause()');
				videoElement.pause();
			}
		}
	});


	// --- Public API / Parent Interaction ---
	// These now just update the isPlaying state, the effect handles the rest.
	export function play() {
		console.log('API: play() called, setting isPlaying = true');
		isPlaying = true;
	}
	export function pause() {
		console.log('API: pause() called, setting isPlaying = false');
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
