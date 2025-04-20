<script lang="ts">
  // Remove enhance import, we'll handle submission manually
  // import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte'; // Remove tick, no longer needed with manual fetch

  let recording = false;
  let videoPreviewUrl: string | null = null;
  let submitting = false;
  let videoElement: HTMLVideoElement; // To display live camera feed & preview
  let mediaStream: MediaStream | null = null;
  let mediaRecorder: MediaRecorder | null = null;
  let recordedChunks: Blob[] = [];
  let errorMsg: string | null = null;
  let uploadedVideoUrl: string | null = null; // To store URL after upload

  onMount(async () => {
    // Request camera access when component mounts (for initial view)
    await initializeCamera();
  });

  onDestroy(() => {
    // Clean up stream when component is destroyed
    stopCamera();
  });

  async function initializeCamera() {
    errorMsg = null;
    stopCamera(); // Ensure previous stream is stopped
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoElement) {
        videoElement.srcObject = mediaStream;
        videoElement.play(); // Start displaying the live feed
      }
    } catch (err) {
      console.error("Error accessing media devices.", err);
      errorMsg = "Could not access camera/microphone. Please check permissions.";
      mediaStream = null;
    }
  }

  function stopCamera() {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
      if (videoElement) {
        videoElement.srcObject = null;
      }
    }
  }

  async function startRecording() {
    if (!mediaStream) {
      errorMsg = "Camera not available.";
      console.log("Attempting to re-initialize camera before recording...");
      await initializeCamera(); // Try to get stream again
      if (!mediaStream) return; // Still no stream, exit
    }

    errorMsg = null;
    videoPreviewUrl = null; // Clear previous preview
    recordedChunks = [];
    try {
      mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm' }); // Specify mimeType if needed

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        videoPreviewUrl = URL.createObjectURL(blob);
        recording = false;
        stopCamera(); // Stop live feed after recording stops
        if (videoElement) {
           videoElement.srcObject = null; // Ensure live feed stops showing
           videoElement.src = videoPreviewUrl; // Set preview source
           videoElement.load(); // Load the new source
        }
        console.log("Recording stopped, preview URL created:", videoPreviewUrl);
      };

      mediaRecorder.start();
      recording = true;
      console.log('Recording started.');

    } catch (err) {
      console.error("Error starting media recorder.", err);
      errorMsg = "Failed to start recording.";
      recording = false;
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      // onstop handler will set recording = false and create preview
      console.log('Stop recording requested.');
    }
  }

  async function discardPreview() {
    console.log('Discarding preview and re-initializing camera...');
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl); // Clean up blob URL
    }
    videoPreviewUrl = null;
    uploadedVideoUrl = null; // Also clear any potentially uploaded URL
    recording = false;
    await initializeCamera(); // Re-start camera for new recording
  }

  async function discardAll() {
    console.log('Discarding all and navigating away...');
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    videoPreviewUrl = null;
    uploadedVideoUrl = null;
    recording = false;
    stopCamera(); // Ensure camera is off before navigating
    // Optionally reset form fields here if needed
    goto('/eots'); // Or back to creator dashboard/previous page
  }

  // --- Form Handling (Manual Submission) ---
  async function handleFormSubmit(event: SubmitEvent) {
    event.preventDefault(); // Prevent default browser form submission

    const formElement = event.target as HTMLFormElement;

    if (!videoPreviewUrl || recordedChunks.length === 0) {
      errorMsg = "No video recorded or preview available to save.";
      return;
    }
    submitting = true;
    errorMsg = null;
    let tempUploadedVideoUrl: string | null = null;

    // --- Step 1: Upload Video ---
    const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
    const uploadFormData = new FormData();
    uploadFormData.append('file', videoBlob, 'captured_energy.webm');

    try {
      console.log('Uploading video blob...');
      const uploadResponse = await fetch('/api/files/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({ message: 'Upload failed with status: ' + uploadResponse.status }));
        throw new Error(errorData.message || 'Video upload failed.');
      }

      const uploadResult = await uploadResponse.json();
      if (!uploadResult.success || !uploadResult.url) {
         throw new Error('Video upload did not return a valid URL.');
      }

      tempUploadedVideoUrl = uploadResult.url;
      console.log('Video uploaded successfully. URL:', tempUploadedVideoUrl);

      // --- Step 2: Submit Metadata (including video URL) ---
      if (!tempUploadedVideoUrl) {
        // This should ideally not happen if upload succeeded, but handle defensively
        throw new Error("Failed to get video URL after successful upload.");
      }
      console.log('Submitting metadata form data...');
      const metadataFormData = new FormData(formElement); // Get data from form fields
      metadataFormData.set('video_url', tempUploadedVideoUrl); // Set the correct video URL (now guaranteed non-null)

      // Log FormData contents before sending
      console.log('--- Inspecting FormData before sending to action ---');
      for (let [key, value] of metadataFormData.entries()) {
        console.log(`${key}: ${value}`);
      }
      console.log('----------------------------------------------------');

      // Use fetch to POST to the page's base URL. SvelteKit routes this to the default action.
      const actionResponse = await fetch('/capture', { // Use page path, not formElement.action
          method: 'POST',
          body: metadataFormData
          // No special headers needed for default action with manual fetch
      });

      // --- Step 3: Handle Action Response ---
      if (actionResponse.ok) {
          // Check for redirects indicated by the server action
          if (actionResponse.redirected) {
              console.log('Server action successful, redirecting...');
              // SvelteKit actions redirect automatically when using enhance,
              // but with manual fetch, we need to handle it.
              // We can use goto() or simply let the browser follow if the server sends a 3xx status.
              // For simplicity, let's use goto based on the redirect URL.
              // Note: Fetch API doesn't expose the final redirect URL directly in opaque redirects.
              // A common pattern is to check status 200 after a redirect or rely on server sending data.
              // Since our server action uses `redirect(303, '/eots')`, we know where to go.
              goto('/eots', { invalidateAll: true }); // Invalidate data on target page
          } else {
              // Handle cases where the action succeeded but didn't redirect (if applicable)
              console.log('Server action successful (no redirect).');
              // Maybe show a success message here?
              // For now, assume success means redirect.
              goto('/eots', { invalidateAll: true });
          }
      } else {
          // Handle errors from the server action (e.g., validation errors)
          console.error('Server action failed:', actionResponse.status, actionResponse.statusText);
          const errorResult = await actionResponse.json().catch(() => null);
          if (errorResult && errorResult.message) {
              errorMsg = errorResult.message;
          } else if (errorResult && errorResult.errors) {
              // Handle validation errors (flatten them for display)
              const validationErrors = Object.entries(errorResult.errors)
                  .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
                  .join('; ');
              errorMsg = `Validation failed: ${validationErrors}`;
          } else {
              errorMsg = `Failed to save EOT. Status: ${actionResponse.status}`;
          }
          submitting = false; // Re-enable form on error
      }

    } catch (err: any) {
      console.error("Upload or submission error:", err);
      errorMsg = err.message || "An error occurred during the process.";
      submitting = false; // Re-enable form on error
    }
    // No need to set submitting = false on success, as we navigate away.
  }

