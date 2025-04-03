<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { Modal } from 'bootstrap';

  export let show = false; // Control visibility from parent

  let modalElement: HTMLElement;
  let modalInstance: Modal | null = null;
  let storyPrompt = ''; // Single prompt for the whole story
  let title = ''; // Keep optional title

  const dispatch = createEventDispatcher();

  // Function to handle modal closing event
  const handleModalHidden = () => {
    show = false; // Sync state back to parent
    dispatch('close');
  };

  // Initialize Bootstrap modal instance
  onMount(() => {
    // Import bootstrap dynamically
    import('bootstrap/dist/js/bootstrap.bundle.min.js').then((bootstrap) => {
      if (modalElement) {
        modalInstance = new bootstrap.Modal(modalElement);
        // Handle modal close events (e.g., clicking backdrop or escape key)
        modalElement.addEventListener('hidden.bs.modal', handleModalHidden);
      }
    }).catch(err => console.error("Failed to load Bootstrap JS:", err));

    // Cleanup function (must be synchronous)
    return () => {
      modalInstance?.dispose(); // Cleanup on component destroy
      if (modalElement) {
         modalElement.removeEventListener('hidden.bs.modal', handleModalHidden);
      }
    };
  });

  // React to changes in the 'show' prop
  $: {
    if (modalInstance) {
      if (show) {
        modalInstance.show();
      } else {
        modalInstance.hide();
      }
    }
  }

  function handleSubmit() {
    if (!storyPrompt.trim()) {
        // Basic validation: ensure prompt is not empty
        alert('Por favor, insira um prompt para a história.');
        return;
    }
    dispatch('create', {
      title: title.trim() || null, // Send null if title is empty
      storyPrompt: storyPrompt.trim(),
    });
    // Optionally clear fields after submit
    // title = '';
    // storyPrompt = '';
    show = false; // Close modal after dispatching
  }

  function handleCancel() {
    show = false; // This will trigger the hide logic in the reactive block
  }
</script>

<!-- The Modal -->
<div class="modal fade" bind:this={modalElement} tabindex="-1" aria-labelledby="creationModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <!-- Modal Header -->
      <div class="modal-header">
        <h5 class="modal-title" id="creationModalLabel">Criar Novo Quadro</h5>
        <button type="button" class="btn-close" on:click={handleCancel} aria-label="Close"></button>
      </div>

      <!-- Modal Body -->
      <div class="modal-body">
        <form on:submit|preventDefault={handleSubmit}>
          <div class="mb-3">
            <label for="title" class="form-label">Título (Opcional)</label>
            <input type="text" class="form-control" id="title" bind:value={title} placeholder="Ex: Cena de Abertura"/>
          </div>
          <div class="mb-3">
            <label for="storyPrompt" class="form-label">Prompt da História</label>
            <textarea class="form-control" id="storyPrompt" rows="8" bind:value={storyPrompt} required placeholder="Descreva a história ou cena que você quer transformar em storyboard..."></textarea>
            <div id="promptHelp" class="form-text">Descreva a sequência de eventos, personagens e cenários. A IA tentará dividir isso em quadros com prompts de imagem, narração e BGM.</div>
          </div>
        </form>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" on:click={handleCancel}>Cancelar</button>
        <button type="button" class="btn btn-primary" on:click={handleSubmit}>Criar</button>
      </div>
    </div>
  </div>
</div>
