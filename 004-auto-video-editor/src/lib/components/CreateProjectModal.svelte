<script lang="ts">
	import { type Snippet } from 'svelte';

	let {
		show = $bindable(false), // Prop to control modal visibility, bindable
		createProject, // Callback function when 'Create' is clicked
		children // Snippet for the trigger element (e.g., a button)
	}: {
		show?: boolean;
		createProject: (name: string) => void | Promise<void>;
		children?: Snippet; // Make children optional
	} = $props();

	let projectName = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state('');

	function handleClose() {
		if (isSubmitting) return; // Prevent closing while submitting
		show = false;
		projectName = ''; // Reset name on close
		errorMessage = ''; // Reset error on close
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault(); // Prevent default form submission
		if (!projectName.trim()) {
			errorMessage = 'Project name cannot be empty.';
			return;
		}
		errorMessage = '';
		isSubmitting = true;
		try {
			await createProject(projectName.trim());
			handleClose(); // Close modal on successful creation
		} catch (error) {
			console.error('Error creating project:', error);
			errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
		} finally {
			isSubmitting = false;
		}
	}

	// Handle Escape key to close modal
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleClose();
		}
	}
</script>

{#if children}
	<div onclick={() => (show = true)} role="button" tabindex="0" onkeydown={()=>{}}>
		{@render children()}
	</div>
{/if}

{#if show}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- Backdrop -->
	<div
		class="modal-backdrop fade show"
		onclick={handleClose}
		onkeydown={handleKeydown}
	></div>

	<!-- Modal -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="modal fade show d-block"
		tabindex="-1"
		role="dialog"
		aria-labelledby="createProjectModalLabel"
		aria-modal="true"
		onkeydown={handleKeydown}
	>
		<div class="modal-dialog modal-dialog-centered" role="document">
			<div class="modal-content">
				<div class="modal-header">
					<h5 class="modal-title" id="createProjectModalLabel">Create New Project</h5>
					<button
						type="button"
						class="btn-close"
						data-bs-dismiss="modal"
						aria-label="Close"
						onclick={handleClose}
						disabled={isSubmitting}
					></button>
				</div>
				<div class="modal-body">
					{#if errorMessage}
						<div class="alert alert-danger" role="alert">
							{errorMessage}
						</div>
					{/if}
					<form id="createProjectForm" onsubmit={handleSubmit}>
						<div class="mb-3">
							<label for="projectName" class="form-label">Project Name</label>
							<input
								type="text"
								class="form-control"
								id="projectName"
								bind:value={projectName}
								required
								disabled={isSubmitting}
								aria-describedby="projectNameHelp"
							/>
							<div id="projectNameHelp" class="form-text">Enter a name for your new video project.</div>
						</div>
					</form>
				</div>
				<div class="modal-footer">
					<button
						type="button"
						class="btn btn-secondary"
						data-bs-dismiss="modal"
						onclick={handleClose}
						disabled={isSubmitting}
					>
						Cancel
					</button>
					<button
						type="submit"
						form="createProjectForm"
						class="btn btn-primary"
						disabled={isSubmitting || !projectName.trim()}
					>
						{#if isSubmitting}
							<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
							Creating...
						{:else}
							Create Project
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
