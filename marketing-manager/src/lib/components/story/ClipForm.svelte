<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Label } from '$lib/components/ui/label';
  import { ArrowLeft, Save, FileText, ImageUp } from 'lucide-svelte'; // Added ImageUp
  import CanvasEditor from '$lib/components/story/CanvasEditor.svelte';
  import type { Clip } from '$lib/types/story.types';
  // Removed: import { toast } from 'svelte-sonner'; 

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
  let orderIndex = $state(clip?.orderIndex !== undefined ? clip.orderIndex : 0);
  let imageUrl = $state(clip?.imageUrl || ''); // Added imageUrl state
  let isSubmitting = $state(false); // Removed duplicate declaration
  let errors = $state<Record<string, string>>({});
  let canvasEditorInstance: CanvasEditor | null = $state(null); // To bind component instance

  // Handle canvas changes
  function handleCanvasChange(canvasJson: string) {
    canvas = canvasJson;
    // Clear previous image URL if canvas changes, as preview is outdated
    imageUrl = ''; 
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
        // Generate and upload preview only if it doesn't exist or canvas changed
        if (!finalImageUrl && canvasEditorInstance && clip?.id) {
          const fabricCanvas = canvasEditorInstance.getCanvasInstance();
          if (fabricCanvas) {
            const dataUrl = fabricCanvas.toDataURL({ format: 'png', quality: 0.8 });
            finalImageUrl = await uploadPreviewImage(dataUrl, clip.id);
            if (!finalImageUrl) {
              isSubmitting = false;
              return; // Stop if upload fails
            }
            imageUrl = finalImageUrl; // Update local state
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
      <h3 class="text-lg font-semibold mb-3">Canvas Content</h3>
      
      <div class="border rounded-md p-4 relative {errors.canvas ? 'border-red-500' : ''}">
        {#if imageUrl}
          <div class="absolute top-2 right-2 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded border border-green-400 flex items-center">
            <ImageUp class="h-3 w-3 mr-1" /> Preview Saved
          </div>
        {/if}
        <CanvasEditor 
          bind:this={canvasEditorInstance} 
          onCanvasChange={handleCanvasChange}
          onReady={() => {
            // Load initial data once the editor signals it's ready
            console.log('ClipForm: CanvasEditor ready. Attempting to load initial data.');
            canvasEditorInstance?.loadCanvasData(canvas); 
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
