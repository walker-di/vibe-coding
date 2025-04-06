<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		onFilesSelected, // Callback when files are selected
		multiple = true, // Allow multiple file selection by default
		accept = 'video/*,audio/*' // Default accepted file types
	}: {
		onFilesSelected: (files: FileList) => void;
		multiple?: boolean;
		accept?: string;
	} = $props();

	let isDragging = $state(false);
	let fileInput: HTMLInputElement | null = null;

	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files) {
			onFilesSelected(target.files);
			// Reset input value to allow selecting the same file again
			target.value = '';
		}
	}

	function handleClick() {
		fileInput?.click();
	}

	// Drag and Drop handlers
	function handleDragOver(event: DragEvent) {
		event.preventDefault(); // Necessary to allow drop
		isDragging = true;
	}

	function handleDragLeave() {
		isDragging = false;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		if (event.dataTransfer?.files) {
			onFilesSelected(event.dataTransfer.files);
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="media-upload-dropzone border border-2 border-dashed rounded p-4 text-center cursor-pointer {isDragging
		? 'border-primary bg-light'
		: 'border-secondary'}"
	onclick={handleClick}
	onkeypress={(e) => e.key === 'Enter' && handleClick()}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
	role="button"
	tabindex="0"
	aria-label="File upload drop zone"
>
	<input
		type="file"
		bind:this={fileInput}
		onchange={handleFileChange}
		{multiple}
		{accept}
		class="d-none"
		aria-hidden="true"
	/>
	{#if isDragging}
		<p class="h5 mb-0 text-primary">Drop files here!</p>
	{:else}
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="48"
			height="48"
			fill="currentColor"
			class="bi bi-cloud-arrow-up-fill mb-3 text-secondary"
			viewBox="0 0 16 16"
		>
			<path
				d="M8 2a5.53 5.53 0 0 0-3.594 1.342c-.766.66-1.321 1.52-1.464 2.383C1.266 6.095 0 7.555 0 9.318 0 11.366 1.708 13 3.781 13h8.906C14.502 13 16 11.57 16 9.773c0-1.636-1.242-2.969-2.834-3.194C12.923 3.999 10.69 2 8 2m2.354 5.146a.5.5 0 0 1-.708.708L8.5 6.707V10.5a.5.5 0 0 1-1 0V6.707L6.354 7.854a.5.5 0 1 1-.708-.708l2-2a.5.5 0 0 1 .708 0z"
			/>
		</svg>
		<p class="mb-0">Drag & drop files here, or click to select files.</p>
		<small class="text-muted">Accepted types: {accept}</small>
	{/if}
</div>

<style>
	.media-upload-dropzone {
		transition:
			background-color 0.2s ease-in-out,
			border-color 0.2s ease-in-out;
	}
	.cursor-pointer {
		cursor: pointer;
	}
</style>
