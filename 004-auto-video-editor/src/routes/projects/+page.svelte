<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation'; // Import goto for navigation
	import ProjectList from '$lib/components/ProjectList.svelte';
	import CreateProjectModal from '$lib/components/CreateProjectModal.svelte';
	import type { Project } from '$lib/types';

	let projects = $state<Project[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let showCreateModal = $state(false);

	async function fetchProjects() {
		isLoading = true;
		error = null;
		try {
			const response = await fetch('/api/projects');
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			projects = await response.json();
		} catch (e) {
			console.error('Failed to fetch projects:', e);
			error = e instanceof Error ? e.message : 'Failed to load projects.';
			projects = []; // Clear projects on error
		} finally {
			isLoading = false;
		}
	}

	// Adjusted to accept name directly, matching the prop type for CreateProjectModal
	async function handleCreateProject(projectName: string) {
		if (!projectName || projectName.trim() === '') {
			// Basic validation, modal might handle this better
			// This check might be redundant if the modal already validates
			alert('Project name cannot be empty.');
			return;
		}

		try {
			const response = await fetch('/api/projects', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ name: projectName.trim() })
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Failed to create project: ${response.status} ${errorText}`);
			}

			// const newProject: Project = await response.json(); // Get the new project details
			showCreateModal = false; // Close modal on success
			await fetchProjects(); // Refresh the list
		} catch (e) {
			console.error('Error creating project:', e);
			alert(`Error creating project: ${e instanceof Error ? e.message : 'Unknown error'}`);
			// Optionally keep modal open or provide specific feedback
		}
	}

	function handleProjectClick(project: Project) {
		console.log('Navigating to project:', project.id);
		goto(`/projects/${project.id}`); // Use goto for navigation
	}

	// Fetch projects when the component mounts
	$effect(() => {
		fetchProjects();
	});
</script>

<div class="container mt-4">
	<div class="d-flex justify-content-between align-items-center mb-3">
		<h1>My Projects</h1>
		<button class="btn btn-primary" onclick={() => (showCreateModal = true)}>
			Create New Project
		</button>
	</div>

	{#if isLoading}
		<p>Loading projects...</p>
	{:else if error}
		<div class="alert alert-danger" role="alert">
			Error loading projects: {error}
		</div>
	{:else}
		<!-- Pass projects and the click handler function as props -->
		<ProjectList {projects} onProjectClick={handleProjectClick} />
	{/if}
</div>

{#if showCreateModal}
	<!-- Use bind:show and pass createProject function as prop -->
	<CreateProjectModal bind:show={showCreateModal} createProject={handleCreateProject} />
{/if}

<!-- Basic Styling (assuming Bootstrap is loaded globally via app.html or layout) -->
<style>
	/* Add any page-specific styles here if needed */
</style>
