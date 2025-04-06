<script module lang="ts">
	// Use module context for defineMeta
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ProjectEditorLayout from '$lib/components/ProjectEditorLayout.svelte';

	// Use defineMeta provided by @storybook/addon-svelte-csf
	const { Story } = defineMeta({
		title: 'Layouts/ProjectEditorLayout',
		component: ProjectEditorLayout,
		tags: ['autodocs'], // Enable automatic documentation
		parameters: {
			// Optional: Tell Storybook to render fullscreen for layout components
			layout: 'fullscreen'
		}
		// No args needed for this basic layout yet
	});
</script>

<!-- Define stories using the Story component -->

<!-- Default story rendering the layout -->
<Story name="Default" />
