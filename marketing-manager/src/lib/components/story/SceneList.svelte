<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import {
    Edit,
    Trash2,
    Play,
    Plus,
    Music,
    Image as ImageIcon,
    Copy,
    MessageSquare,
    ChevronsLeftRightEllipsis,
    Sparkles,
  } from "lucide-svelte";
  import { toast } from 'svelte-sonner';
  import ClipNarrationModal from "./ClipNarrationModal.svelte";
  import TransitionModal from "./TransitionModal.svelte";
  import AddClipBetweenButton from "./AddClipBetweenButton.svelte";
  import AddBgmModal from "./AddBgmModal.svelte";
  import type {
    SceneWithRelations,
    Clip,
    SceneTransition,
  } from "$lib/types/story.types";
  import CanvasPreview from "$lib/components/story/CanvasPreview.svelte";
  import { onMount } from "svelte";

  // Create a timestamp that will be used to force image refreshes
  let timestamp = $state(Date.now());

  // State for modals and transitions
  let isNarrationModalOpen = $state(false);
  let isTransitionModalOpen = $state(false);
  let isAutoSelectBgmModalOpen = $state(false);
  let currentEditingClip = $state<Clip | null>(null);
  let currentTransition = $state<{
    fromSceneId: number;
    toSceneId: number;
    fromSceneName: string;
    toSceneName: string;
    existingTransition?: SceneTransition;
  } | null>(null);
  let currentBgmScene = $state<{
    id: number;
    name: string;
  } | null>(null);
  let sceneTransitions = $state<SceneTransition[]>([]);
  let isApplyingBgm = $state(false);

  // Function to refresh the timestamp
  function refreshTimestamp() {
    timestamp = Date.now();
  }

  // Function to fetch transitions
  async function fetchTransitions() {
    try {
      const response = await fetch(`/api/transitions?storyId=${storyId}`);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch transitions. Status: ${response.status}`,
        );
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        sceneTransitions = data.data;
      }
    } catch (error) {
      console.error("Error fetching transitions:", error);
    }
  }

  // Refresh timestamp only when the component is mounted
  onMount(() => {
    // Initial refresh
    refreshTimestamp();
    // No need for interval - we'll refresh on demand with refreshTrigger
  });

  // Props
  let {
    scenes,
    storyId,
    onAddScene,
    onEditScene,
    onDeleteScene,
    onSelectScene,
    onPlayScene,
    onSelectClip,
    onDuplicateClip,
    onUpdateClip,
    refreshTrigger = 0, // Added to force refresh
  } = $props<{
    scenes: SceneWithRelations[];
    creativeId?: number; // Made optional since it's not used in this component
    storyId: number;
    onAddScene?: () => void;
    onEditScene: (sceneId: number) => void;
    onDeleteScene: (sceneId: number) => void;
    onSelectScene: (sceneId: number) => void;
    onPlayScene?: (sceneId: number) => void;
    onSelectClip: (clip: Clip) => void;
    onDuplicateClip?: (clip: Clip) => void;
    onUpdateClip?: (clipId: number, data: Partial<Clip>) => Promise<void>;
    refreshTrigger?: number; // Optional prop to force refresh
  }>();

  // Track the last seen refreshTrigger value to prevent infinite loops
  let lastSeenRefreshTrigger = $state(0);

  // Effect to update timestamp when refreshTrigger changes
  $effect(() => {
    // Only update if the refreshTrigger has actually changed to a new value
    if (refreshTrigger > 0 && refreshTrigger !== lastSeenRefreshTrigger) {
      lastSeenRefreshTrigger = refreshTrigger;
      refreshTimestamp();
      fetchTransitions(); // Also fetch transitions when refreshing
    }
  });

  // Fetch transitions when component mounts or scenes change
  $effect(() => {
    if (scenes && scenes.length > 0) {
      fetchTransitions();
    }
  });

  // State
  let isCreatingScene = $state(false);
  let isCreatingSceneBetween = $state<{ [key: string]: boolean }>({});
  let isCreatingClip = $state<{ [sceneId: number]: boolean }>({});

  // Create a new scene directly at the end
  async function createNewScene() {
    if (isCreatingScene) return;
    isCreatingScene = true;

    try {
      // Create a new scene - orderIndex is now calculated server-side
      const response = await fetch("/api/scenes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storyId: storyId,
          // orderIndex: nextOrderIndex, // Removed - server handles this
          bgmUrl: null,
          bgmName: null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create scene. Status: ${response.status}`);
      }

      // Get the response which includes the { success, data, message } structure
      const responseData = await response.json();

      if (!responseData.success || !responseData.data) {
        throw new Error(
          responseData.message ||
            "Failed to get valid scene data from API response.",
        );
      }

      // Extract the actual scene object from the 'data' property
      const newScene = responseData.data;

      // Add the new scene (which now has an ID) to the scenes array
      scenes = [...scenes, { ...newScene, clips: [] }];

      // Also call the parent's onAddScene if it exists
      if (onAddScene) {
        onAddScene();
      }
    } catch (error) {
      console.error("Error creating scene:", error);
      alert("Failed to create new scene. Please try again.");
    } finally {
      isCreatingScene = false;
    }
  }

  // Create a new scene between two existing scenes
  async function createSceneBetween(beforeIndex: number, afterIndex: number) {
    const key = `${beforeIndex}-${afterIndex}`;
    if (isCreatingSceneBetween[key]) return;
    isCreatingSceneBetween = { ...isCreatingSceneBetween, [key]: true };

    try {
      // Get the scenes we're inserting between
      const beforeScene = scenes[beforeIndex];
      const afterScene = scenes[afterIndex];

      if (!beforeScene || !afterScene) {
        throw new Error("Invalid scene indexes");
      }

      // Calculate the order index between the two scenes
      const newOrderIndex =
        (beforeScene.orderIndex + afterScene.orderIndex) / 2;

      // Create a new scene with the calculated order index
      const response = await fetch("/api/scenes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storyId: storyId,
          orderIndex: newOrderIndex, // Place between the two scenes
          bgmUrl: null,
          bgmName: null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create scene. Status: ${response.status}`);
      }

      // Get the response which includes the { success, data, message } structure
      const responseData = await response.json();

      if (!responseData.success || !responseData.data) {
        throw new Error(
          responseData.message ||
            "Failed to get valid scene data from API response.",
        );
      }

      // Extract the actual scene object from the 'data' property
      const newScene = responseData.data;

      // Add the new scene to the scenes array and sort by orderIndex
      scenes = [...scenes, { ...newScene, clips: [] }].sort(
        (a, b) => a.orderIndex - b.orderIndex,
      );

      // Also call the parent's onAddScene if it exists
      if (onAddScene) {
        onAddScene();
      }
    } catch (error) {
      console.error("Error creating scene between:", error);
      alert("Failed to create new scene. Please try again.");
    } finally {
      isCreatingSceneBetween = { ...isCreatingSceneBetween, [key]: false };
    }
  }

  async function openTransitionModal(fromIndex: number, toIndex: number) {
    const fromScene = scenes[fromIndex];
    const toScene = scenes[toIndex];

    if (!fromScene || !toScene) {
      console.error("Invalid scene indexes");
      return;
    }

    // Check if a transition already exists between these scenes
    const existingTransition = sceneTransitions.find(
      (t) => t.fromSceneId === fromScene.id && t.toSceneId === toScene.id,
    );

    currentTransition = {
      fromSceneId: fromScene.id,
      toSceneId: toScene.id,
      fromSceneName: `Scene ${fromIndex + 1}`,
      toSceneName: `Scene ${toIndex + 1}`,
      existingTransition: existingTransition,
    };

    isTransitionModalOpen = true;
  }

  async function handleSaveTransition(data: {
    fromSceneId: number;
    toSceneId: number;
    type: string;
    duration: number;
  }) {
    try {
      const response = await fetch("/api/transitions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to save transition. Status: ${response.status}`,
        );
      }

      const responseData = await response.json();

      if (responseData.success && responseData.data) {
        // Update local state with the new/updated transition
        const newTransition = responseData.data;

        // Remove existing transition if it exists
        sceneTransitions = sceneTransitions.filter(
          (t) =>
            !(
              t.fromSceneId === data.fromSceneId &&
              t.toSceneId === data.toSceneId
            ),
        );

        // Add the new transition
        sceneTransitions = [...sceneTransitions, newTransition];

        console.log("Transition saved successfully");
      }
    } catch (error) {
      console.error("Error saving transition:", error);
      throw error; // Re-throw to be handled by the modal
    }
  }
  // Helper functions for transitions
  function hasTransition(
    fromSceneId: number | undefined,
    toSceneId: number | undefined,
  ): boolean {
    if (!fromSceneId || !toSceneId) return false;
    return sceneTransitions.some(
      (t) => t.fromSceneId === fromSceneId && t.toSceneId === toSceneId,
    );
  }

  function getTransitionType(
    fromSceneId: number | undefined,
    toSceneId: number | undefined,
  ): string {
    if (!fromSceneId || !toSceneId) return "";
    const transition = sceneTransitions.find(
      (t) => t.fromSceneId === fromSceneId && t.toSceneId === toSceneId,
    );
    return transition ? transition.type : "";
  }

  function getTransitionDuration(
    fromSceneId: number | undefined,
    toSceneId: number | undefined,
  ): number {
    if (!fromSceneId || !toSceneId) return 0;
    const transition = sceneTransitions.find(
      (t) => t.fromSceneId === fromSceneId && t.toSceneId === toSceneId,
    );
    return transition ? transition.duration : 0;
  }

  // Create a new clip directly
  // Handle opening the narration modal
  function handleEditNarration(clip: Clip, event: Event) {
    event.stopPropagation(); // Prevent triggering the clip selection
    currentEditingClip = clip;
    isNarrationModalOpen = true;
  }

  // Handle saving narration, description, and duration from the modal
  async function handleSaveNarration(data: {
    narration: string | null;
    description: string | null;
    duration: number | null;
  }) {
    if (!currentEditingClip || !onUpdateClip) return;

    try {
      // Prepare data to update, including duration if provided
      const updateData: Partial<Clip> = {
        narration: data.narration,
        description: data.description,
      };
      if (data.duration !== null) {
        updateData.duration = data.duration;
      }

      await onUpdateClip(currentEditingClip.id, updateData);

      // Update the local clip data
      if (currentEditingClip) {
        currentEditingClip.narration = data.narration;
        currentEditingClip.description = data.description;
      }

      // Refresh the scene list
      refreshTimestamp();
    } catch (error) {
      console.error("Error updating clip:", error);
      alert("Failed to update clip. Please try again.");
    }
  }

  // Open the auto-select BGM modal for a scene
  function openAutoSelectBgmModal(sceneId: number, event: Event) {
    // Prevent event bubbling to avoid triggering other actions
    event.stopPropagation();

    // Find the scene to get its index for better display
    const sceneIndex = scenes.findIndex((s: SceneWithRelations) => s.id === sceneId);
    const sceneName = sceneIndex >= 0 ? `Scene ${sceneIndex + 1}` : `Scene ID ${sceneId}`;

    // Check if the scene exists
    const scene = scenes.find((s: SceneWithRelations) => s.id === sceneId);
    if (!scene) {
      toast.error(`Scene not found`);
      return;
    }

    // Set the current scene for the modal
    currentBgmScene = {
      id: sceneId,
      name: sceneName
    };

    // Open the modal
    isAutoSelectBgmModalOpen = true;
  }

  // Handle BGM selection from the modal
  async function handleBgmSelected(event: CustomEvent<{ bgmUrl: string; bgmName: string }>) {
    if (!currentBgmScene) return;

    const { bgmUrl, bgmName } = event.detail;
    const sceneId = currentBgmScene.id;
    const sceneName = currentBgmScene.name;

    isApplyingBgm = true;

    try {
      // Update the scene with the selected BGM
      const response = await fetch(`/api/scenes/${sceneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bgmUrl,
          bgmName,
          // We need to include orderIndex which is required
          orderIndex: scenes.find((s: SceneWithRelations) => s.id === sceneId)?.orderIndex || 0
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update scene. Status: ${response.status}`);
      }

      // Update the scene in the local state
      scenes = scenes.map((s: SceneWithRelations) => {
        if (s.id === sceneId) {
          return {
            ...s,
            bgmUrl,
            bgmName
          };
        }
        return s;
      });

      // Show success message
      toast.success(`BGM "${bgmName}" applied to ${sceneName}`);

    } catch (err: any) {
      console.error('Error applying BGM:', err);
      toast.error(err.message || `Failed to apply BGM to ${sceneName}`);
    } finally {
      isApplyingBgm = false;
      currentBgmScene = null;
    }
  }

  async function createNewClip(sceneId: number) {
    // Skip if already creating a clip for this scene
    if (isCreatingClip[sceneId]) return;

    // Set creating state for this specific scene
    isCreatingClip = { ...isCreatingClip, [sceneId]: true };

    try {
      // Find the scene
      const scene = scenes.find((s: SceneWithRelations) => s.id === sceneId);
      if (!scene) {
        throw new Error(`Scene with ID ${sceneId} not found`);
      }

      // Calculate the next order index for clips in this scene
      const nextOrderIndex =
        scene.clips && scene.clips.length > 0
          ? Math.max(...scene.clips.map((clip: Clip) => clip.orderIndex)) + 1
          : 0;

      // Create a minimal empty canvas data (valid JSON for fabric.js)
      const emptyCanvas = JSON.stringify({
        version: "5.3.0",
        objects: [],
        background: "#ffffff",
      });

      // Create a new clip with default values
      const response = await fetch("/api/clips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sceneId: sceneId,
          orderIndex: nextOrderIndex,
          canvas: emptyCanvas,
          narration: null,
          imageUrl: null, // We'll update this after getting the ID
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create clip. Status: ${response.status}`);
      }

      // Get the response data { success, data, message }
      const responseData = await response.json();
      if (!responseData.success || !responseData.data) {
        throw new Error(
          responseData.message ||
            "Failed to get valid clip data from create API response.",
        );
      }
      const newClip = responseData.data; // Extract the actual clip object

      // Create a blank canvas for the preview
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = 300;
      tempCanvas.height = 200;
      const ctx = tempCanvas.getContext("2d");

      // Variable to store the updated clip data
      let updatedClip: Clip | undefined;

      if (ctx) {
        // Create a blank white canvas with a light gray border
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.strokeStyle = "#e0e0e0";
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, tempCanvas.width - 4, tempCanvas.height - 4);

        // Add some text to indicate it's a new clip
        ctx.fillStyle = "#999999";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText("New Clip", tempCanvas.width / 2, tempCanvas.height / 2);

        // Get the data URL
        const imageDataUrl = tempCanvas.toDataURL("image/png");

        // Upload the preview
        const uploadResponse = await fetch("/api/upload/clip-preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clipId: newClip.id,
            imageData: imageDataUrl,
          }),
        });

        if (!uploadResponse.ok) {
          console.warn(
            `Failed to upload preview for new clip ${newClip.id}. Status: ${uploadResponse.status}`,
          );
        }

        // Get the image URL from the response or construct it
        let imageUrl;
        try {
          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            imageUrl = uploadData.imageUrl;
          } else {
            // Fallback to the expected URL format
            imageUrl = `/clip-previews/clip-${newClip.id}.png`;
          }
        } catch (err) {
          console.warn("Error parsing upload response:", err);
          // Fallback to the expected URL format
          imageUrl = `/clip-previews/clip-${newClip.id}.png`;
        }

        // Update the clip with the image URL
        const updateResponse = await fetch(`/api/clips/${newClip.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageUrl: imageUrl ? imageUrl.split("?")[0] : imageUrl, // Remove any query parameters if imageUrl exists
          }),
        });

        if (!updateResponse.ok) {
          console.warn(
            `Failed to update clip with image URL. Status: ${updateResponse.status}`,
          );
        }

        // Get the updated clip with the image URL
        try {
          if (updateResponse.ok) {
            const updateResponseData = await updateResponse.json();
            if (!updateResponseData.success || !updateResponseData.data) {
              console.warn(
                "Update response was ok but data structure is invalid:",
                updateResponseData,
              );
              updatedClip = { ...newClip, imageUrl }; // Fallback
            } else {
              updatedClip = updateResponseData.data; // Extract from data property
            }
          } else {
            // If update failed, use the initially created clip but add the expected imageUrl
            updatedClip = { ...newClip, imageUrl };
          }
        } catch (err) {
          console.warn("Error parsing update response JSON:", err);
          updatedClip = { ...newClip, imageUrl }; // Fallback
        }
      } else {
        // Fallback if canvas context is not available
        console.warn("Could not get canvas context for preview generation");
        const imageUrl = `/clip-previews/clip-${newClip.id}.png`;

        // Update the clip with the image URL even without a preview
        const updateResponse = await fetch(`/api/clips/${newClip.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageUrl: imageUrl,
          }),
        });

        try {
          if (updateResponse.ok) {
            const updateResponseData = await updateResponse.json();
            if (!updateResponseData.success || !updateResponseData.data) {
              console.warn(
                "Update response was ok but data structure is invalid:",
                updateResponseData,
              );
              updatedClip = { ...newClip, imageUrl }; // Fallback
            } else {
              updatedClip = updateResponseData.data; // Extract from data property
            }
          } else {
            // If update failed, use the initially created clip but add the expected imageUrl
            updatedClip = { ...newClip, imageUrl };
          }
        } catch (err) {
          console.warn("Error parsing update response JSON:", err);
          updatedClip = { ...newClip, imageUrl }; // Fallback
        }
      }

      // Add the new clip (which now has an ID and imageUrl) to the scene's clips array
      // and make sure clips are sorted by orderIndex
      const updatedScenes = scenes.map((s: SceneWithRelations) => {
        if (s.id === sceneId) {
          // Add the new clip and sort by orderIndex
          const updatedClips = [...(s.clips || []), updatedClip].sort(
            (a, b) => {
              // Handle possible undefined values and ensure we're working with numbers
              const orderA = a?.orderIndex !== undefined && a?.orderIndex !== null ? Number(a.orderIndex) : 0;
              const orderB = b?.orderIndex !== undefined && b?.orderIndex !== null ? Number(b.orderIndex) : 0;
              return orderA - orderB;
            }
          );
          return {
            ...s,
            clips: updatedClips,
          };
        }
        return s;
      });

      scenes = updatedScenes;

      // Force a refresh of the timestamp to ensure images are refreshed
      refreshTimestamp();

      // Make sure the updatedClip has a timestamped imageUrl for display
      if (updatedClip && updatedClip.imageUrl) {
        // Add timestamp to force browser to reload the image
        updatedClip = {
          ...updatedClip,
          imageUrl: `${updatedClip.imageUrl}?t=${timestamp}`,
        };
      }

      // Automatically select the newly created clip
      if (onSelectClip && updatedClip) {
        // Small delay to ensure the UI has updated
        setTimeout(() => {
          onSelectClip(updatedClip);
        }, 100);
      }
    } catch (error) {
      console.error("Error creating clip:", error);
      alert("Failed to create new clip. Please try again.");
      // Reset creating state for this scene
      isCreatingClip = { ...isCreatingClip, [sceneId]: false };
    }
  }
</script>

<div class="space-y-4">
  <div class="flex space-x-1 overflow-x-auto">
    {#if scenes.length > 0}
      {#each scenes as scene, index (scene.id)}
        {#if index > 0}
          <div class="mt-7">
            <button
              type="button"
              onclick={() => openTransitionModal(index - 1, index)}
              disabled={isCreatingSceneBetween[`${index - 1}-${index}`]}
              class="flex-shrink-0 mx-1 border rounded {hasTransition(
                scenes[index - 1]?.id,
                scenes[index]?.id,
              )
                ? 'bg-blue-50 border-blue-200'
                : 'bg-gray-50'} hover:bg-gray-100 flex items-center justify-center relative hover:ring-2 hover:ring-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow cursor-pointer"
            >
              <div class="flex flex-col items-center justify-center">
                <ChevronsLeftRightEllipsis
                  class="h-4 w-4 {hasTransition(
                    scenes[index - 1]?.id,
                    scenes[index]?.id,
                  )
                    ? 'text-blue-600'
                    : 'text-gray-600'}"
                />
              </div>
            </button>
            <button
              type="button"
              onclick={() => createSceneBetween(index - 1, index)}
              disabled={isCreatingSceneBetween[`${index - 1}-${index}`]}
              class="flex-shrink-0 mt-2 mb-2 mx-1 border rounded bg-gray-50 hover:bg-gray-100 flex items-center justify-center relative hover:ring-2 hover:ring-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow cursor-pointer"
            >
              <div class="flex flex-col items-center justify-center">
                <Plus class="h-4 w-4 text-gray-600" />
              </div>
            </button>
          </div>
        {/if}
        <div
          class="border rounded-md p-0 hover:shadow-md transition-shadow p-2 flex-shrink-0"
        >
          <div class="flex justify-between items-start mb-0">
            <div class="flex-1 min-w-0">
              <button
                type="button"
                class="text-lg font-semibold hover:text-blue-600 cursor-pointer truncate text-left w-full"
                title="Scene {index + 1}"
                onclick={() => onSelectScene(scene.id)}
                onkeydown={(e) => e.key === "Enter" && onSelectScene(scene.id)}
              >
                Scene {index + 1}
              </button>
              <div class="flex items-center text-sm text-muted-foreground">
                {#if scene.bgmName}
                  <Music class="h-3 w-3 mr-1" />
                  <span class="mr-3">{scene.bgmName}</span>
                {/if}
                <!-- Removed simple clip count -->
              </div>
            </div>
            <div class="flex gap-1 flex-shrink-0">
              {#if onPlayScene}
                <Button
                  variant="ghost"
                  class="h-8 w-8 p-0"
                  onclick={() => onPlayScene(scene.id)}
                  title="Play Scene"
                >
                  <Play class="h-4 w-4" />
                </Button>
              {/if}
              <Button
                variant="ghost"
                class="h-8 w-8 p-0"
                onclick={(e) => openAutoSelectBgmModal(scene.id, e)}
                title="Auto-Select BGM"
              >
                <Sparkles class="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                class="h-8 w-8 p-0"
                onclick={() => onEditScene(scene.id)}
                title="Edit Scene"
              >
                <Edit class="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                class="h-8 w-8 p-0"
                onclick={() => onDeleteScene(scene.id)}
                title="Delete Scene"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
          </div>

          <!-- Clip Preview Row -->
          <div class="mt-0 flex overflow-x-auto pl-1">
            {#if scene.clips && scene.clips.length > 0}
              <!-- Sort clips by orderIndex before rendering -->
              {#each scene.clips.slice().sort((a: Clip, b: Clip) => {
                const aIndex = a.orderIndex !== undefined && a.orderIndex !== null ? Number(a.orderIndex) : 0;
                const bIndex = b.orderIndex !== undefined && b.orderIndex !== null ? Number(b.orderIndex) : 0;
                return aIndex - bIndex;
              }) as clip, clipIndex (clip.id)}
                {#if clipIndex > 0}
                  <AddClipBetweenButton
                    scene={scene}
                    beforeClip={scene.clips.slice().sort((a: Clip, b: Clip) => {
                      const aIndex = a.orderIndex !== undefined && a.orderIndex !== null ? Number(a.orderIndex) : 0;
                      const bIndex = b.orderIndex !== undefined && b.orderIndex !== null ? Number(b.orderIndex) : 0;
                      return aIndex - bIndex;
                    })[clipIndex - 1]}
                    afterClip={clip}
                    onClipAdded={() => refreshTimestamp()}
                  />
                {/if}
                <div class="relative flex-shrink-0 group m-1 mr-0 ml-0">

                  <button
                    type="button"
                    onclick={() => onSelectClip(clip)}
                    class="flex-shrink-0 w-auto h-[65px] border rounded overflow-hidden bg-gray-100 flex items-center justify-center relative hover:ring-2 hover:ring-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow cursor-pointer p-0"
                    title="Select Clip {clip.orderIndex} (ID: {clip.id})"
                  >
                    {#if clip.imageUrl}
                      <img
                        src={`${clip.imageUrl}?t=${timestamp}`}
                        alt="Clip preview"
                        class="object-cover w-full h-full"
                        loading="lazy"
                        onerror={(e: Event) => {
                          // If image fails to load, show canvas preview instead
                          if (
                            clip.canvas &&
                            e.target instanceof HTMLImageElement
                          ) {
                            const imgElement = e.target as HTMLImageElement;
                            imgElement.style.display = "none";
                            // We can't directly switch to CanvasPreview here, so we'll show a fallback icon
                            if (imgElement.parentElement) {
                              imgElement.parentElement.innerHTML =
                                '<div class="flex items-center justify-center w-full h-full"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 text-gray-400"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>';
                            }
                          }
                        }}
                      />
                    {:else if clip.canvas}
                      <CanvasPreview
                        canvasData={clip.canvas}
                        width={100}
                        height={65}
                      />
                    {:else}
                      <ImageIcon class="h-4 w-4 text-gray-400" />
                    {/if}
                  </button>
                  <div
                    class="absolute top-0.5 -right-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {#if onUpdateClip}
                      <button
                        type="button"
                        onclick={(e) => handleEditNarration(clip, e)}
                        class="bg-white rounded-full p-0.5 shadow-sm border hover:bg-gray-100"
                        title="Edit Narration & Description"
                      >
                        <MessageSquare class="h-3 w-3 text-gray-600" />
                      </button>
                    {/if}
                    {#if onDuplicateClip}
                      <button
                        type="button"
                        onclick={(e) => {
                          e.stopPropagation();
                          onDuplicateClip(clip);
                        }}
                        class="bg-white rounded-full p-0.5 shadow-sm border hover:bg-gray-100"
                        title="Duplicate Clip"
                      >
                        <Copy class="h-3 w-3 text-gray-600" />
                      </button>
                    {/if}
                  </div>
                </div>
              {/each}
              {#if scene.clips.length > 7}
                <div
                  class="flex-shrink-0 w-[50px] h-[33px] border rounded bg-gray-100 flex items-center justify-center text-xs text-muted-foreground"
                  title="{scene.clips.length - 7} more clips"
                >
                  + {scene.clips.length - 7}
                </div>
              {/if}
            {/if}

            <!-- Add Clip Button (next to the last clip) -->
            <button
              type="button"
              onclick={() => createNewClip(scene.id)}
              disabled={isCreatingClip[scene.id]}
              class="flex-shrink-0 w-[50px] h-[33px] mt-5 !mr-1 ml-1 border rounded bg-gray-50 hover:bg-gray-100 flex items-center justify-center relative hover:ring-2 hover:ring-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow cursor-pointer p-0"
              title="Add new clip"
            >
              <Plus class="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
      {/each}
    {/if}
    <!-- End of #if scenes.length > 0 -->

    <!-- Add New Scene Button (This is the correct one, outside the #if) -->
    <button
      type="button"
      onclick={createNewScene}
      disabled={isCreatingScene}
      class="border rounded-md p-4 mt-6 hover:shadow-md transition-shadow w-30 flex-shrink-0 flex flex-col items-center justify-center h-[80px] bg-gray-50 hover:bg-gray-100 cursor-pointer"
    >
      <div class="flex flex-col items-center justify-center h-full">
        <div class="rounded-full bg-gray-200 p-1.5 mb-2">
          <Plus class="h-5 w-5 text-gray-600" />
        </div>
        <span class="text-gray-600 font-medium"
          >{isCreatingScene ? "Creating..." : "New Scene"}</span
        >
      </div>
    </button>
  </div>
  <!-- End of flex container -->

  {#if scenes.length === 0}
    <!-- Optional: Add a message when there are no scenes -->
    <div class="text-center text-muted-foreground p-4">
      No scenes yet. Click "New Scene" to get started.
    </div>
  {/if}

  {#if currentEditingClip}
    <ClipNarrationModal
      bind:open={isNarrationModalOpen}
      clip={currentEditingClip}
      onSave={handleSaveNarration}
    />
  {/if}

  {#if currentTransition}
    <TransitionModal
      bind:open={isTransitionModalOpen}
      fromSceneId={currentTransition.fromSceneId}
      toSceneId={currentTransition.toSceneId}
      fromSceneName={currentTransition.fromSceneName}
      toSceneName={currentTransition.toSceneName}
      existingTransition={currentTransition.existingTransition}
      onSave={handleSaveTransition}
    />
  {/if}

  <!-- Always render the modal but control visibility with the open prop -->
  <AddBgmModal
    bind:open={isAutoSelectBgmModalOpen}
    sceneId={currentBgmScene?.id || 0}
    sceneName={currentBgmScene?.name || ''}
    isLoading={isApplyingBgm}
    on:close={() => {
      isAutoSelectBgmModalOpen = false;
      currentBgmScene = null;
    }}
    on:select={handleBgmSelected}
  />
</div>
