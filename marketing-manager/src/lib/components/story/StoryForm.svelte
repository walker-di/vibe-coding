<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Label } from '$lib/components/ui/label';
  import { ArrowLeft, Save } from 'lucide-svelte';
  import type { Story } from '$lib/types/story.types';
  import { canvasAspectRatios, commonResolutions } from '$lib/constants'; // Import constants
  import type { CanvasAspectRatio, CommonResolution } from '$lib/constants'; // Import types

  // Props
  let {
    story,
    creativeId,
    isEditing = false,
    onSubmit,
    onCancel
  } = $props<{
    story?: Partial<Story>;
    creativeId: number;
    isEditing?: boolean;
    onSubmit: (storyData: Partial<Story>) => void;
    onCancel: () => void;
  }>();

  // Form state
  let title = $state(story?.title || '');
  let description = $state(story?.description || '');
  let aspectRatio = $state<CanvasAspectRatio>(story?.aspectRatio || '16:9'); // Default to 16:9
  let resolutionSelection = $state<CommonResolution | ''>(getInitialResolutionSelection(story?.resolution));
  let customResolution = $state(story?.resolution && getInitialResolutionSelection(story?.resolution) === 'Custom' ? story?.resolution : '');
  let isSubmitting = $state(false);
  let errors = $state<Record<string, string>>({});

  // Filtered resolutions based on current aspect ratio
  let compatibleResolutions = $derived(getCompatibleResolutions(aspectRatio));

  // Helper function to determine initial resolution selection
  function getInitialResolutionSelection(resolution: string | null | undefined): CommonResolution | '' {
    if (!resolution) return '';

    // Check if it matches any of our predefined resolutions
    const match = commonResolutions.find(r => {
      // Extract just the resolution part (e.g., "1920x1080" from "1920x1080 (16:9 HD)")
      const resolutionPart = r.split(' ')[0];
      return resolutionPart === resolution;
    });

    return match || 'Custom';
  }

  // Filter resolutions based on selected aspect ratio
  function getCompatibleResolutions(selectedAspectRatio: CanvasAspectRatio): CommonResolution[] {
    const aspectRatioMap: Record<CanvasAspectRatio, string[]> = {
      '16:9': ['1920x1080 (16:9 HD)'],
      '9:16': ['1080x1920 (9:16 HD)'],
      '1:1': ['1080x1080 (1:1 Square)'],
      '4:5': ['1080x1350 (4:5 Portrait)'],
      '1.91:1': ['1200x628 (Landscape Ad)'],
      'Other': [...commonResolutions.filter(r => r !== 'Custom')]
    };

    // Always include Custom option
    return [...(aspectRatioMap[selectedAspectRatio] || []), 'Custom'] as CommonResolution[];
  }

  // Automatically update resolution when aspect ratio changes
  $effect(() => {
    // Get the first compatible resolution for this aspect ratio (excluding Custom)
    const defaultResolution = compatibleResolutions.find(res => res !== 'Custom');

    // If the current selection is not compatible or empty, set it to the default
    if (!resolutionSelection ||
        (resolutionSelection !== 'Custom' && !compatibleResolutions.includes(resolutionSelection))) {
      resolutionSelection = defaultResolution || 'Custom';

      // If not custom, extract the resolution part
      if (resolutionSelection !== 'Custom') {
        // Extract just the resolution part (e.g., "1920x1080" from "1920x1080 (16:9 HD)")
        customResolution = resolutionSelection.split(' ')[0];
      }
    }
  });

  // Handle resolution selection change
  function handleResolutionChange(value: string) {
    resolutionSelection = value as CommonResolution;

    // If not custom, extract the resolution part
    if (value !== 'Custom') {
      // Extract just the resolution part (e.g., "1920x1080" from "1920x1080 (16:9 HD)")
      customResolution = value.split(' ')[0];
    } else {
      // Keep the custom value if it exists, otherwise empty
      customResolution = customResolution || '';
    }
  }

  // Get the final resolution value to save
  function getResolutionValue(): string | null {
    if (resolutionSelection === 'Custom') {
      return customResolution || null;
    } else if (resolutionSelection) {
      // Extract just the resolution part (e.g., "1920x1080" from "1920x1080 (16:9 HD)")
      return resolutionSelection.split(' ')[0];
    }
    return null;
  }

  // Validate form
  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (resolutionSelection === 'Custom' && !customResolution.trim()) {
      newErrors.customResolution = 'Custom resolution is required';
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
        id: story?.id,
        creativeId,
        title,
        description: description || null,
        aspectRatio,
        resolution: getResolutionValue()
      });
    } catch (error) {
      console.error('Error submitting story:', error);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h2 class="text-2xl font-bold">{isEditing ? 'Edit' : 'Create'} Story</h2>
    <Button variant="outline" onclick={onCancel}>
      <ArrowLeft class="h-4 w-4 mr-2" />
      Cancel
    </Button>
  </div>

  <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
    <div class="space-y-2">
      <Label for="title">Title</Label>
      <Input
        id="title"
        bind:value={title}
        placeholder="Enter story title"
        class={errors.title ? 'border-red-500' : ''}
      />
      {#if errors.title}
        <p class="text-xs text-red-500">{errors.title}</p>
      {/if}
    </div>

    <div class="space-y-2">
      <Label for="description">Description (optional)</Label>
      <Textarea
        id="description"
        bind:value={description}
        placeholder="Enter story description"
        rows={4}
      />
    </div>

    <!-- Aspect Ratio Selection -->
    <div class="space-y-2">
      <Label for="aspectRatio">Aspect Ratio</Label>
      <select
        id="aspectRatio"
        class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        bind:value={aspectRatio}
      >
        {#each canvasAspectRatios as ratio}
          <option value={ratio}>{ratio}</option>
        {/each}
      </select>
    </div>

    <!-- Resolution Selection -->
    <div class="space-y-2">
      <Label for="resolution">Resolution</Label>
      <select
        id="resolution"
        class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        bind:value={resolutionSelection}
        onchange={(e) => handleResolutionChange(e.currentTarget.value)}
      >
        <option value="" disabled>Select resolution</option>
        {#each compatibleResolutions as resolution}
          <option value={resolution}>{resolution}</option>
        {/each}
      </select>
    </div>

    <!-- Custom Resolution Input (shown only when Custom is selected) -->
    {#if resolutionSelection === 'Custom'}
      <div class="space-y-2">
        <Label for="customResolution">Custom Resolution</Label>
        <Input
          id="customResolution"
          bind:value={customResolution}
          placeholder="e.g., 1280x720"
          class={errors.customResolution ? 'border-red-500' : ''}
        />
        {#if errors.customResolution}
          <p class="text-xs text-red-500">{errors.customResolution}</p>
        {/if}
        <p class="text-xs text-muted-foreground">Enter dimensions in format: widthxheight (e.g., 1280x720)</p>
      </div>
    {/if}

    <div class="flex justify-end pt-4">
      <Button type="submit" disabled={isSubmitting}>
        <Save class="h-4 w-4 mr-2" />
        {isSubmitting ? 'Saving...' : 'Save Story'}
      </Button>
    </div>
  </form>
</div>
