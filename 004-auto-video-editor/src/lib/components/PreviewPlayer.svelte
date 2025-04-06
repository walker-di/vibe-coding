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

		// Check if seeking is needed (avoid small floating point differences and seeking while video is playing back naturally)
		if (Math.abs(videoElement.currentTime - targetTimeInVideo) > 0.2 && !isPlaying) {
			console.log(`Seeking video to: ${targetTimeInVideo.toFixed(2)} (Playhead: ${playheadPosition.toFixed(2)})`);
			isSeeking = true; // Set flag before seeking
			videoElement.currentTime = targetTimeInVideo;
			// isSeeking flag will be reset by the 'seeked' event listener below
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
		};
		const handleTimeUpdate = () => {
			// Only update playhead if video is playing naturally (not seeking)
			if (isPlaying && !isSeeking && activeClipInfo) {
				// Calculate timeline position from video time
				const currentTimelinePos = video.currentTime - activeClipInfo.clipSourceStartTime + activeClipInfo.clipStartTime;
				// Avoid minor fluctuations causing feedback loops
				if (Math.abs(playheadPosition - currentTimelinePos) > 0.05) {
					playheadPosition = currentTimelinePos;
				}
			}
		};
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
	export function play() {
		videoElement?.play();
	}
	export function pause() {
		videoElement?.pause();
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
