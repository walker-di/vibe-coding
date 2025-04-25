<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { type Canvas, type FabricObject, Group } from "fabric";
  import { Button } from "$lib/components/ui/button";
  import { Palette, Ungroup, Group as GroupIcon, Trash2 } from "lucide-svelte";
  import { Popover, PopoverContent, PopoverTrigger } from "$lib/components/ui/popover";
  import { Label } from "$lib/components/ui/label";
  import { Input } from "$lib/components/ui/input";

  // Props
  const props: {
    canvas: Canvas;
  } = $props();

  const canvas = props.canvas;

  // State variables
  let isVisible = $state(false);
  let selectedSvg = $state<Group | null>(null);
  let menuRef: HTMLDivElement | null = $state(null);
  let isColorPickerOpen = $state(false);
  let selectedColor = $state("#000000");
  let isUngrouped = $state(false);
  let originalGroup = $state<Group | null>(null);
  let ungroupedObjects = $state<FabricObject[]>([]);
  let selectedElement = $state<FabricObject | null>(null);
  let isProcessingDelete = $state(false); // Flag to prevent infinite loops during deletion
  let isRegrouping = $state(false); // Flag to prevent infinite loops during regrouping
  let lastRegroupTime = $state(0); // Timestamp of last regroup operation

  // Function to check if an object is an SVG group
  function isSvgGroup(obj: any): boolean {
    // First check if it's a valid object
    if (!obj) {
      console.log('SvgEditMenu: Object is null or undefined');
      return false;
    }

    // Check if it's a group
    if (obj.type !== "group" || !obj._objects || obj._objects.length === 0) {
      console.log('SvgEditMenu: Object is not a group or has no objects');
      return false;
    }

    // Check for the data.isSvg property
    if (obj.data && obj.data.isSvg === true) {
      console.log('SvgEditMenu: Found SVG group with data.isSvg property', obj);
      return true;
    }

    // Check if the name starts with "SVG " (legacy method)
    if (obj.name && obj.name.toString().startsWith("SVG ")) {
      console.log('SvgEditMenu: Found SVG group with name starting with "SVG "');
      // Add the data.isSvg property for future reference
      obj.set('data', { ...obj.data, isSvg: true });
      return true;
    }

    console.log('SvgEditMenu: Object is not an SVG group');
    return false;
  }

  // Function to check selection and show menu if an SVG group is selected
  function checkSelection() {
    try {
      // If we're currently processing a delete operation or regrouping, skip selection handling
      if (isProcessingDelete || isRegrouping) {
        console.log('SvgEditMenu: Skipping selection check during operation');
        return;
      }

      // Throttle regrouping operations to prevent infinite loops
      const now = Date.now();
      const timeSinceLastRegroup = now - lastRegroupTime;
      if (timeSinceLastRegroup < 500) { // 500ms throttle
        console.log('SvgEditMenu: Throttling selection check, too soon after last regroup');
        return;
      }

      const activeObject = canvas.getActiveObject();
      console.log('Selection changed:', activeObject);

      // If we're in ungrouped mode
      if (isUngrouped) {
        console.log('SvgEditMenu: Currently in ungrouped mode');

        // Check if one of our ungrouped objects is selected
        if (ungroupedObjects.includes(activeObject as FabricObject)) {
          console.log('SvgEditMenu: Selected one of our ungrouped objects');
          selectedElement = activeObject as FabricObject;
          isVisible = true;
          return;
        }

        // Check if the selected object is part of an SVG (has the partOfSvg flag)
        if (activeObject && (activeObject as any).data && (activeObject as any).data.partOfSvg === true) {
          console.log('SvgEditMenu: Selected an object with partOfSvg flag');
          selectedElement = activeObject as FabricObject;
          isVisible = true;
          return;
        }

        // If something else is selected, regroup the SVG first
        console.log('SvgEditMenu: Selected something else while in ungrouped mode, regrouping');
        regroupSvg();
        // Then continue with normal selection check
      }

      // Check if the selected object is an SVG group
      if (activeObject && isSvgGroup(activeObject)) {
        console.log('SvgEditMenu: SVG group selected');

        // Store the SVG group
        selectedSvg = activeObject as Group;

        // Make the menu visible
        isVisible = true;

        // IMPORTANT: Add a flag to the object to prevent other components from ungrouping it
        if (!(activeObject as any).data) {
          (activeObject as any).set('data', { isSvg: true, preventUngroup: true });
        } else if (!(activeObject as any).data.preventUngroup) {
          (activeObject as any).set('data', { ...(activeObject as any).data, preventUngroup: true });
        }
      } else {
        // Hide the menu if no SVG is selected
        console.log('SvgEditMenu: Not an SVG group, hiding menu');
        hideMenu();
      }
    } catch (error) {
      console.error('SvgEditMenu: Error in checkSelection:', error);
    }
  }

  // Function to hide the menu
  function hideMenu() {
    // Don't try to hide if we're in the middle of an operation
    if (isProcessingDelete || isRegrouping) {
      console.log('SvgEditMenu: Skipping hide menu during operation');
      return;
    }

    if (isUngrouped) {
      // If we're in ungrouped mode, regroup before hiding
      regroupSvg();

      // Set a timeout to hide after regrouping is complete
      setTimeout(() => {
        isVisible = false;
        selectedSvg = null;
        selectedElement = null;
      }, 600);
      return;
    }

    isVisible = false;
    selectedSvg = null;
    selectedElement = null;
  }

  // Function to ungroup SVG
  function ungroupSvg() {
    if (!selectedSvg || !canvas) {
      console.log('No SVG selected or no canvas');
      return;
    }

    // Don't ungroup if we're in the middle of another operation
    if (isProcessingDelete || isRegrouping) {
      console.log('SvgEditMenu: Cannot ungroup during an operation');
      return;
    }

    try {
      console.log('Ungrouping SVG:', selectedSvg);

      // Store the original group for later regrouping
      originalGroup = selectedSvg;

      // Get group properties before removing it
      const groupLeft = selectedSvg.left || 0;
      const groupTop = selectedSvg.top || 0;
      const groupScaleX = selectedSvg.scaleX || 1;
      const groupScaleY = selectedSvg.scaleY || 1;
      const groupAngle = selectedSvg.angle || 0;

      console.log('Group properties:', { groupLeft, groupTop, groupScaleX, groupScaleY, groupAngle });

      // Get all objects from the group
      const objects = selectedSvg.getObjects();
      console.log('Found', objects.length, 'objects in group');

      // Remove the group from canvas
      canvas.remove(selectedSvg);

      // Add all objects to canvas and store them
      ungroupedObjects = [];

      objects.forEach(obj => {
        if (!obj) {
          console.warn('Undefined object in SVG group');
          return;
        }

        try {
          // Get object properties with safe defaults
          const objLeft = typeof obj.left === 'number' ? obj.left : 0;
          const objTop = typeof obj.top === 'number' ? obj.top : 0;
          const objScaleX = typeof obj.scaleX === 'number' ? obj.scaleX : 1;
          const objScaleY = typeof obj.scaleY === 'number' ? obj.scaleY : 1;
          const objAngle = typeof obj.angle === 'number' ? obj.angle : 0;

          // Adjust position based on the original group's position and transformations
          const newLeft = objLeft + groupLeft;
          const newTop = objTop + groupTop;

          console.log('Setting object position:', {
            original: { left: objLeft, top: objTop },
            new: { left: newLeft, top: newTop }
          });

          obj.set({
            left: newLeft,
            top: newTop,
            scaleX: objScaleX * groupScaleX,
            scaleY: objScaleY * groupScaleY,
            angle: objAngle + groupAngle,
            selectable: true,  // Make individual elements selectable in edit mode
            evented: true,     // Make individual elements respond to events
            data: { partOfSvg: true } // Mark as part of an SVG for identification
          });

          canvas.add(obj);
          ungroupedObjects.push(obj);
        } catch (objError) {
          console.error('Error processing object in SVG group:', objError);
        }
      });

      // Set state to ungrouped
      isUngrouped = true;

      // Select the first object
      if (ungroupedObjects.length > 0) {
        canvas.setActiveObject(ungroupedObjects[0]);
      }

      canvas.requestRenderAll();
    } catch (error) {
      console.error('Error ungrouping SVG:', error);
      // Reset state in case of error
      isUngrouped = false;
      originalGroup = null;
      ungroupedObjects = [];
    }
  }

  // Function to regroup SVG
  function regroupSvg() {
    if (!isUngrouped || !canvas) {
      console.log('Not in ungrouped mode or no canvas');
      return;
    }

    // Prevent recursive regrouping
    if (isRegrouping) {
      console.log('Already regrouping, skipping');
      return;
    }

    // Set the regrouping flag and update timestamp
    isRegrouping = true;
    lastRegroupTime = Date.now();

    if (ungroupedObjects.length === 0) {
      console.log('No ungrouped objects to regroup');
      isUngrouped = false;
      originalGroup = null;
      isRegrouping = false;
      return;
    }

    try {
      console.log('Regrouping SVG with', ungroupedObjects.length, 'objects');

      // Remove all ungrouped objects from canvas
      ungroupedObjects.forEach(obj => {
        if (obj) {
          canvas.remove(obj);
        }
      });

      // Filter out any null or undefined objects
      const validObjects = ungroupedObjects.filter(obj => obj != null);

      if (validObjects.length === 0) {
        console.warn('No valid objects to regroup');
        // Reset state
        isUngrouped = false;
        ungroupedObjects = [];
        originalGroup = null;
        selectedElement = null;
        isRegrouping = false;
        return;
      }

      // Get original group properties with safe defaults
      const groupLeft = originalGroup?.left || 0;
      const groupTop = originalGroup?.top || 0;
      const groupScaleX = originalGroup?.scaleX || 1;
      const groupScaleY = originalGroup?.scaleY || 1;
      const groupAngle = originalGroup?.angle || 0;
      const groupName = originalGroup?.name || 'SVG Group';

      console.log('Creating new group with properties:', {
        left: groupLeft,
        top: groupTop,
        scaleX: groupScaleX,
        scaleY: groupScaleY,
        angle: groupAngle,
        name: groupName
      });

      // Create a new group with the objects
      const newGroup = new Group(validObjects, {
        left: groupLeft,
        top: groupTop,
        scaleX: groupScaleX,
        scaleY: groupScaleY,
        angle: groupAngle,
        name: groupName,
        subTargetCheck: false, // Disable sub-target selection by default
        interactive: false,     // Disable interactive by default
        selectable: true,       // Make sure the group is selectable
        lockMovementX: false,   // Allow horizontal movement
        lockMovementY: false,   // Allow vertical movement
      });

      // Add SVG data to the group
      (newGroup as any).set('data', (originalGroup as any)?.data || {
        isSvg: true,
        preventUngroup: true
      });

      // Make all child objects non-selectable to ensure the group is selected
      newGroup.getObjects().forEach(obj => {
        obj.set({
          selectable: false,
          evented: false,
          data: { partOfSvg: false } // Clear the partOfSvg flag
        });
      });

      // Add the new group to canvas
      canvas.add(newGroup);
      canvas.setActiveObject(newGroup);

      // Reset state
      isUngrouped = false;
      selectedSvg = newGroup;
      ungroupedObjects = [];
      originalGroup = null;
      selectedElement = null;

      canvas.requestRenderAll();
    } catch (error) {
      console.error('Error regrouping SVG:', error);
      // Reset state in case of error
      isUngrouped = false;
      ungroupedObjects = [];
      originalGroup = null;
      selectedElement = null;
    } finally {
      // Always reset the regrouping flag after a delay
      setTimeout(() => {
        isRegrouping = false;
      }, 500);
    }
  }

  // Function to change color of selected element
  function changeElementColor(color: string) {
    if (!selectedElement || !canvas) return;

    // Check if the object has a fill property
    if ('fill' in selectedElement) {
      selectedElement.set('fill', color);
    }

    // Check if the object has a stroke property
    if ('stroke' in selectedElement) {
      selectedElement.set('stroke', color);
    }

    canvas.requestRenderAll();
  }

  // Function to safely delete the selected SVG element
  function deleteSelectedElement() {
    if (!selectedElement || !canvas || !isUngrouped) return;

    // Prevent deletion during regrouping
    if (isRegrouping) {
      console.log('SvgEditMenu: Cannot delete while regrouping');
      return;
    }

    try {
      console.log('SvgEditMenu: Deleting selected element:', selectedElement);

      // Set the processing flag to prevent event handler loops
      isProcessingDelete = true;

      // Store a reference to the element we're deleting
      const elementToDelete = selectedElement;

      // Clear the selected element reference first
      selectedElement = null;

      // Remove the element from our tracked ungrouped objects array
      ungroupedObjects = ungroupedObjects.filter(obj => obj !== elementToDelete);

      // Then remove from canvas
      canvas.remove(elementToDelete);

      // If no more elements, reset state
      if (ungroupedObjects.length === 0) {
        console.log('SvgEditMenu: No elements left, resetting state');
        isUngrouped = false;
        originalGroup = null;
      } else {
        // Select another element if available
        if (ungroupedObjects.length > 0) {
          // Delay selection to avoid event conflicts
          setTimeout(() => {
            if (canvas && ungroupedObjects.length > 0) {
              canvas.setActiveObject(ungroupedObjects[0]);
              selectedElement = ungroupedObjects[0];
              canvas.requestRenderAll();
            }
          }, 50);
        }
      }

      canvas.requestRenderAll();
    } catch (error) {
      console.error('SvgEditMenu: Error deleting element:', error);
    } finally {
      // Always reset the processing flag when done
      setTimeout(() => {
        isProcessingDelete = false;
      }, 500); // Longer timeout to ensure all events have settled
    }
  }

  // Set up event listeners
  onMount(() => {
    // Use setTimeout to ensure the component is fully mounted
    setTimeout(() => {
      // Use a debounced version of checkSelection to prevent rapid firing
      const debouncedCheckSelection = () => {
        if (isProcessingDelete || isRegrouping) return;

        // Throttle selection checks
        const now = Date.now();
        const timeSinceLastRegroup = now - lastRegroupTime;
        if (timeSinceLastRegroup < 500) return;

        checkSelection();
      };

      canvas.on("selection:created", debouncedCheckSelection);
      canvas.on("selection:updated", debouncedCheckSelection);
      canvas.on("selection:cleared", hideMenu);
      console.log('SvgEditMenu: Event listeners attached');
    }, 100);
  });

  // Clean up event listeners
  onDestroy(() => {
    // Clean up all event listeners with their handlers
    try {
      // Use a safer approach to remove event listeners
      canvas.off("selection:created", () => {});
      canvas.off("selection:updated", () => {});
      canvas.off("selection:cleared", () => {});
    } catch (error) {
      console.error('Error removing event listeners:', error);
    }

    // If we're in ungrouped mode when component is destroyed, regroup
    if (isUngrouped) {
      // Make sure we're not in a delete operation
      isProcessingDelete = false;
      regroupSvg();
    }
  });
