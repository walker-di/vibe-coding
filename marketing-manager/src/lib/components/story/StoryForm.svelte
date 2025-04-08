<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Label } from '$lib/components/ui/label';
  import { ArrowLeft, Save } from 'lucide-svelte';
  import type { Story } from '$lib/types/story.types';

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
  let isSubmitting = $state(false);
  let errors = $state<Record<string, string>>({});

  // Validate form
  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    
    if (!title.trim()) {
      newErrors.title = 'Title is required';
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
        description: description || null
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
    
    <div class="flex justify-end pt-4">
      <Button type="submit" disabled={isSubmitting}>
        <Save class="h-4 w-4 mr-2" />
        {isSubmitting ? 'Saving...' : 'Save Story'}
      </Button>
    </div>
  </form>
</div>
