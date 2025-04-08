<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Label } from '$lib/components/ui/label';
  import { ArrowLeft, Save, FileText } from 'lucide-svelte';
  import CanvasEditor from '$lib/components/story/CanvasEditor.svelte';
  import type { Clip } from '$lib/types/story.types';

  // Props
  let { 
    clip,
    sceneId,
    isEditing = false,
    onSubmit,
    onCancel
  } = $props<{
    clip?: Partial<Clip>;
    sceneId: number;
    isEditing?: boolean;
    onSubmit: (clipData: Partial<Clip>) => void;
    onCancel: () => void;
  }>();

  // Form state
  let canvas = $state(clip?.canvas || '{}');
  let narration = $state(clip?.narration || '');
  let orderIndex = $state(clip?.orderIndex !== undefined ? clip.orderIndex : 0);
  let isSubmitting = $state(false);
  let errors = $state<Record<string, string>>({});

  // Handle canvas changes
  function handleCanvasChange(canvasJson: string) {
    canvas = canvasJson;
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
  async function handleSubmit() {
    if (!validate() || isSubmitting) return;
    
    isSubmitting = true;
    
    try {
      await onSubmit({
        id: clip?.id,
        sceneId,
        canvas,
        narration: narration || null,
        orderIndex
      });
    } catch (error) {
      console.error('Error submitting clip:', error);
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
      
      <div class="border rounded-md p-4 {errors.canvas ? 'border-red-500' : ''}">
        <CanvasEditor 
          initialCanvas={canvas} 
          onCanvasChange={handleCanvasChange}
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
