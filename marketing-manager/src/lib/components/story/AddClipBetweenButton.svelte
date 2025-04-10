<script lang="ts">
  import { Plus } from "lucide-svelte";
  import type { Clip, SceneWithRelations } from "$lib/types/story.types";

  // Props
  let {
    scene,
    beforeClip,
    afterClip,
    onClipAdded
  } = $props<{
    scene: SceneWithRelations;
    beforeClip: Clip;
    afterClip: Clip;
    onClipAdded?: () => void;
  }>();

  // State
  let isCreating = $state(false);

  // Create a clip between two existing clips
  async function createClipBetween() {
    if (isCreating) return;
    isCreating = true;

    try {
      if (!scene || !scene.clips) {
        throw new Error(`Scene is invalid or has no clips`);
      }

      // We now receive the clips directly as props
      if (!beforeClip || !afterClip) {
        throw new Error("Invalid clips provided");
      }

      // Calculate the order index between the two clips
      const newOrderIndex = (beforeClip.orderIndex + afterClip.orderIndex) / 2;

      // Create a minimal empty canvas data (valid JSON for fabric.js)
      const emptyCanvas = JSON.stringify({
        version: "5.3.0",
        objects: [],
        background: "#ffffff",
      });

      // Create a new clip with the calculated order index
      const response = await fetch("/api/clips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sceneId: scene.id,
          orderIndex: newOrderIndex,
          canvas: emptyCanvas,
          narration: null,
          imageUrl: null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create clip. Status: ${response.status}`);
      }

      // Get the response data
      const responseData = await response.json();
      if (!responseData.success || !responseData.data) {
        throw new Error(
          responseData.message ||
            "Failed to get valid clip data from create API response."
        );
      }
      const newClip = responseData.data;

      // Create a blank canvas for the preview
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = 300;
      tempCanvas.height = 200;
      const ctx = tempCanvas.getContext("2d");

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
        await fetch("/api/upload/clip-preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clipId: newClip.id,
            imageData: imageDataUrl,
          }),
        });

        // Update the clip with the image URL
        const imageUrl = `/clip-previews/clip-${newClip.id}.png`;
        await fetch(`/api/clips/${newClip.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageUrl: imageUrl,
          }),
        });
      }

      // We need to update the scene's clips array with the new clip
      // and make sure it's properly sorted by orderIndex
      // Note: We don't need to update the local state since we're forcing a page reload

      // Call the callback to notify parent component
      // This will trigger a refresh in the parent component
      if (onClipAdded) {
        onClipAdded();
      }

      // Force a page reload to ensure everything is properly updated
      // This is a bit heavy-handed but ensures the UI is consistent
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error("Error creating clip between:", error);
      alert("Failed to create new clip. Please try again.");
    } finally {
      isCreating = false;
    }
  }
</script>

<div class="relative flex-shrink-0 group mx-0.5 transition-opacity">
  <button
    type="button"
    onclick={createClipBetween}
    disabled={isCreating}
    class="flex-shrink-0 mt-7 border rounded bg-gray-50 hover:bg-gray-100 flex items-center justify-center relative hover:ring-2 hover:ring-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow cursor-pointer p-0"
    title="Add clip between"
  >
    <Plus class="h-4 w-4 text-gray-600" />
  </button>
</div>
