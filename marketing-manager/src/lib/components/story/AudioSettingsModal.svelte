<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Label } from "$lib/components/ui/label";
  import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "$lib/components/ui/dialog";
  import { Music, Mic } from "lucide-svelte";
  import type { Story } from "$lib/types/story.types";

  // Props
  let {
    open = false,
    story,
    onClose,
    onSave,
  } = $props<{
    open: boolean;
    story: Story;
    onClose: () => void;
    onSave: (settings: {
      narrationVolume: number;
      bgmVolume: number;
      narrationSpeed: number;
    }) => Promise<void>;
  }>();

  // Local state
  let narrationVolume = $state(story?.narrationVolume ?? 1.0);
  let bgmVolume = $state(story?.bgmVolume ?? 0.5);
  let narrationSpeed = $state(story?.narrationSpeed ?? 1.0);
  let isSaving = $state(false);

  // Track previous open state to avoid infinite loops
  let wasOpen = $state(false);

  // Watch for changes to the open prop
  $effect(() => {
    if (open !== wasOpen) {
      if (open && story) {
        // Use nullish coalescing to handle cases where the fields might not exist yet
        narrationVolume = story.narrationVolume ?? 1.0;
        bgmVolume = story.bgmVolume ?? 0.5;
        narrationSpeed = story.narrationSpeed ?? 1.0;

        // Log the values for debugging
        console.log('Audio settings loaded:', { narrationVolume, bgmVolume, narrationSpeed });
      }

      // Update the previous open state
      wasOpen = open;
    }
  });

  // Format volume as percentage
  function formatVolume(value: number): string {
    return `${Math.round(value * 100)}%`;
  }

  // Format speed as multiplier
  function formatSpeed(value: number): string {
    return `${value.toFixed(1)}x`;
  }

  // Handle volume change for narration and BGM
  function handleVolumeChange(e: Event, type: 'narration' | 'bgm') {
    const value = parseFloat((e.target as HTMLInputElement).value);
    if (type === 'narration') {
      narrationVolume = value;
      console.log('Narration volume changed:', narrationVolume);
    } else {
      bgmVolume = value;
      console.log('BGM volume changed:', bgmVolume);
    }
  }

  // Handle speed change for narration
  function handleSpeedChange(e: Event) {
    narrationSpeed = parseFloat((e.target as HTMLInputElement).value);
    console.log('Narration speed changed:', narrationSpeed);
  }

  // Handle save
  async function handleSave() {
    if (!story) return;

    isSaving = true;
    try {
      await onSave({
        narrationVolume,
        bgmVolume,
        narrationSpeed
      });
      onClose();
    } catch (error) {
      console.error("Error saving audio settings:", error);
    } finally {
      isSaving = false;
    }
  }
</script>

<Dialog {open} onOpenChange={() => {
  // Reset saving state when modal is closed
  isSaving = false;
  onClose();
}}>
  <DialogContent class="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Audio Settings</DialogTitle>
      <DialogDescription>
        Adjust global audio settings for this story. These settings will apply to all scenes and clips.
      </DialogDescription>
    </DialogHeader>

    <div class="grid gap-4 py-4">
      <!-- Narration Volume -->
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="narration-volume" class="text-right flex items-center justify-end gap-2">
          <Mic class="h-4 w-4" />
          Narration
        </Label>
        <div class="col-span-3 flex items-center gap-2">
          <input
            id="narration-volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={narrationVolume}
            oninput={(e) => handleVolumeChange(e, 'narration')}
            class="flex-1 h-2 bg-secondary rounded-full"
          />
          <span class="w-12 text-sm text-muted-foreground text-right">
            {formatVolume(narrationVolume)}
          </span>
        </div>
      </div>

      <!-- BGM Volume -->
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="bgm-volume" class="text-right flex items-center justify-end gap-2">
          <Music class="h-4 w-4" />
          BGM
        </Label>
        <div class="col-span-3 flex items-center gap-2">
          <input
            id="bgm-volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={bgmVolume}
            oninput={(e) => handleVolumeChange(e, 'bgm')}
            class="flex-1 h-2 bg-secondary rounded-full"
          />
          <span class="w-12 text-sm text-muted-foreground text-right">
            {formatVolume(bgmVolume)}
          </span>
        </div>
      </div>

      <!-- Narration Speed -->
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="narration-speed" class="text-right">
          Speed
        </Label>
        <div class="col-span-3 flex items-center gap-2">
          <input
            id="narration-speed"
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={narrationSpeed}
            oninput={(e) => handleSpeedChange(e)}
            class="flex-1 h-2 bg-secondary rounded-full"
          />
          <span class="w-12 text-sm text-muted-foreground text-right">
            {formatSpeed(narrationSpeed)}
          </span>
        </div>
      </div>
    </div>

    <DialogFooter>
      <Button variant="outline" onclick={() => {
        isSaving = false;
        onClose();
      }}>Cancel</Button>
      <Button onclick={handleSave} disabled={isSaving}>
        {isSaving ? "Saving..." : "Save Changes"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
