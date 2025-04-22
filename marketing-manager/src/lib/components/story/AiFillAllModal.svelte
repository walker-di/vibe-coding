<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Label } from '$lib/components/ui/label';
  import { Sparkles } from 'lucide-svelte';

  // Props
  let {
    open = $bindable(false),
    isLoading = false
  } = $props<{
    open?: boolean;
    isLoading?: boolean;
  }>();

  // State
  let fillCanvas = $state(true);
  let generateNarration = $state(true);
  let generateAudio = $state(true);
  let autoSelectBgm = $state(true);

  // Create event dispatcher
  const dispatch = createEventDispatcher<{
    close: void;
    confirm: {
      fillCanvas: boolean;
      generateNarration: boolean;
      generateAudio: boolean;
      autoSelectBgm: boolean;
    };
  }>();

  function handleClose() {
    if (!isLoading) {
      dispatch('close');
    }
  }

  function handleConfirm() {
    dispatch('confirm', {
      fillCanvas,
      generateNarration,
      generateAudio,
      autoSelectBgm
    });
  }
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isLoading && (open = isOpen)}>
  <Dialog.Content class="sm:max-w-[425px]">
    <Dialog.Header>
      <Dialog.Title>AI Fill All Options</Dialog.Title>
      <Dialog.Description>
        Select which elements you want to generate for all clips.
      </Dialog.Description>
    </Dialog.Header>

    <div class="py-4 space-y-4">
      <div class="flex items-center space-x-2">
        <input
          type="checkbox"
          id="fillCanvas"
          bind:checked={fillCanvas}
          disabled={isLoading}
          class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <Label for="fillCanvas" class="cursor-pointer">
          Fill Canvas (Replace placeholders with AI images)
        </Label>
      </div>

      <div class="flex items-center space-x-2">
        <input
          type="checkbox"
          id="generateNarration"
          bind:checked={generateNarration}
          disabled={isLoading}
          class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <Label for="generateNarration" class="cursor-pointer">
          Generate Narration Text
        </Label>
      </div>

      <div class="flex items-center space-x-2">
        <input
          type="checkbox"
          id="generateAudio"
          bind:checked={generateAudio}
          disabled={isLoading || !generateNarration}
          class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <Label for="generateAudio" class="cursor-pointer">
          Generate Narration Audio
        </Label>
      </div>

      <div class="flex items-center space-x-2">
        <input
          type="checkbox"
          id="autoSelectBgm"
          bind:checked={autoSelectBgm}
          disabled={isLoading}
          class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <Label for="autoSelectBgm" class="cursor-pointer">
          Auto-Select Background Music
        </Label>
      </div>

      {#if !generateNarration && generateAudio}
        <p class="text-xs text-amber-600">
          Note: Narration Audio requires Narration Text to be generated.
        </p>
      {/if}
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={handleClose} disabled={isLoading}>
        Cancel
      </Button>
      <Button onclick={handleConfirm} disabled={isLoading}>
        <Sparkles class="h-4 w-4 mr-2" />
        {isLoading ? "Processing..." : "Start Processing"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
