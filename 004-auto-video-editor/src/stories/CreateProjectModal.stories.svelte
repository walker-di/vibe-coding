<script module lang="ts">
	// Use module context for defineMeta
	import { defineMeta } from '@storybook/addon-svelte-csf'; // Removed SvelteComponent import
	import { fn } from '@storybook/test';
	import CreateProjectModal from '$lib/components/CreateProjectModal.svelte';
	// Removed Snippet import as we'll define template directly

	// Removed TriggerButtonSnippet definition

	// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
	const { Story } = defineMeta({ // Only destructure Story
		title: 'Components/CreateProjectModal',
		component: CreateProjectModal,
		tags: ['autodocs'], // Enable automatic documentation
		argTypes: {
			// Define arg types if needed for controls, but defaults are often sufficient
			show: { control: 'boolean' }, // Allow controlling visibility via Storybook UI for testing
		},
		// Default args for all stories, including the mock function
		args: {
			createProject: fn(async (name: string) => {
				console.log('Storybook: createProject called with name:', name);
				// Simulate API call delay
				await new Promise((resolve) => setTimeout(resolve, 1000));
				// Simulate potential error
				if (name.toLowerCase() === 'fail') {
					alert(`Failed to create project "${name}" (simulated error).`); // Give visual feedback
					throw new Error('Failed to create project (simulated error).');
				}
				console.log('Storybook: Project creation simulated successfully.');
				alert(`Project "${name}" created (simulated)!`); // Give visual feedback
			}) satisfies (name: string) => Promise<void>,
			show: false // Default state for the modal
		}
	});
</script>

<!-- Default story: Renders the component hidden by default. Use 'show' control to view. -->
<Story name="Default" />

<!-- Story to show the modal initially visible -->
<Story
	name="VisibleInitially"
	args={{
		show: true // Override default show state
		// 'createProject' defaults from meta.args
		// 'children' is not needed as the modal is shown directly and children is optional
	}}
/>

<!-- Story demonstrating error state -->
<Story
	name="ErrorState"
	args={{
		show: true, // Start visible to easily test error
		// 'createProject' defaults from meta.args (will throw error if name is 'fail')
		// 'children' is not needed
	}}
	play={async ({ canvasElement, step }) => {
		// Example of using play function to interact and test error state
		// Note: Requires @storybook/testing-library, @storybook/addon-interactions
		// const user = userEvent.setup(); // If using userEvent
		// const canvas = within(canvasElement);
		// await step('Enter project name that causes failure', async () => {
		//   const input = canvas.getByLabelText('Project Name');
		//   await user.type(input, 'fail');
		// });
		// await step('Click create button', async () => {
		//   const createButton = canvas.getByRole('button', { name: /Create Project/i });
		//   await user.click(createButton);
		// });
		// Add assertions here to check for error message display if needed
	}}
/>
