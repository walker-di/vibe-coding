<script lang="ts">
  // Define the shape of a project object
  type Project = {
    id: string;
    name: string;
    createdAt: Date;
  };

  // Use $props rune for component properties
  let { projects = [] }: { projects?: Project[] } = $props();

  // Placeholder function for creating a new project
  function createNewProject() {
    console.log('Create New Project clicked');
    // In a real app, this would likely navigate or open a modal
  }

  // Placeholder function for opening a project
  function openProject(projectId: string) {
    console.log(`Open Project clicked: ${projectId}`);
    // In a real app, this would navigate to /projects/:projectId
  }
</script>

<div class="container mt-4">
  <div class="card shadow-sm">
    <div class="card-header d-flex justify-content-between align-items-center">
      <h2 class="h5 mb-0">Projects</h2>
      <button class="btn btn-primary btn-sm" onclick={createNewProject}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-plus-lg me-1" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2"/>
        </svg>
        Create New Project
      </button>
    </div>
    <div class="card-body">
      {#if projects.length > 0}
        <ul class="list-group list-group-flush">
          {#each projects as project (project.id)}
            <li
              class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
              onclick={() => openProject(project.id)}
              onkeypress={(e) => e.key === 'Enter' && openProject(project.id)}
              role="button"
              tabindex="0"
            >
              <span class="fw-bold">{project.name}</span>
              <small class="text-muted">Created: {project.createdAt.toLocaleDateString()}</small>
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
