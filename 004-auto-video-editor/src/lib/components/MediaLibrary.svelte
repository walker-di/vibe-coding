<script lang="ts">
	// Define a type for media items (can be expanded later)
	// This might eventually come from $lib/types if shared
	type MediaItem = {
		id: string;
		name: string;
		type: 'video' | 'audio';
		thumbnailUrl?: string; // Optional thumbnail for videos
		duration?: number; // Optional duration in seconds
	};

	let {
		mediaItems = [] as MediaItem[],
		onMediaSelect = (item: MediaItem) => {} // Callback when an item is selected/clicked
	}: {
		mediaItems?: MediaItem[];
		onMediaSelect?: (item: MediaItem) => void;
	} = $props();

	// Placeholder function to format duration (e.g., seconds to mm:ss)
	function formatDuration(seconds: number | undefined): string {
		if (seconds === undefined || isNaN(seconds)) return '--:--';
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = Math.floor(seconds % 60);
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
							class="card h-100 cursor-pointer media-item"
							onclick={() => onMediaSelect(item)}
							onkeypress={(e) => e.key === 'Enter' && onMediaSelect(item)}
							role="button"
							tabindex="0"
							aria-label={`Select media ${item.name}`}
						>
							{#if item.type === 'video' && item.thumbnailUrl}
								<img
									src={item.thumbnailUrl}
									class="card-img-top object-fit-cover"
									alt="Thumbnail for {item.name}"
									style="height: 80px;"
								/>
							{:else if item.type === 'audio'}
								<div
									class="card-img-top bg-secondary d-flex align-items-center justify-content-center"
									style="height: 80px;"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="32"
										height="32"
										fill="white"
										class="bi bi-music-note-beamed"
										viewBox="0 0 16 16"
									>
										<path
											d="M6 13c0 1.105-1.12 2-2.5 2S1 14.105 1 13c0-1.104 1.12-2 2.5-2s2.5.896 2.5 2m9-2c0 1.105-1.12 2-2.5 2s-2.5-.895-2.5-2 1.12-2 2.5-2 2.5.895 2.5 2"
										/>
										<path fill-rule="evenodd" d="M14 11V2h1v9zM6 3v10H5V3z" />
										<path d="M5 2.905a1 1 0 0 1 .9-.995l8-.8a1 1 0 0 1 1.1.995V3L5 4z" />
									</svg>
								</div>
							{:else}
								<!-- Fallback for video without thumbnail -->
								<div
									class="card-img-top bg-secondary d-flex align-items-center justify-content-center"
									style="height: 80px;"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="32"
										height="32"
										fill="white"
										class="bi bi-film"
										viewBox="0 0 16 16"
									>
										<path
											d="M0 1a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1zm4 0v6h8V1zm8 8H4v6h8zM1 1v2h2V1zm2 3H1v2h2zM1 7v2h2V7zm2 3H1v2h2zm-2 3v2h2v-2zM15 1h-2v2h2zm-2 3v2h2V4zm2 3h-2v2h2zm-2 3v2h2v-2zm2 3h-2v2h2z"
										/>
									</svg>
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
	.cursor-pointer {
		cursor: pointer;
	}
	.object-fit-cover {
		object-fit: cover;
	}
</style>
