<script lang="ts">
	import { page } from '$app/stores';

	let projectId = $state('');

	// Get projectId from the URL parameters reactively
	$effect(() => {
		projectId = $page.params.projectId;
	});
</script>

<div class="container mt-4">
	<h1>Project Editor</h1>
	<p>Editing Project ID: {projectId}</p>

	<!-- Placeholder for the actual editor components -->
	<div class="alert alert-info" role="alert">
		Project editor content will go here (Media Library, Timeline, Preview).
	</div>
</div>

<style>
	/* Add page-specific styles if needed */
</style>
