<script lang="ts">
  import type { PageData } from './$types'; // Import PageData type for load function result
  import { goto } from '$app/navigation'; // For navigation after creation
  import { onMount } from 'svelte';

  export let data: PageData; // Receive data from load function
  // data.storyboards should be { id: string, name: string, createdAt: string | null }[]
  $: storyboards = data.storyboards || [];
  $: loadError = data.error; // Get potential error message from load

  let isLoading = false; // State for API call loading
  let apiError: string | null = null; // State for API call errors
  let newStoryboardName: string = ''; // Input for new storyboard name

  // Function to handle creating a new storyboard
  async function handleCreateStoryboard() {
    if (!newStoryboardName.trim()) {
      apiError = 'Please enter a name for the new storyboard.';
      return;
    }

    isLoading = true;
    apiError = null;

    try {
      const response = await fetch('/api/storyboard/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newStoryboardName }), // Send the name
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API Error: ${response.statusText}`);
      }

      const result = await response.json(); // Read the success message and new ID
      console.log('API Response:', result);

      if (result.storyboardId) {
        // Navigate to the newly created storyboard's page
        await goto(`/storyboard/${result.storyboardId}`);
      } else {
        throw new Error('API did not return a storyboard ID.');
      }

    } catch (err: any) {
      console.error('Failed to create storyboard:', err);
      apiError = err.message || 'An unknown error occurred while creating the storyboard.';
    } finally {
      isLoading = false;
      newStoryboardName = ''; // Clear input field
    }
  }

  // Optional: Function to format date nicely
  function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  }

</script>

<svelte:head>
  <title>My Storyboards</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
</svelte:head>

<div class="container mt-4">
  <!-- Header Row -->
  <div class="d-flex justify-content-between align-items-center mb-4">
    <h1 class="mb-0">Meus Storyboards</h1>
    <!-- Removed voice selection and export button -->
  </div>

  <!-- Create New Storyboard Section -->
  <div class="card mb-4 shadow-sm">
    <div class="card-body">
      <h5 class="card-title">Criar Novo Storyboard</h5>
      <div class="input-group">
        <input
          type="text"
          class="form-control"
          placeholder="Nome do novo storyboard..."
          bind:value={newStoryboardName}
          on:keydown={(e) => e.key === 'Enter' && handleCreateStoryboard()}
          disabled={isLoading}
        />
        <button
          class="btn btn-primary"
          on:click={handleCreateStoryboard}
          disabled={isLoading || !newStoryboardName.trim()}
        >
          {#if isLoading}
            <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            Criando...
          {:else}
            <i class="bi bi-plus-lg me-1"></i> Criar
          {/if}
        </button>
      </div>
    </div>
  </div>


  <!-- Loading Indicator for initial load (if needed, handled by load function) -->

  <!-- API Error Display -->
   {#if apiError}
       <div class="alert alert-danger alert-dismissible fade show" role="alert">
         {apiError}
         <button type="button" class="btn-close" on:click={() => apiError = null} aria-label="Close"></button>
       </div>
   {/if}

  <!-- Load Error Display -->
   {#if loadError}
       <div class="alert alert-warning" role="alert">
         {loadError}
       </div>
   {/if}


  <!-- Storyboards List -->
  <div class="list-group">
    {#if storyboards.length > 0}
      {#each storyboards as storyboard (storyboard.id)}
        <a href="/storyboard/{storyboard.id}" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
          <span>
            <i class="bi bi-journal-richtext me-2"></i>
            {storyboard.name || 'Storyboard Sem Título'}
          </span>
          <small class="text-muted">Criado em: {formatDate(storyboard.createdAt)}</small>
          <!-- Add Edit/Delete buttons here later if needed -->
        </a>
      {/each}
    {:else if !loadError}
      <p class="text-center text-muted mt-4">Nenhum storyboard encontrado. Crie um novo para começar!</p>
    {/if}
  </div>

</div>

<!-- Removed CreationModal -->
