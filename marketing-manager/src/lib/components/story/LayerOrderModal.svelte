<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Layers, GripVertical, Pencil, Check, X } from "lucide-svelte";

  // Action to focus an element when it's mounted
  function focusOnMount(node: HTMLElement) {
    // Focus the element after it's mounted
    setTimeout(() => {
      node.focus();
    }, 0);

    return {};
  }

  // Props using Svelte 5 runes
  const { open = $bindable(false), layers = [], onSave, onClose } = $props<{
    open: boolean;
    layers: Array<{id: string, name: string, type: string, object: any}>;
    onSave: (newLayers: any[]) => void;
    onClose?: () => void;
  }>();

  // State
  let orderedLayers = $state(layers);
  let editingLayerId = $state<string | null>(null);
  let editingName = $state('');

  // Reset ordered layers when the modal opens or layers change
  $effect(() => {
    if (open && layers) {
      console.log('Modal opened, initializing layers:', layers);
      // Create a deep copy to ensure we don't lose object references
      orderedLayers = layers.map((layer: {id: string, name: string, type: string, object: any}) => ({ ...layer }));
      // Reset editing state
      editingLayerId = null;
    }
  });

  // Save changes and close modal
  function handleSave() {
    console.log('Saving layer order changes...');
    console.log('Ordered layers:', orderedLayers);

    // Make sure all layers have their object property intact and names are updated
    const validLayers = orderedLayers.filter((layer: {id: string, name: string, type: string, object: any}) => {
      const hasObject = !!layer.object;
      if (!hasObject) {
        console.warn('Layer missing object property:', layer);
        return false;
      }

      // Ensure the name is set on the fabric object
      if (layer.name && layer.object.name !== layer.name) {
        console.log(`Updating layer name from '${layer.object.name}' to '${layer.name}' during save`);
        layer.object.name = layer.name;
      }

      return true;
    });

    if (validLayers.length !== orderedLayers.length) {
      console.warn(`Found ${orderedLayers.length - validLayers.length} invalid layers`);
    }

    // Save the valid layers
    onSave(validLayers);
    console.log('Layer order changes saved');

    // Close the modal
    if (onClose) onClose();
  }

  // Close modal without saving
  function handleClose() {
    if (onClose) onClose();
  }

  // Get a display name for the layer
  function getLayerDisplayName(layer: any) {
    if (layer.name) return layer.name;
    return `${layer.type.charAt(0).toUpperCase() + layer.type.slice(1)} ${layer.id.substring(0, 4)}`;
  }

  // Start editing a layer name
  function startEditingName(layer: any) {
    editingLayerId = layer.id;
    editingName = layer.name || getLayerDisplayName(layer);
  }

  // Save the edited layer name
  function saveLayerName() {
    if (!editingLayerId) return;

    // Find the layer being edited
    const layerIndex = orderedLayers.findIndex((layer: {id: string}) => layer.id === editingLayerId);
    if (layerIndex === -1) return;

    // Update the layer name
    const updatedLayer = { ...orderedLayers[layerIndex] };
    updatedLayer.name = editingName.trim() || getLayerDisplayName(updatedLayer);

    // Also update the name in the fabric object if possible
    if (updatedLayer.object) {
      // Directly set the name property on the fabric object
      updatedLayer.object.name = updatedLayer.name;
      console.log(`Updated fabric object name to: ${updatedLayer.name}`);
    }

    // Update the layer in the array
    const newLayers = [...orderedLayers];
    newLayers[layerIndex] = updatedLayer;
    orderedLayers = newLayers;

    // Exit editing mode
    editingLayerId = null;
  }

  // Cancel editing
  function cancelEditing() {
    editingLayerId = null;
  }

  // Handle keydown events in the name input
  function handleNameInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveLayerName();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditing();
    }
  }
</script>

{#if open}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white p-6 rounded-lg shadow-lg w-[500px] max-w-[90vw]">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold flex items-center">
          <Layers class="h-5 w-5 mr-2" />
          Layer Order
        </h2>
        <button
          type="button"
          class="text-gray-500 hover:text-gray-700"
          onclick={handleClose}
        >
          &times;
        </button>
      </div>

      <div class="mb-4">
        <p class="text-sm text-muted-foreground mb-2">
          Drag and drop to reorder layers. Items at the top will appear in front of items below them.
        </p>
      </div>

      <div class="border rounded-md mb-4">
        <div class="space-y-1 p-1" role="list" aria-label="Draggable layers list">
          {#each orderedLayers as layer, index (layer.id)}
            <div
              class="flex items-center p-3 border rounded-md bg-white hover:bg-gray-50 cursor-move"
              draggable="true"
              role="listitem"
              aria-label={`Layer ${getLayerDisplayName(layer)}`}
              ondragstart={(e) => {
                e.dataTransfer?.setData('text/plain', index.toString());
                // Add a visual indicator for the dragged item
                e.currentTarget.classList.add('bg-gray-200');
              }}
              ondragend={(e) => {
                // Remove the visual indicator when drag ends
                e.currentTarget.classList.remove('bg-gray-200');
              }}
              ondragover={(e) => {
                e.preventDefault();
                // Add a visual indicator for the drop target
                e.currentTarget.classList.add('border-blue-500');
              }}
              ondragleave={(e) => {
                // Remove the visual indicator when drag leaves
                e.currentTarget.classList.remove('border-blue-500');
              }}
              ondrop={(e) => {
                e.preventDefault();
                // Remove the visual indicator
                e.currentTarget.classList.remove('border-blue-500');

                const fromIndex = parseInt(e.dataTransfer?.getData('text/plain') || '0');
                if (fromIndex !== index) {
                  // Move the item in the array
                  const newItems = [...orderedLayers];
                  const [movedItem] = newItems.splice(fromIndex, 1);
                  newItems.splice(index, 0, movedItem);
                  orderedLayers = newItems;
                }
              }}
            >
              <div class="mr-2 flex items-center text-gray-400">
                <GripVertical class="h-5 w-5" />
              </div>
              <div class="flex-1">
                {#if editingLayerId === layer.id}
                  <div class="flex items-center space-x-1">
                    <input
                      type="text"
                      class="flex-1 px-2 py-1 border rounded text-sm"
                      bind:value={editingName}
                      onkeydown={handleNameInputKeydown}
                      use:focusOnMount
                    />
                    <button
                      type="button"
                      class="p-1 text-green-600 hover:text-green-800"
                      onclick={saveLayerName}
                      title="Save name"
                    >
                      <Check class="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      class="p-1 text-red-600 hover:text-red-800"
                      onclick={cancelEditing}
                      title="Cancel"
                    >
                      <X class="h-4 w-4" />
                    </button>
                  </div>
                {:else}
                  <div class="flex items-center justify-between">
                    <div class="font-medium">{getLayerDisplayName(layer)}</div>
                    <button
                      type="button"
                      class="p-1 text-gray-400 hover:text-gray-600"
                      onclick={() => startEditingName(layer)}
                      title="Edit name"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                  </div>
                {/if}
                <div class="text-xs text-muted-foreground">{layer.type}</div>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div class="flex justify-end space-x-2">
        <Button variant="outline" onclick={handleClose}>Cancel</Button>
        <Button onclick={handleSave}>Apply Changes</Button>
      </div>
    </div>
  </div>
{/if}
