<script lang="ts">
	import type { Project } from '$lib/types'; // Use shared type

	// Use $props rune for component properties
	// Expect projects array and an onProjectClick callback function
	let {
		projects = [] as Project[],
		onProjectClick = (project: Project) => {} // Default no-op callback
	}: {
		projects?: Project[];
		onProjectClick?: (project: Project) => void; // Callback prop for clicks
	} = $props();

	// Function to format the timestamp
	function formatDate(timestamp: number): string {
		if (!timestamp) return 'N/A';
		try {
			return new Date(timestamp).toLocaleDateString();
		} catch (e) {
			console.error('Error formatting date:', e);
			return 'Invalid Date';
		}
	}
</script>

<div class="container mt-4">
	<div class="card shadow-sm">
		<div class="card-header d-flex justify-content-between align-items-center">
			<h2 class="h5 mb-0">Projects</h2>
			<!-- Removed redundant Create New Project button -->
		</div>
		<div class="card-body">
			{#if projects.length > 0}
				<ul class="list-group list-group-flush">
					{#each projects as project (project.id)}
						<li
							class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
							onclick={() => onProjectClick(project)}
							onkeypress={(e) => e.key === 'Enter' && onProjectClick(project)}
							role="button"
							tabindex="0"
						>
							<span class="fw-bold">{project.name}</span>
							<small class="text-muted">Created: {formatDate(project.createdAt)}</small>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-center text-muted mt-3">No projects found. Create one to get started!</p>
			{/if}
		</div>
	</div>
</div>

<!-- No <style> block needed as we are using Bootstrap classes -->
