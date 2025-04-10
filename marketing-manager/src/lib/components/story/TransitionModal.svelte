<script lang="ts">
  import { onMount } from 'svelte';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Save } from 'lucide-svelte';

  // Props
  let {
    open = $bindable(false),
    fromSceneId,
    toSceneId,
    fromSceneName = '',
    toSceneName = '',
    existingTransition = null,
    onSave
  } = $props<{
    open?: boolean;
    fromSceneId: number;
    toSceneId: number;
    fromSceneName?: string;
    toSceneName?: string;
    existingTransition?: {
      id?: number;
      fromSceneId: number;
      toSceneId: number;
      type: string;
      duration: number;
    } | null;
    onSave: (data: {
      fromSceneId: number;
      toSceneId: number;
      type: string;
      duration: number;
    }) => Promise<void>;
  }>();

  // Transition types
  const transitionTypes = ['Fade', 'Slide', 'Zoom', 'Wipe', 'None'];

  // Local state
  let selectedType = $state('Fade');
  let duration = $state(1.0); // Default duration in seconds
  let isSaving = $state(false);
  let error = $state<string | null>(null);

  // Handle transition type selection
  function handleSelectType(type: string) {
    selectedType = type;
  }

  // Reset form when modal opens or use existing transition data
  $effect(() => {
    if (open) {
      if (existingTransition) {
        selectedType = existingTransition.type;
        duration = existingTransition.duration / 1000; // Convert from ms to seconds
      } else {
        selectedType = 'Fade';
        duration = 1.0;
      }
      error = null;
    }
  });

  // Add click outside handler to close dropdown
  function setupClickOutsideHandler() {
    if (typeof window !== 'undefined') {
      const handleClickOutside = (event: MouseEvent) => {
        const dropdown = document.getElementById('transition-dropdown');
        const trigger = document.getElementById('transition-type');

        if (dropdown && !dropdown.classList.contains('hidden') &&
            trigger && !trigger.contains(event.target as Node) &&
            !dropdown.contains(event.target as Node)) {
          dropdown.classList.add('hidden');
        }
      };

      // Add event listener when component mounts
      window.addEventListener('click', handleClickOutside);

      // Return cleanup function
      return () => {
        window.removeEventListener('click', handleClickOutside);
      };
    }
  }

  // Set up the click outside handler when the component mounts
  onMount(setupClickOutsideHandler);

  // Handle save
  async function handleSave() {
    if (isSaving) return;

    isSaving = true;
    error = null;

    try {
      await onSave({
        fromSceneId,
        toSceneId,
        type: selectedType,
        duration: duration * 1000 // Convert to milliseconds for storage
      });

      // Close modal on success
      open = false;
    } catch (e: any) {
      console.error('Error saving transition:', e);
      error = e.message || 'Failed to save transition';
    } finally {
      isSaving = false;
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-[500px]">
    <Dialog.Header>
      <Dialog.Title>Configurar Transição</Dialog.Title>
      <Dialog.Description>
        Configurando transição do Quadro ID: {fromSceneId} para Quadro ID: {toSceneId}
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-4">
      <div class="space-y-2">
        <Label for="transition-type">Tipo de Transição:</Label>
        <!-- Custom select implementation to ensure single selection -->
        <div class="relative">
          <button
            type="button"
            id="transition-type"
            class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            onclick={() => document.getElementById('transition-dropdown')?.classList.toggle('hidden')}
          >
            <span>{selectedType}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 opacity-50"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>

          <div id="transition-dropdown" class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md hidden">
            <div class="p-1">
              {#each transitionTypes as type}
                <button
                  type="button"
                  class="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 {selectedType === type ? 'bg-accent/50' : ''}"
                  onclick={() => {
                    handleSelectType(type);
                    document.getElementById('transition-dropdown')?.classList.add('hidden');
                  }}
                >
                  <span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    {#if selectedType === type}
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    {/if}
                  </span>
                  {type}
                </button>
              {/each}
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <Label for="duration">Duração (segundos):</Label>
        <Input
          id="duration"
          type="number"
          bind:value={duration}
          min="0.1"
          max="5.0"
          step="0.1"
        />
        <p class="text-xs text-muted-foreground">
          Duração da transição em segundos (ex: 0.5, 1.0).
        </p>
      </div>

      {#if error}
        <div class="text-sm text-red-500 p-2 bg-red-50 rounded border border-red-200">
          {error}
        </div>
      {/if}
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => open = false}>Cancelar</Button>
      <Button onclick={handleSave} disabled={isSaving}>
        {#if isSaving}
          <span class="mr-2">Salvando...</span>
        {:else}
          <Save class="h-4 w-4 mr-2" /> Salvar
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
