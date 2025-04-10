<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Textarea } from '$lib/components/ui/textarea';
  import { FileText, MessageSquare, Save } from 'lucide-svelte';

  // Props
  let {
    open = $bindable(false),
    narration = '',
    description = '',
    onSave
  } = $props<{
    open?: boolean;
    narration?: string;
    description?: string;
    onSave: (data: { narration: string | null; description: string | null }) => Promise<void>;
  }>();

  // Local state
  let localNarration = $state(narration || '');
  let localDescription = $state(description || '');
  let isSaving = $state(false);
  let error = $state<string | null>(null);

  // Reset form when modal opens or props change
  $effect(() => {
    if (open) {
      localNarration = narration || '';
      localDescription = description || '';
      error = null;
    }
  });

  $effect(() => {
    localNarration = narration || '';
    localDescription = description || '';
  });

  // Handle save
  async function handleSave() {
    if (isSaving) return;

    isSaving = true;
    error = null;

    try {
      await onSave({
        narration: localNarration.trim() || null,
        description: localDescription.trim() || null
      });

      // Close modal on success
      open = false;
    } catch (e: any) {
      console.error('Error saving clip narration/description:', e);
      error = e.message || 'Failed to save changes';
    } finally {
      isSaving = false;
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-[600px]">
    <Dialog.Header>
      <Dialog.Title>Edit Clip Content</Dialog.Title>
      <Dialog.Description>
        Update the narration and description for this clip.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-4">
      <div class="space-y-2">
        <label for="description" class="text-sm font-medium flex items-center">
          <MessageSquare class="h-4 w-4 mr-2" />
          Description
        </label>
        <Textarea
          id="description"
          bind:value={localDescription}
          placeholder="Brief description of this clip"
          rows={5}
          class="min-h-[100px]"
        />
        <p class="text-xs text-muted-foreground">
          A short description to help identify this clip.
        </p>
      </div>

      <div class="space-y-2">
        <label for="narration" class="text-sm font-medium flex items-center">
          <FileText class="h-4 w-4 mr-2" />
          Narration
        </label>
        <Textarea
          id="narration"
          bind:value={localNarration}
          placeholder="Enter narration text for this clip"
          rows={8}
          class="min-h-[150px]"
        />
        <p class="text-xs text-muted-foreground">
          The narration text that will be read or displayed with this clip.
        </p>
      </div>

      {#if error}
        <div class="text-sm text-red-500 p-2 bg-red-50 rounded border border-red-200">
          {error}
        </div>
      {/if}
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (open = false)} disabled={isSaving}>
        Cancel
      </Button>
      <Button onclick={handleSave} disabled={isSaving}>
        <Save class="h-4 w-4 mr-2" />
        {isSaving ? 'Saving...' : 'Save Changes'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
