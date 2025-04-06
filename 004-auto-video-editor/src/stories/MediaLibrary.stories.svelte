<script module lang="ts">
	// Use module context for defineMeta
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { action } from '@storybook/addon-actions'; // To log actions
	import MediaLibrary from '$lib/components/MediaLibrary.svelte';

	// Define sample media data
	// In a real scenario, thumbnailUrl might come from a backend service
	const sampleMedia = [
		{
			id: 'media-1',
			name: 'Opening Scene Long Take.mp4',
			type: 'video' as const, // Add 'as const'
			thumbnailUrl: 'https://via.placeholder.com/150/771796', // Placeholder image
			duration: 125 // seconds
		},
		{
			id: 'media-2',
			name: 'Background Music Loop.wav',
			type: 'audio' as const, // Add 'as const'
			duration: 60
		},
		{
			id: 'media-3',
			name: 'Interview Clip B-Roll.mov',
			type: 'video' as const, // Add 'as const'
			thumbnailUrl: 'https://via.placeholder.com/150/24f355', // Placeholder image
			duration: 45
		},
		{
			id: 'media-4',
			name: 'Voice Over Narration Final.mp3',
			type: 'audio' as const, // Add 'as const'
			duration: 92
		},
		{
			id: 'media-5',
			name: 'Drone Footage Coastline.mkv',
			type: 'video' as const, // Add 'as const'
			// No thumbnail example
			duration: 180
		}
	];

	// Use defineMeta provided by @storybook/addon-svelte-csf
	const { Story } = defineMeta({
		title: 'Components/MediaLibrary',
		component: MediaLibrary,
		tags: ['autodocs'], // Enable automatic documentation
		argTypes: {
			// mediaItems is complex, usually better to set via args
		},
		// Define default arguments for all stories unless overridden
		args: {
			mediaItems: sampleMedia,
			onMediaSelect: action('mediaSelected') // Log calls to this prop
		}
	});
</script>

<!-- Define stories using the Story component -->

<!-- Default story using the default args -->
<Story name="Default" />

<!-- Story with no media items -->
<Story
	name="Empty"
	args={{
		mediaItems: [],
		onMediaSelect: action('mediaSelectedEmpty')
	}}
/>

<!-- Story with only audio items -->
<Story
	name="OnlyAudio"
	args={{
		mediaItems: sampleMedia.filter((item) => item.type === 'audio'),
		onMediaSelect: action('audioSelected')
	}}
/>
