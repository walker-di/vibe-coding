<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Label } from '$lib/components/ui/label';
  import { ArrowLeft, Save, FileText, ImageUp, LayoutGrid, Loader2 } from 'lucide-svelte'; // Added ImageUp, LayoutGrid, Loader2
  import CanvasEditor from '$lib/components/story/CanvasEditor.svelte';
  import type { Clip } from '$lib/types/story.types';
  import type { CanvasTemplateListItem, CanvasTemplate } from '$lib/types/canvasTemplate.types'; // Import template types
  import { onMount } from 'svelte'; // Import onMount
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'; // Import DropdownMenu
  // Removed: import { toast } from 'svelte-sonner'; // Assuming toast is handled elsewhere or not needed here

  // Props
  let {
    clip,
    sceneId,
    isEditing = false,
    onSubmit,
    onCancel,
    onImageUrlUpdate // Added prop for updating image URL after creation
  } = $props<{
    clip?: Partial<Clip>;
    sceneId: number;
    isEditing?: boolean;
    // onSubmit should return the created/updated clip, especially the ID for new ones
    onSubmit: (clipData: Partial<Clip>) => Promise<Clip | null | undefined>;
    onCancel: () => void;
    // Function to call PUT /api/clips/[id] with just the imageUrl
    onImageUrlUpdate?: (clipId: number, imageUrl: string) => Promise<void>;
  }>();

  // Form state
  let canvas = $state(clip?.canvas || '{}');
  let narration = $state(clip?.narration || '');
  let description = $state(clip?.description || '');
  let orderIndex = $state(clip?.orderIndex !== undefined ? clip.orderIndex : 0);
  let imageUrl = $state(clip?.imageUrl || ''); // Added imageUrl state
  let isSubmitting = $state(false); // Removed duplicate declaration
  let errors = $state<Record<string, string>>({});
  let canvasEditorInstance: CanvasEditor | null = $state(null); // To bind component instance
  let availableTemplates = $state<CanvasTemplateListItem[]>([]);
  let isLoadingTemplates = $state(false);
  let isLoadingSelectedTemplate = $state(false);
  let canvasHasChanged = $state(false); // Track if canvas has changed since initial load

  // Fetch available templates on mount
  onMount(async () => {
    isLoadingTemplates = true;
    try {
      const response = await fetch('/api/canvas-templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      availableTemplates = await response.json();
    } catch (error) {
      console.error("Error fetching canvas templates:", error);
      // Optionally show an error message to the user
    } finally {
      isLoadingTemplates = false;
    }
  });


  // Handle canvas changes
  function handleCanvasChange(canvasJson: string) {
    canvas = canvasJson;
    // Clear previous image URL if canvas changes, as preview is outdated
    imageUrl = '';
    // Mark that canvas has changed and needs a new preview
    canvasHasChanged = true;
    console.log('Canvas changed, will generate new preview on save');
  }

  // Validate form
  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!canvas || canvas === '{}') {
      newErrors.canvas = 'Canvas content is required';
    }

    if (orderIndex < 0) {
      newErrors.orderIndex = 'Order index must be a non-negative number';
    }

    errors = newErrors;
    return Object.keys(newErrors).length === 0;
  }

  // Handle form submission
  // Upload preview image
  async function uploadPreviewImage(dataUrl: string, clipId: number): Promise<string | null> { // Added clipId parameter
    try {
      const response = await fetch('/api/upload/clip-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: dataUrl, clipId: clipId }) // Pass clipId
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload preview image');
      }

      const result = await response.json();
      return result.imageUrl;
    } catch (error: any) { // Added : any
      console.error('Error uploading preview:', error);
      // Removed: toast.error(`Error uploading preview: ${error.message}`);
      return null;
    }
  }

  // Function to load a selected template
  async function loadTemplate(templateId: number) {
    if (!canvasEditorInstance) {
      console.error('Canvas editor instance not available.');
      // Optionally show user error
      return;
    }
    isLoadingSelectedTemplate = true;
    try {
      const response = await fetch(`/api/canvas-templates/${templateId}`);
      if (!response.ok) throw new Error('Failed to fetch selected template data');
      const template: CanvasTemplate = await response.json();

      // Load the data into the editor
      await canvasEditorInstance.loadCanvasData(template.canvasData);
      // handleCanvasChange will be triggered by the editor's internal events after loading

      // Optionally update other fields if needed (e.g., maybe description?)
      // narration = template.description || narration; // Example

    } catch (error) {
      console.error(`Error loading template ${templateId}:`, error);
      // Optionally show user error
    } finally {
      isLoadingSelectedTemplate = false;
    }
  }

  // Handle form submission
  async function handleSubmit() {
    if (!validate() || isSubmitting) return;

    isSubmitting = true;
    let finalImageUrl = imageUrl; // Use existing if available and canvas hasn't changed for edits
    let submittedClip: Clip | null | undefined = null;

    try {
      const isNewClip = !clip?.id;

      // --- Handle Editing Existing Clip ---
      if (!isNewClip) {
        // Generate and upload preview if canvas has changed or if there's no existing preview
        if ((canvasHasChanged || !finalImageUrl) && canvasEditorInstance && clip?.id) {
          console.log('Generating new preview image for edited clip');
          const fabricCanvas = canvasEditorInstance.getCanvasInstance();
          if (fabricCanvas) {
            const dataUrl = fabricCanvas.toDataURL({ format: 'png', quality: 0.8 });
            finalImageUrl = await uploadPreviewImage(dataUrl, clip.id);
            if (!finalImageUrl) {
              isSubmitting = false;
              return; // Stop if upload fails
            }
            imageUrl = finalImageUrl; // Update local state
            console.log('New preview image generated and uploaded:', finalImageUrl);
          } else {
            console.warn('Could not get Fabric canvas instance for preview.');
          }
        }
        // Submit all data including potentially updated imageUrl
        submittedClip = await onSubmit({
          id: clip.id,
          sceneId,
          canvas,
          imageUrl: finalImageUrl || null,
          narration: narration || null,
          description: description || null,
          orderIndex
        });

      // --- Handle Creating New Clip ---
      } else {
        // 1. Submit core data first (without imageUrl)
        submittedClip = await onSubmit({
          // No id
          sceneId,
          canvas,
          imageUrl: null, // Send null initially
          narration: narration || null,
          description: description || null,
          orderIndex
        });

        // 2. If creation successful and we got an ID back
        if (submittedClip?.id && canvasEditorInstance) {
          const newClipId = submittedClip.id;
          const fabricCanvas = canvasEditorInstance.getCanvasInstance();
          if (fabricCanvas) {
            // 3. Generate and upload preview
            const dataUrl = fabricCanvas.toDataURL({ format: 'png', quality: 0.8 });
            finalImageUrl = await uploadPreviewImage(dataUrl, newClipId);

            // 4. If upload successful, update the clip with the imageUrl
            if (finalImageUrl && onImageUrlUpdate) {
              imageUrl = finalImageUrl; // Update local state
              await onImageUrlUpdate(newClipId, finalImageUrl);
            } else if (!onImageUrlUpdate) {
               console.warn('onImageUrlUpdate prop is missing, cannot update image URL for new clip.');
            }
          } else {
            console.warn('Could not get Fabric canvas instance for preview on new clip.');
          }
        } else if (!submittedClip?.id) {
           console.error('Clip creation did not return an ID. Cannot generate preview.');
        }
      }

      // Optional: Handle success (e.g., navigate away or show message)
      // This might be better handled by the parent component after onSubmit resolves.

    } catch (error: any) {
      console.error('Error submitting clip:', error);
      // Add user feedback if desired (e.g., using a toast library)
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h2 class="text-2xl font-bold">{isEditing ? 'Edit' : 'Create'} Clip</h2>
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

    <div class="border-t pt-4 mt-4">
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-lg font-semibold">Canvas Content</h3>

        <!-- Load Template Dropdown -->
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isLoadingTemplates || isLoadingSelectedTemplate || availableTemplates.length === 0}
            >
              {#if isLoadingSelectedTemplate}
                <Loader2 class="h-4 w-4 mr-2 animate-spin" /> Loading...
              {:else if isLoadingTemplates}
                 <Loader2 class="h-4 w-4 mr-2 animate-spin" /> Templates...
              {:else}
                <LayoutGrid class="h-4 w-4 mr-2" /> Load Template
              {/if}
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            {#if availableTemplates.length === 0 && !isLoadingTemplates}
              <DropdownMenu.Label>No templates found</DropdownMenu.Label>
            {:else if isLoadingTemplates}
               <DropdownMenu.Label>Loading templates...</DropdownMenu.Label>
            {:else}
              <DropdownMenu.Label>Available Templates</DropdownMenu.Label>
              <DropdownMenu.Separator />
              {#each availableTemplates as template (template.id)}
                <DropdownMenu.Item on:click={() => loadTemplate(template.id)} disabled={isLoadingSelectedTemplate}>
                  {template.name}
                </DropdownMenu.Item>
              {/each}
            {/if}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <!-- End Load Template Dropdown -->
      </div>

      <div class="border rounded-md p-4 relative {errors.canvas ? 'border-red-500' : ''}">
        {#if isLoadingSelectedTemplate}
           <div class="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
             <Loader2 class="h-6 w-6 animate-spin text-primary" />
           </div>
        {/if}
        {#if imageUrl}
          <div class="absolute top-2 right-2 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded border border-green-400 flex items-center">
            <ImageUp class="h-3 w-3 mr-1" /> Preview Saved
          </div>
        {/if}
        <CanvasEditor
          bind:this={canvasEditorInstance}
          onCanvasChange={handleCanvasChange}
          narration={narration}
          description={description}
          onNarrationChange={async (data) => {
            narration = data.narration || '';
            description = data.description || '';
          }}
          onReady={() => {
            // Load initial data once the editor signals it's ready
            console.log('ClipForm: CanvasEditor ready. Attempting to load initial data.');
            canvasEditorInstance?.loadCanvasData(canvas);
            // Reset the canvasHasChanged flag after initial load
            canvasHasChanged = false;
            console.log('Canvas loaded from initial data, resetting canvasHasChanged flag');
          }}
        />

        {#if errors.canvas}
          <p class="text-xs text-red-500 mt-2">{errors.canvas}</p>
        {/if}
      </div>
    </div>

    <div class="border-t pt-4 mt-4">
      <h3 class="text-lg font-semibold mb-3 flex items-center">
        <FileText class="h-5 w-5 mr-2" />
        Description (Optional)
      </h3>

      <div class="space-y-2">
        <Textarea
          id="description"
          bind:value={description}
          placeholder="Enter a description for this clip"
          rows={3}
        />
      </div>
    </div>

    <div class="border-t pt-4 mt-4">
      <h3 class="text-lg font-semibold mb-3 flex items-center">
        <FileText class="h-5 w-5 mr-2" />
        Narration (Optional)
      </h3>

      <div class="space-y-2">
        <Textarea
          id="narration"
          bind:value={narration}
          placeholder="Enter narration text for this clip"
          rows={4}
        />
      </div>
    </div>

    <div class="flex justify-end pt-4">
      <Button type="submit" disabled={isSubmitting}>
        <Save class="h-4 w-4 mr-2" />
        {isSubmitting ? 'Saving...' : 'Save Clip'}
      </Button>
    </div>
  </form>
</div>
