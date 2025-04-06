<script lang="ts">
	import { goto } from '$app/navigation';
	import { BROWSER } from 'esm-env'; // Import BROWSER check

	// Redirect immediately on the client-side when the page loads
	// Using $effect ensures it runs after initial mount if needed,
	// but onMount or just running directly in script might also work.
	// Checking BROWSER ensures this only runs client-side.
	if (BROWSER) {
		goto('/projects', { replaceState: true }); // Use replaceState to avoid adding '/' to history
	}

	// Optionally, add a fallback message in case JavaScript is disabled or redirect fails
</script>

<div class="container mt-5 text-center">
	<p>Redirecting to projects...</p>
	<noscript>
		<p>JavaScript is required to automatically redirect. Please <a href="/projects">click here</a> to continue.</p>
	</noscript>
</div>
