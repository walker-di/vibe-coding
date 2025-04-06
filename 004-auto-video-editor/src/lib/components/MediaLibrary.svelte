<script lang="ts">
	// Import and use the shared MediaItem type
	import type { MediaItem } from '$lib/types';
	import { dndzone } from 'svelte-dnd-action'; // Import dndzone

	let {
		mediaItems = [] as MediaItem[],
		onMediaSelect = (item: MediaItem) => {}, // Callback when an item is selected/clicked
		onMediaDelete = (item: MediaItem) => {} // Callback when delete is requested
	}: {
		mediaItems?: MediaItem[];
		onMediaSelect?: (item: MediaItem) => void; // Add back prop
		onMediaDelete?: (item: MediaItem) => void; // Add delete prop
	} = $props();

	// Updated function to format duration (handles number | null | undefined)
	function formatDuration(seconds: number | null | undefined): string {
		if (seconds === undefined || seconds === null || isNaN(seconds)) return '--:--';
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = Math.floor(seconds % 60);
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
	}

	// Function to generate a placeholder thumbnail URL based on ID (simple hash)
	// In a real app, thumbnails would be generated/fetched properly.
	function getPlaceholderThumbnail(id: string): string {
		// Simple hash function for variety
		let hash = 0;
		for (let i = 0; i < id.length; i++) {
			hash = (hash << 5) - hash + id.charCodeAt(i);
			hash |= 0; // Convert to 32bit integer
		}
		const color = (hash & 0x00ffffff).toString(16).padStart(6, '0');
		return `https://via.placeholder.com/150/${color}/808080?text=Media`;
	}
</script>

<div class="media-library card shadow-sm">
	<div class="card-header">
		<h3 class="h6 mb-0">Media Library</h3>
	</div>
	<div class="card-body overflow-auto" style="max-height: 400px;">
		{#if mediaItems.length > 0}
			<div class="row row-cols-2 row-cols-md-3 g-2">
				{#each mediaItems as item (item.id)}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="col">
						<div
							class="card h-100 media-item cursor-pointer"
							use:dndzone={{ items: [item], type: 'mediaLibraryItem' }}
							onclick={() => onMediaSelect(item)}
							onkeypress={(e) => e.key === 'Enter' && onMediaSelect(item)}
							role="button"
							tabindex="0"
							aria-label={`Select or drag media ${item.name}`}
							style="cursor: grab;"
						>
							<!-- Delete Button -->
							<button
								type="button"
								class="btn btn-danger btn-sm position-absolute top-0 end-0 m-1 p-0 lh-1"
								style="width: 1.2rem; height: 1.2rem; z-index: 1;"
								aria-label={`Delete media ${item.name}`}
								onclick={(e) => { e.stopPropagation(); onMediaDelete(item); }}
							>
								&times; <!-- Simple 'x' character -->
							</button>

							{#if item.type === 'video'}
								<img
									src={item.thumbnailUrl ?? getPlaceholderThumbnail(item.id)}
									class="card-img-top object-fit-cover"
									alt="Thumbnail for {item.name}"
									style="height: 80px;"
									onerror={(event) => {
										// Prevent infinite loop if placeholder also fails
										if (event.currentTarget instanceof HTMLImageElement) {
											event.currentTarget.onerror = null;
											event.currentTarget.src = getPlaceholderThumbnail(item.id);
										}
									}}
								/> <!-- Use actual thumbnail or placeholder -->
							{:else if item.type === 'audio'}
								<div
									class="card-img-top bg-secondary d-flex align-items-center justify-content-center"
									style="height: 80px;"
								>
									<!-- Audio Icon -->
									<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="white" class="bi bi-music-note-beamed" viewBox="0 0 16 16"> <path d="M6 13c0 1.105-1.12 2-2.5 2S1 14.105 1 13c0-1.104 1.12-2 2.5-2s2.5.896 2.5 2m9-2c0 1.105-1.12 2-2.5 2s-2.5-.895-2.5-2 1.12-2 2.5-2 2.5.895 2.5 2"/> <path fill-rule="evenodd" d="M14 11V2h1v9zM6 3v10H5V3z"/> <path d="M5 2.905a1 1 0 0 1 .9-.995l8-.8a1 1 0 0 1 1.1.995V3L5 4z"/> </svg>
								</div>
							{/if}
							<div class="card-body p-2">
								<p class="card-text small text-truncate mb-0" title={item.name}>{item.name}</p>
								<small class="text-muted">{formatDuration(item.duration)}</small>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-center text-muted mt-3">No media files added yet.</p>
		{/if}
	</div>
</div>

<style>
	.media-library .card-body {
		/* Add scrollbar styling if desired */
	}
	.media-item:hover,
	.media-item:focus {
		border-color: var(--bs-primary);
		box-shadow: 0 0 0 0.25rem rgba(var(--bs-primary-rgb), 0.25);
	}
	.cursor-pointer { /* Add back cursor pointer style */
		cursor: pointer;
	}
	.object-fit-cover {
		object-fit: cover;
	}
</style>
