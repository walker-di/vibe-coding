<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Label } from '$lib/components/ui/label';
  import { ArrowLeft, Save, Music, FileText, Upload } from 'lucide-svelte';
  import type { Scene } from '$lib/types/story.types';
  import AudioUploadModal from './AudioUploadModal.svelte';

  // Props
  let {
    scene,
    storyId,
    isEditing = false,
    onSubmit,
    onCancel
  } = $props<{
    scene?: Partial<Scene>;
    storyId: number;
    isEditing?: boolean;
    onSubmit: (sceneData: Partial<Scene>) => void;
    onCancel: () => void;
  }>();

  // Form state
  let bgmUrl = $state(scene?.bgmUrl || '');
  let bgmName = $state(scene?.bgmName || '');
  let description = $state(scene?.description || '');
  let orderIndex = $state(scene?.orderIndex !== undefined ? scene.orderIndex : 0);
  let isSubmitting = $state(false);
  let errors = $state<Record<string, string>>({});
  let showAudioUploadModal = $state(false);
  let audioElement = $state<HTMLAudioElement | null>(null);
  let isPlaying = $state(false);

  // Validate form
  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (bgmUrl && !bgmName) {
      newErrors.bgmName = 'BGM name is required when URL is provided';
    }

    if (orderIndex < 0) {
      newErrors.orderIndex = 'Order index must be a non-negative number';
    }

    errors = newErrors;
    return Object.keys(newErrors).length === 0;
  }

  // Handle form submission
  async function handleSubmit() {
    if (!validate() || isSubmitting) return;

    isSubmitting = true;

    try {
      await onSubmit({
        id: scene?.id,
        storyId,
        bgmUrl: bgmUrl || null,
        bgmName: bgmName || null,
        description: description || null,
        orderIndex
      });
    } catch (error) {
      console.error('Error submitting scene:', error);
    } finally {
      isSubmitting = false;
    }
  }

  // Handle audio selection from the modal
  function handleAudioSelected(url: string, name: string) {
    bgmUrl = url;
    bgmName = name;
    showAudioUploadModal = false;
  }

  // Play/pause audio preview
  function toggleAudioPreview() {
    if (!audioElement || !bgmUrl) return;

    if (isPlaying) {
      audioElement.pause();
      audioElement.currentTime = 0;
      isPlaying = false;
    } else {
      // Add a timestamp to prevent browser caching
      const timestamp = Date.now();
      const audioUrlWithTimestamp = `${bgmUrl}?t=${timestamp}`;

      audioElement.src = audioUrlWithTimestamp;
      audioElement.load();
      audioElement.play()
        .then(() => {
          isPlaying = true;
        })
        .catch(err => {
          console.error('Error playing audio:', err);
          isPlaying = false;
        });
    }
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h2 class="text-2xl font-bold">{isEditing ? 'Edit' : 'Create'} Scene</h2>
    <Button variant="outline" onclick={onCancel}>
      <ArrowLeft class="h-4 w-4 mr-2" />
      Cancel
    </Button>
  </div>

  <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
    <div class="space-y-2">
      <Label for="orderIndex">Order Index</Label>
      <Input
        id="orderIndex"
        type="number"
        bind:value={orderIndex}
        min="0"
        class={errors.orderIndex ? 'border-red-500' : ''}
      />
      {#if errors.orderIndex}
        <p class="text-xs text-red-500">{errors.orderIndex}</p>
      {/if}
    </div>

    <div class="space-y-2">
      <Label for="description" class="flex items-center">
        <FileText class="h-4 w-4 mr-2" />
        Description (Optional)
      </Label>
      <Textarea
        id="description"
        bind:value={description}
        placeholder="Enter a description for this scene"
        rows={3}
      />
    </div>

    <div class="border-t pt-4 mt-4">
      <h3 class="text-lg font-semibold mb-3 flex items-center">
        <Music class="h-5 w-5 mr-2" />
        Background Music (Optional)
      </h3>

      <div class="space-y-4">
        <!-- Audio upload button -->
        <Button
          variant="outline"
          onclick={() => showAudioUploadModal = true}
          class="w-full"
        >
          <Upload class="h-4 w-4 mr-2" />
          Upload or Select Audio
        </Button>

        <!-- Or use URL option -->
        <div class="text-center text-sm text-muted-foreground my-2">- or -</div>

        <div class="space-y-2">
          <Label for="bgmUrl">BGM URL</Label>
          <Input
            id="bgmUrl"
            bind:value={bgmUrl}
            placeholder="Enter URL to background music file"
          />
        </div>

        <div class="space-y-2">
          <Label for="bgmName">BGM Name</Label>
          <Input
            id="bgmName"
            bind:value={bgmName}
            placeholder="Enter name of the background music"
            class={errors.bgmName ? 'border-red-500' : ''}
          />
          {#if errors.bgmName}
            <p class="text-xs text-red-500">{errors.bgmName}</p>
          {/if}
        </div>

        <!-- Audio preview -->
        {#if bgmUrl}
          <div class="mt-2 p-3 bg-muted rounded-md">
            <div class="flex items-center justify-between">
              <div class="font-medium">{bgmName || 'Background Music'}</div>
              <Button
                variant="ghost"
                size="sm"
                onclick={toggleAudioPreview}
                class="h-8 px-2"
              >
                {isPlaying ? 'Stop' : 'Preview'}
              </Button>
            </div>
            <audio bind:this={audioElement} class="hidden"></audio>
          </div>
        {/if}
      </div>
    </div>

    <div class="flex justify-end pt-4">
      <Button type="submit" disabled={isSubmitting}>
        <Save class="h-4 w-4 mr-2" />
        {isSubmitting ? 'Saving...' : 'Save Scene'}
      </Button>
    </div>
  </form>

  <!-- Audio Upload Modal -->
  <AudioUploadModal
    open={showAudioUploadModal}
    onAudioSelected={handleAudioSelected}
    onClose={() => showAudioUploadModal = false}
  />
</div>
