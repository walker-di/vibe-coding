<script lang="ts">
  import { Canvas, type FabricObject } from "fabric";
  import { onMount, onDestroy } from "svelte";
  import { dndzone } from "svelte-dnd-action";
  import { flip } from "svelte/animate";

  // Define a custom interface for our layer objects
  interface LayerObject {
    id: string;
    name: string;
    object: FabricObject;
    visible: boolean;
    locked: boolean;
    selected: boolean;
    type: string;
  }

  let { canvas } = $props<{canvas: Canvas}>();

  // State for layers
  let layers = $state<LayerObject[]>([]);

  // State for editing layer name
  let editingLayerId = $state<string | null>(null);
  let editingName = $state<string>("");

  // Animation duration for flip animation
  const flipDurationMs = 200;

  // Function to refresh the layers list
  function refreshLayers() {
    if (!canvas) return;

    const objects = canvas.getObjects();
    // Create layers with the top canvas object first in the UI
    // In Fabric.js, objects are ordered from bottom to top, so we need to reverse
    // to have the top object (last in the array) appear first in our UI
    layers = objects.map((obj: FabricObject, index: number) => {
      // Use existing name or generate a default one based on object type
      let defaultName = `Layer ${index + 1}`;

      // Try to get a more descriptive name based on object type
      if ((obj as any).type) {
        const typeName = (obj as any).type.charAt(0).toUpperCase() + (obj as any).type.slice(1);
        defaultName = `${typeName} ${index + 1}`;
      }

      const name = (obj as any).name || defaultName;

      // Use a stable ID based on the object itself if possible
      // This helps maintain identity during drag operations
      const objId = (obj as any).id || `obj-${index}`;

      return {
        id: objId,
        name: name,
        object: obj,
        visible: obj.visible !== false,
        locked: obj.selectable === false,
        selected: canvas.getActiveObject() === obj,
        type: (obj as any).type || 'unknown'
      };
    }).reverse(); // Reverse to show top layers first
  }

  // Handle DND events
  function handleDndConsider(e: CustomEvent) {
    layers = e.detail.items;
  }

  function handleDndFinalize(e: CustomEvent) {
    layers = e.detail.items;

    // Update the canvas objects order to match the new layers order
    updateCanvasObjectsOrder();
  }

  // Update canvas objects order based on the current layers order
  function updateCanvasObjectsOrder() {
    if (!canvas) return;

    // Process layers in reverse order (bottom to top in the UI)
    // This way the first layer in the UI will end up on top of the canvas
    for (let i = layers.length - 1; i >= 0; i--) {
      const obj = layers[i].object;
      canvas.bringObjectToFront(obj);
    }

    canvas.requestRenderAll();
  }

  // Event handlers for canvas events
  function handleObjectAdded() {
    refreshLayers();
  }

  function handleObjectRemoved() {
    refreshLayers();
  }

  function handleSelectionCreated() {
    updateSelectionState();
  }

  function handleSelectionCleared() {
    updateSelectionState();
  }

  // Update only the selection state without rebuilding the layers array
  function updateSelectionState() {
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();

    layers = layers.map(layer => ({
      ...layer,
      selected: layer.object === activeObject
    }));
  }

  function handleObjectModified() {
    // Only update properties that might have changed, not the order
    updateLayerProperties();
  }

  // Update layer properties without changing their order
  function updateLayerProperties() {
    if (!canvas) return;

    layers = layers.map(layer => ({
      ...layer,
      visible: layer.object.visible !== false,
      locked: layer.object.selectable === false,
      selected: canvas.getActiveObject() === layer.object
    }));
  }

  // Layer management functions
  function selectLayer(layer: typeof layers[0]) {
    canvas.setActiveObject(layer.object);
    canvas.requestRenderAll();

    // Update only the selected state without rebuilding the entire layers array
    layers = layers.map(l => ({
      ...l,
      selected: l.id === layer.id
    }));
  }

  function toggleVisibility(layer: typeof layers[0]) {
    const newVisibleState = !layer.visible;
    layer.object.set('visible', newVisibleState);
    canvas.requestRenderAll();

    // Update only this layer's visibility state
    layers = layers.map(l => l.id === layer.id ? {
      ...l,
      visible: newVisibleState
    } : l);
  }

  function toggleLock(layer: typeof layers[0]) {
    // Use selectable property to lock/unlock objects
    const newLockedState = !layer.locked;
    layer.object.set('selectable', !newLockedState);

    // If locking, deselect if it's selected
    if (newLockedState && layer.selected) {
      canvas.discardActiveObject();
    }

    canvas.requestRenderAll();

    // Update only this layer's locked state
    layers = layers.map(l => l.id === layer.id ? {
      ...l,
      locked: newLockedState,
      selected: newLockedState ? false : l.selected
    } : l);
  }

  function startRenaming(layer: typeof layers[0]) {
    editingLayerId = layer.id;
    editingName = layer.name;
  }

  function saveLayerName() {
    if (!editingLayerId) return;

    const layer = layers.find(l => l.id === editingLayerId);
    if (layer) {
      layer.name = editingName;
      layer.object.set('name', editingName);
      canvas.requestRenderAll();
    }

    editingLayerId = null;
  }

  function moveLayerUp(layer: typeof layers[0]) {
    const index = canvas.getObjects().indexOf(layer.object);
    if (index < canvas.getObjects().length - 1) {
      canvas.bringObjectForward(layer.object);
      canvas.requestRenderAll();

      // Update the layers array to reflect the new order
      const layerIndex = layers.findIndex(l => l.id === layer.id);
      if (layerIndex > 0) {
        const newLayers = [...layers];
        [newLayers[layerIndex], newLayers[layerIndex - 1]] = [newLayers[layerIndex - 1], newLayers[layerIndex]];
        layers = newLayers;
      }
    }
  }

  function moveLayerDown(layer: typeof layers[0]) {
    const index = canvas.getObjects().indexOf(layer.object);
    if (index > 0) {
      canvas.sendObjectBackwards(layer.object);
      canvas.requestRenderAll();

      // Update the layers array to reflect the new order
      const layerIndex = layers.findIndex(l => l.id === layer.id);
      if (layerIndex < layers.length - 1) {
        const newLayers = [...layers];
        [newLayers[layerIndex], newLayers[layerIndex + 1]] = [newLayers[layerIndex + 1], newLayers[layerIndex]];
        layers = newLayers;
      }
    }
  }

  function moveLayerToTop(layer: typeof layers[0]) {
    canvas.bringObjectToFront(layer.object);
    canvas.requestRenderAll();

    // Move the layer to the top of the layers array
    const layerIndex = layers.findIndex(l => l.id === layer.id);
    if (layerIndex > 0) {
      const newLayers = [...layers];
      const movedLayer = newLayers.splice(layerIndex, 1)[0];
      newLayers.unshift(movedLayer);
      layers = newLayers;
    }
  }

  function moveLayerToBottom(layer: typeof layers[0]) {
    canvas.sendObjectToBack(layer.object);
    canvas.requestRenderAll();

    // Move the layer to the bottom of the layers array
    const layerIndex = layers.findIndex(l => l.id === layer.id);
    if (layerIndex < layers.length - 1) {
      const newLayers = [...layers];
      const movedLayer = newLayers.splice(layerIndex, 1)[0];
      newLayers.push(movedLayer);
      layers = newLayers;
    }
  }

  function deleteLayer(layer: typeof layers[0]) {
    canvas.remove(layer.object);
    canvas.requestRenderAll();

    // Remove the layer from the layers array
    layers = layers.filter(l => l.id !== layer.id);
  }

  // Setup event listeners
  onMount(() => {
    if (canvas) {
      canvas.on('object:added', handleObjectAdded);
      canvas.on('object:removed', handleObjectRemoved);
      canvas.on('selection:created', handleSelectionCreated);
      canvas.on('selection:updated', handleSelectionCreated);
      canvas.on('selection:cleared', handleSelectionCleared);
      canvas.on('object:modified', handleObjectModified);

      // Initial refresh
      refreshLayers();
    }
  });

  onDestroy(() => {
    if (canvas) {
      canvas.off('object:added', handleObjectAdded);
      canvas.off('object:removed', handleObjectRemoved);
      canvas.off('selection:created', handleSelectionCreated);
      canvas.off('selection:updated', handleSelectionCreated);
      canvas.off('selection:cleared', handleSelectionCleared);
      canvas.off('object:modified', handleObjectModified);
    }
  });

  // Handle click outside to cancel editing
  function handleClickOutside(event: MouseEvent) {
    if (editingLayerId && !(event.target as HTMLElement).closest('.layer-name-input')) {
      saveLayerName();
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="layer-manager">
  <div class="layer-header">
    <h3 class="section-title">Layers</h3>
    <div class="layer-actions">
      <button class="layer-action-btn" title="Refresh layers" onclick={refreshLayers}>
        <span class="icon">🔄</span>
      </button>
      <button class="layer-action-btn" title="Add new layer" onclick={() => window.dispatchEvent(new CustomEvent('addRectangle'))}>
        <span class="icon">+</span>
      </button>
    </div>
  </div>

  {#if layers.length === 0}
    <div class="no-layers">
      <p>No layers available</p>
    </div>
  {:else}
    <div class="layers-list" use:dndzone={{items: layers, flipDurationMs}} onconsider={handleDndConsider} onfinalize={handleDndFinalize}>
      {#each layers as layer (layer.id)}
        <div class="layer-item" class:selected={layer.selected} onclick={() => selectLayer(layer)} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && selectLayer(layer)} animate:flip={{duration: flipDurationMs}}>
          <div class="layer-drag-handle" title="Drag to reorder">
            <span class="drag-icon">☰</span>
          </div>
          <div class="layer-visibility">
            <button class="layer-btn" onclick={(e) => { e.stopPropagation(); toggleVisibility(layer); }} title={layer.visible ? "Hide layer" : "Show layer"}>
              <span class="icon">{layer.visible ? '👁️' : '👁️‍🗨️'}</span>
            </button>
          </div>

          <div class="layer-type-icon">
            {#if layer.type === 'rect'}
              <span class="type-icon">■</span>
            {:else if layer.type === 'circle'}
              <span class="type-icon">●</span>
            {:else if layer.type === 'textbox' || layer.type === 'text'}
              <span class="type-icon">T</span>
            {:else if layer.type === 'image'}
              <span class="type-icon">🖼️</span>
            {:else if layer.type === 'path'}
              <span class="type-icon">✏️</span>
            {:else}
              <span class="type-icon">⚪</span>
            {/if}
          </div>

          <div class="layer-name">
            {#if editingLayerId === layer.id}
              <input
                type="text"
                class="layer-name-input"
                bind:value={editingName}
                onkeydown={(e) => e.key === 'Enter' && saveLayerName()}
                onblur={saveLayerName}
              />
            {:else}
              <div class="layer-name-text" ondblclick={(e) => { e.stopPropagation(); startRenaming(layer); }} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && startRenaming(layer)}>
                {layer.name}
              </div>
            {/if}
          </div>

          <div class="layer-actions">
            <button class="layer-btn" onclick={(e) => { e.stopPropagation(); toggleLock(layer); }} title={layer.locked ? "Unlock layer" : "Lock layer"}>
              <span class="icon">{layer.locked ? '🔒' : '🔓'}</span>
            </button>

            <div class="layer-menu">
              <button class="layer-btn layer-menu-trigger">
                <span class="icon">⋮</span>
              </button>
              <div class="layer-menu-dropdown">
                <button class="layer-menu-item" onclick={(e) => { e.stopPropagation(); moveLayerUp(layer); }}>
                  Move Up
                </button>
                <button class="layer-menu-item" onclick={(e) => { e.stopPropagation(); moveLayerDown(layer); }}>
                  Move Down
                </button>
                <button class="layer-menu-item" onclick={(e) => { e.stopPropagation(); moveLayerToTop(layer); }}>
                  Bring to Front
                </button>
                <button class="layer-menu-item" onclick={(e) => { e.stopPropagation(); moveLayerToBottom(layer); }}>
                  Send to Back
                </button>
                <button class="layer-menu-item" onclick={(e) => { e.stopPropagation(); startRenaming(layer); }}>
                  Rename
                </button>
                <button class="layer-menu-item delete" onclick={(e) => { e.stopPropagation(); deleteLayer(layer); }}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .layer-manager {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .layer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 8px;
    border-bottom: 1px solid hsl(var(--sidebar-border));
  }

  .section-title {
    font-size: 0.9rem;
    font-weight: 600;
    margin: 0;
    color: hsl(var(--sidebar-foreground));
  }

  .layers-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 8px;
    overflow-y: auto;
  }

  .layer-item {
    display: flex;
    align-items: center;
    padding: 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
    position: relative;
    margin-bottom: 2px;
    border: 1px solid transparent;
  }

  .layer-item:hover {
    background-color: hsl(var(--sidebar-accent));
  }

  .layer-item.selected {
    background-color: hsl(var(--sidebar-accent));
    border: 1px solid hsl(var(--sidebar-primary));
  }

  .layer-drag-handle {
    cursor: grab;
    padding: 0 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    margin-right: 6px;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .layer-drag-handle:hover {
    background-color: hsl(var(--sidebar-border));
  }

  .layer-drag-handle:active {
    cursor: grabbing;
    background-color: hsl(var(--sidebar-accent));
  }

  .drag-icon {
    font-size: 1.4rem;
    color: hsl(var(--sidebar-foreground));
    opacity: 0.8;
    user-select: none;
    line-height: 1;
  }

  .layer-visibility {
    margin-right: 4px;
  }

  .layer-type-icon {
    margin-right: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
  }

  .type-icon {
    font-size: 0.9rem;
  }

  .layer-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .layer-name-text {
    font-size: 0.9rem;
    color: hsl(var(--sidebar-foreground));
  }

  .layer-name-input {
    width: 100%;
    padding: 2px 4px;
    border: 1px solid hsl(var(--sidebar-border));
    border-radius: 2px;
    font-size: 0.9rem;
  }

  .layer-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .layer-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 2px;
  }

  .layer-btn:hover {
    background-color: hsl(var(--sidebar-border));
  }

  .layer-action-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }

  .layer-action-btn:hover {
    background-color: hsl(var(--sidebar-border));
  }

  .icon {
    font-size: 1rem;
  }

  .no-layers {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100px;
    color: hsl(var(--sidebar-foreground));
    font-size: 0.9rem;
  }

  .layer-menu {
    position: relative;
  }

  .layer-menu-dropdown {
    position: absolute;
    right: 0;
    top: 100%;
    background-color: white;
    border: 1px solid hsl(var(--sidebar-border));
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 10;
    min-width: 150px;
    display: none;
  }

  .layer-menu:hover .layer-menu-dropdown {
    display: block;
  }

  .layer-menu-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 8px 12px;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 0.9rem;
    color: hsl(var(--sidebar-foreground));
  }

  .layer-menu-item:hover {
    background-color: hsl(var(--sidebar-accent));
  }

  .layer-menu-item.delete {
    color: #e74c3c;
  }

  .layer-menu-item.delete:hover {
    background-color: #fde2e2;
  }
</style>