</script>

<div class="container mx-auto p-4 max-w-md">
  <h1 class="text-2xl font-bold mb-4 text-center">Capture Energy</h1>

  {#if errorMsg}
    <p class="text-red-500 bg-red-100 border border-red-400 p-3 rounded mb-4">{errorMsg}</p>
  {/if}

  <!-- Video Element for Live Feed & Preview -->
  <div class="border rounded-lg mb-4 aspect-video bg-black flex items-center justify-center overflow-hidden">
     <video bind:this={videoElement} muted playsinline class="w-full h-full object-cover">
       Your browser does not support the video tag.
     </video>
     {#if !mediaStream && !videoPreviewUrl && !recording}
       <p class="text-gray-400 absolute">Initializing Camera...</p>
     {/if}
  </div>


  {#if !recording && !videoPreviewUrl}
    <!-- Player View - Ready to Record -->
     <button
      on:click={startRecording}
      disabled={!mediaStream}
      class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      REC
    </button>
  {:else if recording}
    <!-- Recording View -->
     <button
      on:click={stopRecording}
      class="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 px-4 rounded mb-4"
    >
      STOP
    </button>
  {:else if videoPreviewUrl && !recording}
    <!-- Preview & Metadata View -->
    <div class="border rounded-lg p-4 mb-4">
       <h2 class="text-xl font-semibold mb-2">Preview</h2>
       <!-- Preview is now shown in the main video element above -->
       <button
        on:click={discardPreview}
        class="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded mb-4"
      >
        Discard & Record Again
      </button>

      <h2 class="text-xl font-semibold mb-2">4W - Dados</h2>
      <p class="text-sm text-gray-600 mb-4">Insira as informações referente a energia capturada.</p>

      <!-- Standard form, but submission is handled manually by handleFormSubmit -->
      <!-- action="?/default" is implicit for the default action -->
      <form method="POST" action="?/default" on:submit={handleFormSubmit} class="space-y-4">
         <!-- video_url is now added manually to FormData in the submit handler -->
         <!-- Remove the bound hidden input -->
         <!-- <input type="hidden" name="video_url" bind:value={uploadedVideoUrl} /> -->

        <div>
          <label for="recorded_at" class="block text-sm font-medium text-gray-700">When</label>
          <input
            type="datetime-local"
            id="recorded_at"
            name="recorded_at"
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label for="recorded_by" class="block text-sm font-medium text-gray-700">Who</label>
          <input
            type="text"
            id="recorded_by"
            name="recorded_by"
            placeholder="Nome"
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label for="activity" class="block text-sm font-medium text-gray-700">What</label>
          <input
            type="text"
            id="activity"
            name="activity"
            placeholder="Things"
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label for="location" class="block text-sm font-medium text-gray-700">Where</label>
          <input
            type="text"
            id="location"
            name="location"
            placeholder="Local"
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div class="flex space-x-4">
           <button
            type="button"
            on:click={discardAll}
            disabled={submitting}
            class="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            Excluir
          </button>
          <button
            type="submit"
            disabled={submitting}
            class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {#if submitting}Saving...{:else}Salvar{/if}
          </button>
        </div>
      </form>
    </div>
  {/if}

</div>
