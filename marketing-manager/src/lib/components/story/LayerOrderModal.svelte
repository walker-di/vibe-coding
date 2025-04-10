<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Layers, GripVertical } from "lucide-svelte";

  // Props using Svelte 5 runes
  const { open = $bindable(false), layers = [], onSave, onClose } = $props<{
    open: boolean;
    layers: Array<{id: string, name: string, type: string, object: any}>;
    onSave: (newLayers: any[]) => void;
    onClose?: () => void;
  }>();

  // State
  let orderedLayers = $state(layers);

  // Reset ordered layers when the modal opens or layers change
  $effect(() => {
    if (open && layers) {
      console.log('Modal opened, initializing layers:', layers);
      // Create a deep copy to ensure we don't lose object references
      orderedLayers = layers.map((layer: {id: string, name: string, type: string, object: any}) => ({ ...layer }));
    }
  });

  // Save changes and close modal
  function handleSave() {
    console.log('Saving layer order changes...');
    console.log('Ordered layers:', orderedLayers);

    // Make sure all layers have their object property intact
    const validLayers = orderedLayers.filter((layer: {id: string, name: string, type: string, object: any}) => {
      const hasObject = !!layer.object;
      if (!hasObject) {
        console.warn('Layer missing object property:', layer);
      }
      return hasObject;
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
                <div class="font-medium">{getLayerDisplayName(layer)}</div>
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
