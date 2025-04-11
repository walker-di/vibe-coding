<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Input } from '$lib/components/ui/input';
  import { FileText, MessageSquare, Save, Clock } from 'lucide-svelte';
  import VoiceSelector from '$lib/components/story/VoiceSelector.svelte';

  // Props
  let {
    open = $bindable(false),
    clip,
    onSave
  } = $props<{
    open?: boolean;
    clip: {
      narration?: string | null;
      description?: string | null;
      duration?: number | null;
      voiceName?: string | null;
    };
    onSave: (data: { narration: string | null; description: string | null; duration: number | null; voiceName?: string | null }) => Promise<void>;
  }>();

  // Local state
  let localNarration = $state(clip?.narration || '');
  let localDescription = $state(clip?.description || '');
  let localDuration = $state(clip?.duration || 3000); // Default to 3 seconds (3000ms)
  let localVoice = $state(clip?.voiceName || 'pt-BR-FranciscaNeural');
  let localLanguage = $state(localVoice.startsWith('pt-BR') ? 'pt-BR' : 'en-US');
  let isSaving = $state(false);
  let error = $state<string | null>(null);

  // Reset form when modal opens or props change
  $effect(() => {
    if (open) {
      localNarration = clip?.narration || '';
      localDescription = clip?.description || '';
      localDuration = clip?.duration || 3000;
      localVoice = clip?.voiceName || 'pt-BR-FranciscaNeural';
      localLanguage = localVoice.startsWith('pt-BR') ? 'pt-BR' : 'en-US';
      error = null;
    }
  });

  $effect(() => {
    localNarration = clip?.narration || '';
    localDescription = clip?.description || '';
    localDuration = clip?.duration || 3000;
    localVoice = clip?.voiceName || 'pt-BR-FranciscaNeural';
    localLanguage = localVoice.startsWith('pt-BR') ? 'pt-BR' : 'en-US';
  });

  // Handle save
  async function handleSave() {
    if (isSaving) return;

    isSaving = true;
    error = null;

    try {
      await onSave({
        narration: localNarration.trim() || null,
        description: localDescription.trim() || null,
        duration: localDuration,
        voiceName: localVoice
      });

      // Close modal on success
      open = false;
    } catch (e: any) {
      console.error('Error saving clip content:', e);
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
        Update the narration, description, and duration for this clip.
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
        <label for="duration" class="text-sm font-medium flex items-center">
          <Clock class="h-4 w-4 mr-2" />
          Duration
        </label>
        <div class="flex items-center gap-2">
          <Input
            id="duration"
            type="number"
            bind:value={localDuration}
            min="500"
            max="10000"
            step="100"
          />
          <span class="text-sm text-gray-500">{(localDuration / 1000).toFixed(1)}s</span>
        </div>
        <p class="text-xs text-muted-foreground">
          The duration of this clip in milliseconds (0.5s to 10s).
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

      <!-- Voice Selector -->
      <VoiceSelector bind:selectedVoice={localVoice} bind:language={localLanguage} />

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
