<script module lang="ts">
	// Use module context for defineMeta
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { action } from '@storybook/addon-actions'; // To log actions
	import MediaUpload from '$lib/components/MediaUpload.svelte';

	// Use defineMeta provided by @storybook/addon-svelte-csf
	// Only destructure Story, meta is implicitly handled by defineMeta
	const { Story } = defineMeta({
		title: 'Components/MediaUpload',
		component: MediaUpload,
		tags: ['autodocs'], // Enable automatic documentation
		argTypes: {
			// Define controls for props in Storybook UI
			multiple: { control: 'boolean' },
			accept: { control: 'text' },
			// Note: Callbacks/actions don't typically need an argType control,
			// but we define the action in the 'args' below.
		},
		// Define default arguments for all stories unless overridden
		args: {
			multiple: true,
			accept: 'video/*,audio/*',
			onFilesSelected: action('filesSelected') // Log calls to this prop
		}
	});
</script>

<!-- Define stories using the Story component -->

<!-- Default story using the default args -->
<Story name="Default" />

<!-- Story allowing only single file selection -->
<Story
	name="SingleFile"
	args={{
		multiple: false,
		accept: 'image/*', // Example: accept only images
		onFilesSelected: action('singleFileSelected')
	}}
/>

<!-- Story with specific video types -->
<Story
	name="SpecificVideoTypes"
	args={{
		accept: 'video/mp4,video/webm',
		onFilesSelected: action('specificVideoSelected')
	}}
/>
