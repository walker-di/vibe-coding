<script lang="ts">
	import type { Snippet } from 'svelte';

	// Define props for the snippets
	let {
		mediaPanel,
		previewPanel,
		timelinePanel,
		headerPanel // Optional header snippet
	}: {
		mediaPanel?: Snippet;
		previewPanel?: Snippet;
		timelinePanel?: Snippet;
		headerPanel?: Snippet;
	} = $props();
</script>

<div class="container-fluid vh-100 d-flex flex-column p-0">
	<!-- Optional Header/Navbar Area -->
	<div class="bg-light border-bottom p-2">
		{#if headerPanel}
			{@render headerPanel()}
		{:else}
			<span class="navbar-brand mb-0 h1">AI Video Editor</span>
		{/if}
	</div>

	<!-- Main Editor Area -->
	<div class="row g-0 flex-grow-1 overflow-hidden">
		<!-- Left Panel (e.g., Media Library, Effects) -->
		<div class="col-md-3 d-flex flex-column border-end bg-light">
			{#if mediaPanel}
				{@render mediaPanel()}
			{:else}
				<!-- Default content if snippet not provided -->
				<div class="p-2 border-bottom">
					<h6>Media Library</h6>
				</div>
				<div class="flex-grow-1 p-2 overflow-auto">
					<p class="text-muted small">Media panel content goes here.</p>
				</div>
			{/if}
		</div>

		<!-- Center Panel (e.g., Preview, Timeline) -->
		<div class="col-md-9 d-flex flex-column">
			<!-- Top: Preview Window -->
			<div class="border-bottom flex-grow-1 d-flex align-items-center justify-content-center bg-dark text-light">
				{#if previewPanel}
					{@render previewPanel()}
				{:else}
					<p>Preview Window</p>
				{/if}
			</div>

			<!-- Bottom: Timeline Editor -->
			<div class="border-top p-2 bg-light" style="min-height: 200px; max-height: 40%;">
				{#if timelinePanel}
					{@render timelinePanel()}
				{:else}
					<h6>Timeline</h6>
					<p class="text-muted small">Timeline panel content goes here.</p>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	/* Ensure layout fills viewport height */
	/* vh-100 on container-fluid helps */
	/* overflow-hidden on the row prevents double scrollbars */
	/* overflow-auto on specific panels allows internal scrolling */
</style>
