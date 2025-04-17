<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { type Canvas, type FabricObject, Group, ActiveSelection } from 'fabric';
  import { isSVGGroup } from './tools/canvas-svg.svelte';

  // Props
  const props: {
    canvas: Canvas;
  } = $props();

  const canvas = props.canvas;

  // State variables
  let isVisible = $state(false);
  let selectedGroup: Group | null = $state(null);
  let menuRef: HTMLDivElement | null = $state(null);
  let menuPosition = $state({ top: 0, left: 0 });

  // Function to check if an object is a group
  function isGroupObject(obj: any): boolean {
    return obj instanceof Group;
  }

  // Function to get the group type (SVG or regular)
  function getGroupType(obj: any): string {
    if (!obj || !(obj instanceof Group)) return 'not-a-group';

    if (isSVGGroup(obj)) {
      return 'svg-group';
    }

    return 'regular-group';
  }

  // Function to check selection and show menu if a group is selected
  function checkSelection() {
    if (!canvas) {
      console.log('UngroupMenu: Canvas is not available');
      return;
    }

    const activeObject = canvas.getActiveObject();
    console.log('UngroupMenu: Active object:', activeObject?.type);

    if (isGroupObject(activeObject)) {
      const groupType = getGroupType(activeObject);
      console.log(`UngroupMenu: ${groupType} selected, showing menu`);
      selectedGroup = activeObject as Group;
      isVisible = true;
      // Make sure the menu is visible in the DOM before positioning it
      setTimeout(() => {
        updateMenuPosition();
      }, 0);
    } else {
      hideMenu();
    }
  }

  // Function to hide the menu
  function hideMenu() {
    isVisible = false;
    selectedGroup = null;
  }

  // Function to update the menu position
  function updateMenuPosition() {
    if (!menuRef || !selectedGroup || !canvas) return;

    const zoom = canvas.getZoom();
    const boundingRect = selectedGroup.getBoundingRect();

    // Position the menu above the selection
    const canvasEl = canvas.getElement();
    const canvasRect = canvasEl.getBoundingClientRect();

    const left = canvasRect.left + (boundingRect.left + boundingRect.width / 2) * zoom;
    const top = canvasRect.top + boundingRect.top * zoom - 40; // 40px above the selection

    menuPosition = { top, left };
  }

  // Function to handle window resize
  function handleResize() {
    if (isVisible) {
      updateMenuPosition();
    }
  }

  // Function to handle clicks outside the menu
  function handleClickOutside(event: MouseEvent) {
    if (menuRef && !menuRef.contains(event.target as Node) && isVisible) {
      hideMenu();
    }
  }

  // Function to ungroup the selected group
  function ungroupObjects() {
    if (!canvas || !selectedGroup) return;

    const groupType = getGroupType(selectedGroup);
    console.log(`UngroupMenu: Ungrouping ${groupType}`);

    try {
      // Log group properties for debugging
      console.log('UngroupMenu: Group properties:', {
        left: selectedGroup.left,
        top: selectedGroup.top,
        scaleX: selectedGroup.scaleX,
        scaleY: selectedGroup.scaleY,
        angle: selectedGroup.angle,
        width: selectedGroup.width,
        height: selectedGroup.height,
        objectCount: selectedGroup.getObjects().length
      });

      // Get all objects in the group
      const groupObjects = selectedGroup.getObjects();

      // Create a temporary active selection with the same objects
      // This is the key to maintaining correct positions
      const activeSelection = new ActiveSelection(groupObjects, {
        canvas: canvas,
        left: selectedGroup.left,
        top: selectedGroup.top,
        scaleX: selectedGroup.scaleX,
        scaleY: selectedGroup.scaleY,
        angle: selectedGroup.angle,
      });

      // Remove the group from the canvas
      canvas.remove(selectedGroup);

      // Add the active selection to the canvas
      canvas.setActiveObject(activeSelection);

      // "Explode" the active selection by discarding it
      // This will leave all objects in their correct positions
      canvas.discardActiveObject();

      // Add all objects back to the canvas
      groupObjects.forEach(obj => {
        // Ensure objects have proper properties set
        obj.set({
          selectable: true,
          evented: true,
          visible: true,
        });

        // For SVG groups, we need to handle nested objects
        if (obj instanceof Group) {
          console.log('UngroupMenu: Found nested group, flattening');
          // Recursively add all objects from nested groups
          const nestedObjects = obj.getObjects();
          nestedObjects.forEach(nestedObj => {
            nestedObj.set({
              selectable: true,
              evented: true,
              visible: true,
              left: (obj.left || 0) + (nestedObj.left || 0),
              top: (obj.top || 0) + (nestedObj.top || 0),
            });
            canvas.add(nestedObj);
          });
        } else {
          // Add regular objects directly
          canvas.add(obj);
        }
      });

      // Select the first object
      if (groupObjects.length > 0) {
        canvas.setActiveObject(groupObjects[0]);
      }

      // Render the canvas to show the changes
      canvas.requestRenderAll();
    } catch (error) {
      console.error('UngroupMenu: Error during ungrouping:', error);

      // Fallback method if the above fails
      try {
        console.warn('UngroupMenu: Trying fallback ungrouping method');

        // Simple fallback - just get objects and add them back
        const objects = selectedGroup.getObjects();
        canvas.remove(selectedGroup);

        objects.forEach(obj => {
          canvas.add(obj);
        });

        if (objects.length > 0) {
          canvas.setActiveObject(objects[0]);
        }

        canvas.requestRenderAll();
      } catch (fallbackError) {
        console.error('UngroupMenu: Fallback ungrouping also failed:', fallbackError);
      }
    }

    // Hide the menu
    hideMenu();
  }

  // Set up event listeners
  onMount(() => {
    console.log('UngroupMenu: onMount called');
    if (canvas) {
      console.log('UngroupMenu: Canvas is available in onMount');

      // Listen for selection changes on the canvas
      canvas.on('selection:created', checkSelection);
      canvas.on('selection:updated', checkSelection);
      canvas.on('selection:cleared', hideMenu);
      canvas.on('object:modified', updateMenuPosition);
      canvas.on('object:scaling', updateMenuPosition);
      canvas.on('object:moving', updateMenuPosition);
      canvas.on('zoom' as any, updateMenuPosition);
    }

    window.addEventListener('resize', handleResize);
    document.addEventListener('mousedown', handleClickOutside);
  });

  // Clean up event listeners
  onDestroy(() => {
    if (canvas) {
      canvas.off('selection:created', checkSelection);
      canvas.off('selection:updated', checkSelection);
      canvas.off('selection:cleared', hideMenu);
      canvas.off('object:modified', updateMenuPosition);
      canvas.off('object:scaling', updateMenuPosition);
      canvas.off('object:moving', updateMenuPosition);
      canvas.off('zoom' as any, updateMenuPosition);
    }

    window.removeEventListener('resize', handleResize);
    document.removeEventListener('mousedown', handleClickOutside);
  });
</script>

{#if isVisible}
<div
  class="ungroup-menu"
  style="top: {menuPosition.top}px; left: {menuPosition.left}px;"
  bind:this={menuRef}
>
  <button class="ungroup-btn" onclick={ungroupObjects}>
    Ungroup
  </button>
</div>
{/if}

<style>
  .ungroup-menu {
    position: absolute;
    background-color: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    padding: 8px;
    z-index: 9999;
    transform: translateX(-50%);
  }

  .ungroup-btn {
    background-color: #4CAF50;
    color: white;
    border: none;
    padding: 6px 12px;
    text-align: center;
    text-decoration: none;
    display: inline-block;
    font-size: 14px;
    margin: 2px;
    cursor: pointer;
    border-radius: 4px;
    transition: background-color 0.3s;
  }

  .ungroup-btn:hover {
    background-color: #45a049;
  }
</style>
