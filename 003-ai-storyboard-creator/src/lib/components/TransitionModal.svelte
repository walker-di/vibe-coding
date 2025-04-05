<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let show = false;
  export let currentFrameId: string | null = null; // ID of the frame *before* the transition
  export let nextFrameId: string | null = null; // ID of the frame *after* the transition
  export let initialTransitionType: string = 'none';
  export let initialTransitionDuration: number = 1.0;

  let selectedType: string = initialTransitionType;
  let selectedDuration: number = initialTransitionDuration;

  const dispatch = createEventDispatcher();

  // Restore full list based on user's ffmpeg -h filter=xfade output
  const transitionTypes = [
    { value: 'none', label: 'Nenhuma' }, // Keep 'none' as an option
    { value: 'fade', label: 'Fade' },
    { value: 'wipeleft', label: 'Wipe Left' },
    { value: 'wiperight', label: 'Wipe Right' },
    { value: 'wipeup', label: 'Wipe Up' },
    { value: 'wipedown', label: 'Wipe Down' },
    { value: 'slideleft', label: 'Slide Left' },
    { value: 'slideright', label: 'Slide Right' },
    { value: 'slideup', label: 'Slide Up' },
    { value: 'slidedown', label: 'Slide Down' },
    { value: 'circlecrop', label: 'Circle Crop' },
    { value: 'rectcrop', label: 'Rect Crop' },
    { value: 'distance', label: 'Distance' },
    { value: 'fadeblack', label: 'Fade Black' },
    { value: 'fadewhite', label: 'Fade White' },
    { value: 'radial', label: 'Radial' },
    { value: 'smoothleft', label: 'Smooth Left' },
    { value: 'smoothright', label: 'Smooth Right' },
    { value: 'smoothup', label: 'Smooth Up' },
    { value: 'smoothdown', label: 'Smooth Down' },
    { value: 'circleopen', label: 'Circle Open' },
    { value: 'circleclose', label: 'Circle Close' },
    { value: 'vertopen', label: 'Vert Open' },
    { value: 'vertclose', label: 'Vert Close' },
    { value: 'horzopen', label: 'Horz Open' },
    { value: 'horzclose', label: 'Horz Close' },
    { value: 'dissolve', label: 'Dissolve' }, // Common alternative name
    { value: 'pixelize', label: 'Pixelize' },
    { value: 'diagtl', label: 'Diagonal TL' },
    { value: 'diagtr', label: 'Diagonal TR' },
    { value: 'diagbl', label: 'Diagonal BL' },
    { value: 'diagbr', label: 'Diagonal BR' },
    // Add others from the help output if desired
  ];

  // Map for backend validation/use if needed, though backend uses the value directly
  const transitionTypesMap: { [key: string]: boolean } = transitionTypes.reduce((acc, t) => {
      acc[t.value] = true;
      return acc;
  }, {} as { [key: string]: boolean });


  function close() {
    // Reset to initial values when closing without saving
    selectedType = initialTransitionType;
    selectedDuration = initialTransitionDuration;
    dispatch('close');
  }

  function save() {
    if (!currentFrameId) return; // Should not happen if button logic is correct
    dispatch('save', {
      frameId: currentFrameId, // The transition settings belong to the frame *before* the gap
      transitionType: selectedType,
      transitionDuration: selectedDuration,
    });
    // Keep modal open until save is confirmed externally? Or close immediately? Let's close.
    // dispatch('close'); // Let the parent component close it after API call
  }

  // Update local state when props change (e.g., opening modal for a different transition)
  $: {
      selectedType = initialTransitionType;
      selectedDuration = initialTransitionDuration;
  }

</script>

{#if show}
<div class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Configurar Transição</h5>
        <button type="button" class="btn-close" on:click={close} aria-label="Close"></button>
      </div>
      <div class="modal-body">
        {#if currentFrameId && nextFrameId}
          <p class="small text-muted">Configurando transição do Quadro ID: ...{currentFrameId.slice(-6)} para Quadro ID: ...{nextFrameId.slice(-6)}</p>
        {:else}
           <p class="small text-danger">Erro: IDs dos quadros não fornecidos.</p>
        {/if}

        <div class="mb-3">
          <label for="transitionTypeSelect" class="form-label">Tipo de Transição:</label>
          <select id="transitionTypeSelect" class="form-select" bind:value={selectedType}>
            {#each transitionTypes as type}
              <option value={type.value}>{type.label}</option>
            {/each}
          </select>
        </div>

        <div class="mb-3">
          <label for="transitionDurationInput" class="form-label">Duração (segundos):</label>
          <input
            type="number"
            id="transitionDurationInput"
            class="form-control"
            bind:value={selectedDuration}
            min="0.1"
            max="5.0"
            step="0.1"
            disabled={selectedType === 'none'}
          />
           <div class="form-text">Duração da transição em segundos (ex: 0.5, 1.0).</div>
        </div>

      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" on:click={close}>Cancelar</button>
        <button type="button" class="btn btn-primary" on:click={save} disabled={!currentFrameId || !nextFrameId}>Salvar</button>
      </div>
    </div>
  </div>
</div>
{/if}