</script>

{#if isVisible}
  <div class="svg-edit-menu" bind:this={menuRef}>
    {#if !isUngrouped}
      <Button
        variant="outline"
        size="sm"
        onclick={ungroupSvg}
        title="Edit SVG Elements"
      >
        <Ungroup class="h-4 w-4 mr-2" />
        Edit SVG
      </Button>
    {:else}
      <Button
        variant="outline"
        size="sm"
        onclick={regroupSvg}
        title="Regroup SVG Elements"
      >
        <GroupIcon class="h-4 w-4 mr-2" />
        Regroup SVG
      </Button>

      {#if selectedElement}
        <div class="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                title="Change Color"
              >
                <Palette class="h-4 w-4 mr-2" />
                Color
              </Button>
            </PopoverTrigger>
            <PopoverContent class="w-80">
              <div class="space-y-4">
                <h4 class="font-medium">Element Color</h4>
                <div class="grid gap-2">
                  <div class="grid grid-cols-2 gap-2">
                    <Label for="color-picker">Color</Label>
                    <div class="flex items-center gap-2">
                      <div
                        class="w-6 h-6 border rounded"
                        style="background-color: {selectedColor};"
                      ></div>
                      <Input
                        id="color-picker"
                        type="color"
                        bind:value={selectedColor}
                        class="w-10 h-10 p-0 border-0"
                        on:change={() => changeElementColor(selectedColor)}
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-4 gap-2 mt-2">
                    {#each ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#000000', '#FFFFFF'] as color}
                      <button
                        class="w-8 h-8 rounded border"
                        style="background-color: {color};"
                        onclick={() => {
                          selectedColor = color;
                          changeElementColor(color);
                        }}
                        aria-label="Select color {color}"
                      ></button>
                    {/each}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="sm"
            onclick={deleteSelectedElement}
            title="Delete Element"
          >
            <Trash2 class="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      {/if}
    {/if}
  </div>
{/if}

<style>
  .svg-edit-menu {
    display: flex;
    align-items: center;
    gap: 8px;
    background-color: white;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    padding: 4px 8px;
    z-index: 1000;
    pointer-events: auto;
  }

  /* Button styles are handled by the Button component */
</style>
