<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Film, FileArchive, Video } from 'lucide-svelte';

  // Props
  let {
    open = $bindable(false),
    isLoading = false,
    exportProgress = 0,
    exportError = $bindable<string | null>(null),
    onClose = $bindable(() => {}),
    onExportZip = $bindable(() => {}),
    onExportIndividualClips = $bindable(() => {}),
    onExportUnifiedVideo = $bindable(() => {})
  } = $props<{
    open?: boolean;
    isLoading?: boolean;
    exportProgress?: number;
    exportError?: string | null;
    onClose?: () => void;
    onExportZip?: () => void;
    onExportIndividualClips?: () => void;
    onExportUnifiedVideo?: () => void;
  }>();

  function handleClose() {
    if (!isLoading) {
      onClose();
    }
  }

  function handleExportZip() {
    onExportZip();
  }

  function handleExportIndividualClips() {
    onExportIndividualClips();
  }

  function handleExportUnifiedVideo() {
    onExportUnifiedVideo();
  }
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isLoading && (open = isOpen)}>
  <Dialog.Content class="sm:max-w-[500px]">
    <Dialog.Header>
      <Dialog.Title>Export Options</Dialog.Title>
      <Dialog.Description>
        Choose how you want to export your storyboard.
      </Dialog.Description>
    </Dialog.Header>

    <div class="grid gap-4 py-4">
      {#if exportError}
        <div class="p-4 bg-destructive/10 text-destructive rounded-md">
          <div class="font-medium mb-1">Export Error</div>
          <div class="text-sm">{exportError}</div>
        </div>
      {/if}

      {#if isLoading}
        <div class="p-4 bg-muted rounded-md">
          <div class="flex items-center justify-between mb-2">
            <span class="font-medium">Exporting...</span>
            <span>{(exportProgress * 100).toFixed(0)}%</span>
          </div>
          <div class="w-full bg-secondary h-2 rounded-full overflow-hidden">
            <div
              class="bg-primary h-full transition-all duration-300 ease-in-out"
              style="width: {exportProgress * 100}%"
            ></div>
          </div>
        </div>
      {:else}
        <div class="grid gap-4">
          <Button
            variant="outline"
            class="w-full justify-start h-auto py-4 px-4"
            onclick={handleExportZip}
          >
            <div class="flex items-start">
              <FileArchive class="h-5 w-5 mr-3 mt-0.5" />
              <div class="text-left">
                <div class="font-medium">Export Files</div>
                <div class="text-sm text-muted-foreground mt-1">
                  Download all assets (images, audio) as a ZIP file.
                </div>
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            class="w-full justify-start h-auto py-4 px-4"
            onclick={handleExportIndividualClips}
          >
            <div class="flex items-start">
              <Film class="h-5 w-5 mr-3 mt-0.5" />
              <div class="text-left">
                <div class="font-medium">Export Individual Clips</div>
                <div class="text-sm text-muted-foreground mt-1">
                  Generate and download each clip as a separate video file.
                </div>
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            class="w-full justify-start h-auto py-4 px-4"
            onclick={handleExportUnifiedVideo}
          >
            <div class="flex items-start">
              <Video class="h-5 w-5 mr-3 mt-0.5" />
              <div class="text-left">
                <div class="font-medium">Export Unified Video</div>
                <div class="text-sm text-muted-foreground mt-1">
                  Combine all clips into a single video with transitions.
                </div>
              </div>
            </div>
          </Button>
        </div>
      {/if}
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={handleClose} disabled={isLoading}>
        {isLoading ? 'Please wait...' : 'Cancel'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
