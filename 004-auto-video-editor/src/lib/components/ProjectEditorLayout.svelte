<script lang="ts">
	// No props needed for this basic layout yet
	// Props might be added later for configuration or data
	// let {} = $props();
</script>

<div class="container-fluid vh-100 d-flex flex-column p-0">
	<!-- Optional Header/Navbar Area -->
	<div class="bg-light border-bottom p-2">
		<span class="navbar-brand mb-0 h1">AI Video Editor - Project Name</span>
		<!-- Add controls like Save, Export etc. later -->
	</div>

	<!-- Main Editor Area -->
	<div class="row g-0 flex-grow-1 overflow-hidden">
		<!-- Left Panel (e.g., Media Library, Effects) -->
		<div class="col-md-3 d-flex flex-column border-end bg-light">
			<div class="p-2 border-bottom">
				<h6>Media Library</h6>
			</div>
			<div class="flex-grow-1 p-2 overflow-auto">
				<!-- Placeholder for MediaLibrary component -->
				<p class="text-muted small">Media items will appear here.</p>
			</div>
			<div class="p-2 border-top">
				<!-- Placeholder for MediaUpload component -->
				<button class="btn btn-sm btn-secondary w-100">Upload Media</button>
			</div>
		</div>

		<!-- Center Panel (e.g., Preview, Timeline) -->
		<div class="col-md-9 d-flex flex-column">
			<!-- Top: Preview Window -->
			<div class="border-bottom flex-grow-1 d-flex align-items-center justify-content-center bg-dark text-light">
				<!-- Placeholder for Preview Window -->
				<p>Preview Window</p>
			</div>

			<!-- Bottom: Timeline Editor -->
			<div class="border-top p-2 bg-light" style="min-height: 200px; max-height: 40%;">
				<!-- Placeholder for Timeline Editor -->
				<h6>Timeline</h6>
				<p class="text-muted small">Timeline tracks and clips will appear here.</p>
			</div>
		</div>

		<!-- Right Panel (Optional - e.g., Inspector) -->
		<!-- <div class="col-md-2 border-start bg-light"> -->
		<!--   <h6>Inspector</h6> -->
		<!--   <p class="text-muted small">Details for selected item.</p> -->
		<!-- </div> -->
	</div>
</div>

<style>
	/* Ensure layout fills viewport height */
	/* vh-100 on container-fluid helps */
	/* overflow-hidden on the row prevents double scrollbars */
	/* overflow-auto on specific panels allows internal scrolling */
</style>
