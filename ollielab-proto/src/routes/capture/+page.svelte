<script lang="ts">
  // Remove enhance import, we'll handle submission manually
  // import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte'; // Remove tick, no longer needed with manual fetch
  import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

  let recording = false;
  let videoPreviewUrl: string | null = null;
  let submitting = false;
  let videoElement: HTMLVideoElement; // To display live camera feed & preview
  let mediaStream: MediaStream | null = null;
  let mediaRecorder: MediaRecorder | null = null;
  let recordedChunks: Blob[] = [];
  let errorMsg: string | null = null;
  let uploadedVideoUrl: string | null = null; // To store URL after upload

  // MediaPipe variables
  let poseLandmarker: PoseLandmarker | undefined = undefined;
  let drawingUtils: DrawingUtils | undefined = undefined;
  let canvasElement: HTMLCanvasElement;
  let canvasCtx: CanvasRenderingContext2D | null = null;
  let processingRecordedVideo = false; // Renamed from processingLandmarks
  let showLiveLandmarks = false; // User toggle for live view
  let isShowingLiveLandmarks = false; // Internal state for loop running
  let landmarkData: any[] = []; // To store landmark results from recorded video
  let lastVideoTime = -1; // Used for both live and recorded processing
  let animationFrameId: number | null = null; // Used for both live and recorded processing
  let modelError: string | null = null; // To display model loading errors

  // --- MediaPipe Configuration ---
  let mpNumPoses = 1;
  let mpMinPoseDetectionConfidence = 0.5;
  let mpDelegate: "GPU" | "CPU" = "GPU";
  let mpShowDepth = true; // Default to showing depth via size
  let mpShowCertainty = true; // Default to showing certainty via color/alpha
  let mpModelType: "lite" | "full" | "heavy" = "lite"; // Default to lite model
  let isReinitializing = false; // Flag during re-init

  onMount(async () => {
    // Initialize MediaPipe first
    await initializePoseLandmarker(); // This will now set modelError if it fails
    // Then request camera access
    await initializeCamera(); // This will NOT trigger live detection automatically anymore
    // Get canvas context after component mounts
    if (canvasElement) {
        canvasCtx = canvasElement.getContext('2d');
        if (canvasCtx) {
            drawingUtils = new DrawingUtils(canvasCtx);
        } else {
            console.error("Failed to get 2D context for canvas");
            errorMsg = "Failed to initialize drawing canvas.";
        }
    }
  });

  onDestroy(() => {
    // Clean up stream when component is destroyed
    stopCamera(); // This also stops live detection now
    // Clean up MediaPipe resources
    poseLandmarker?.close();
    // Cancel any pending animation frame for recorded video analysis
    stopRecordedVideoAnalysis();
  });

  async function initializeCamera() {
    errorMsg = null;
    stopCamera(); // Ensure previous stream is stopped
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoElement) {
        videoElement.srcObject = mediaStream;
        await videoElement.play(); // Start displaying the live feed
        // Live detection is now started via the toggle, not automatically
      }
    } catch (err) {
      console.error("Error accessing media devices.", err);
      errorMsg = "Could not access camera/microphone. Please check permissions.";
      mediaStream = null;
    }
  }

  async function initializePoseLandmarker() {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        // Path to the WASM backend files - adjust if necessary
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      // Use config state variables
      poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `/mediapipe/pose_landmarker_${mpModelType}.task`, // Now using selected model type
          delegate: mpDelegate
        },
        runningMode: "VIDEO",
        numPoses: mpNumPoses,
        minPoseDetectionConfidence: mpMinPoseDetectionConfidence,
        // minPosePresenceConfidence and minTrackingConfidence could be added too
      });
      console.log("PoseLandmarker initialized successfully with config:", { mpNumPoses, mpMinPoseDetectionConfidence, mpDelegate, mpModelType });
      modelError = null; // Clear any previous model error
    } catch (err: any) {
      console.error("Error initializing PoseLandmarker:", err);
      modelError = `Failed to load pose model: ${err.message || 'Unknown error'}. Live preview disabled.`;
      errorMsg = modelError; // Also show in main error area
      poseLandmarker = undefined; // Ensure it's undefined on failure
      showLiveLandmarks = false; // Disable toggle if model failed
    }
  }

  // --- Re-initialize MP when config changes ---
  async function handleConfigChange() {
      if (!poseLandmarker) return; // Don't re-init if initial load failed

      console.log("Config changed, re-initializing PoseLandmarker...");
      isReinitializing = true;
      const wasShowingLive = isShowingLiveLandmarks;
      stopLiveLandmarkDetection(); // Stop current loop if running
      if (canvasCtx) canvasCtx.clearRect(0, 0, canvasElement?.width ?? 0, canvasElement?.height ?? 0); // Clear canvas

      poseLandmarker?.close(); // Close existing instance
      poseLandmarker = undefined; // Set to undefined

      await initializePoseLandmarker(); // Re-initialize with new settings

      isReinitializing = false;
      // Restart live detection if it was on before and the toggle is still on
      if (wasShowingLive && showLiveLandmarks && poseLandmarker) {
          startLiveLandmarkDetection();
      }
  }


  // Reactive statement to start/stop live detection based on the toggle
  $: if (showLiveLandmarks && mediaStream && poseLandmarker && !isShowingLiveLandmarks && !recording && !videoPreviewUrl && !isReinitializing) {
      startLiveLandmarkDetection();
  } else if (!showLiveLandmarks && isShowingLiveLandmarks) {
      stopLiveLandmarkDetection();
  }

  function stopCamera() {
    stopLiveLandmarkDetection(); // Stop detection when camera stops
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

    // Stop live landmark detection before starting recording
    stopLiveLandmarkDetection();
    if (canvasCtx) canvasCtx.clearRect(0, 0, canvasElement?.width ?? 0, canvasElement?.height ?? 0); // Clear canvas

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
           // Wait for video metadata to load before starting analysis
           videoElement.onloadeddata = () => {
               console.log("Preview video loaded, starting landmark analysis...");
               // Resize canvas to match video dimensions
               if (canvasElement && videoElement) {
                   canvasElement.width = videoElement.videoWidth;
                   canvasElement.height = videoElement.videoHeight;
               }
               analyzeRecordedVideo(); // Start processing recorded video after it's ready
           };
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

  // --- Live Landmark Detection Loop ---
  function startLiveLandmarkDetection() {
    // Check conditions again, including the user toggle state
    if (!showLiveLandmarks || !poseLandmarker || !videoElement || !canvasCtx || !drawingUtils || !mediaStream || videoElement.paused || videoElement.ended) {
      console.log("Conditions not met for live landmark detection.");
      isShowingLiveLandmarks = false;
      return;
    }
    isShowingLiveLandmarks = true; // Set internal state
    console.log("Starting live landmark detection loop.");

    const processLiveFrame = async () => {
        // Check internal state and other conditions
        if (!isShowingLiveLandmarks || !poseLandmarker || !videoElement || !canvasCtx || !drawingUtils || videoElement.paused || videoElement.ended || !mediaStream) {
            console.log("Stopping live landmark detection loop.");
            isShowingLiveLandmarks = false;
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            // Clear canvas when stopping live view
            if (canvasCtx) canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            return;
        }

        const startTimeMs = performance.now();
        // Ensure canvas matches video dimensions (might change if window resized, etc.)
        if (canvasElement.width !== videoElement.videoWidth) canvasElement.width = videoElement.videoWidth;
        if (canvasElement.height !== videoElement.videoHeight) canvasElement.height = videoElement.videoHeight;

        // Detect landmarks on the current video frame
        const results = poseLandmarker.detectForVideo(videoElement, startTimeMs);

        // Clear canvas before drawing new frame
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        // Draw landmarks if found
        if (results.landmarks && results.landmarks.length > 0) {
            const utils = drawingUtils; // Assign to local const for TS narrowing
            results.landmarks.forEach(landmark => {
                // Define drawing options based on toggles
                const landmarkOptions = {
                    color: mpShowCertainty ? (data: any) => `rgba(0, 255, 0, ${data.from!.visibility ?? 1})` : '#00FF00', // Green, alpha based on visibility if toggled
                    radius: mpShowDepth ? (data: any) => DrawingUtils.lerp(data.from!.z, -0.5, 0.5, 20, 0.1) : 3 // New radius range: 20 to 0.1
                };
                const connectorOptions = {
                     color: mpShowCertainty ? (data: any) => `rgba(255, 255, 255, ${Math.min(data.from!.visibility ?? 1, data.to!.visibility ?? 1)})` : '#FFFFFF', // White, alpha based on connected points' visibility
                     lineWidth: mpShowDepth ? (data: any) => DrawingUtils.lerp((data.from!.z + data.to!.z) / 2, -0.5, 0.5, 20, 6) : 2 // Line width based on average depth, range 20 to 6
                };

                utils.drawLandmarks(landmark, landmarkOptions);
                utils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS, connectorOptions);
            });
        }

        // Continue processing next frame
        animationFrameId = requestAnimationFrame(processLiveFrame);
    };

    // Start the loop
    animationFrameId = requestAnimationFrame(processLiveFrame);
  }

  function stopLiveLandmarkDetection() {
      if (isShowingLiveLandmarks) {
          console.log("Explicitly stopping live landmark detection.");
      }
      isShowingLiveLandmarks = false; // Signal the loop to stop
      // The loop itself will cancel the animation frame and clear the canvas
  }


  // --- Recorded Video Landmark Analysis ---
  // Renamed from analyzeVideoPoses
  async function analyzeRecordedVideo() {
    if (!poseLandmarker || !videoElement || !canvasCtx || !drawingUtils || videoElement.paused || videoElement.ended) {
      console.log("Conditions not met for recorded video landmark analysis. Stopping.");
      processingRecordedVideo = false;
      return;
    }

    processingRecordedVideo = true;
    landmarkData = []; // Reset data for new analysis
    lastVideoTime = -1; // Reset time tracking

    const processRecordedFrame = async () => {
        // Stop condition check
        if (!processingRecordedVideo || !poseLandmarker || !videoElement || !canvasCtx || !drawingUtils || videoElement.paused || videoElement.ended) {
            console.log("Stopping recorded video analysis loop.");
            processingRecordedVideo = false;
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            // Clear canvas when done or stopped (check context first)
            if (canvasCtx) {
                canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            }
            // Maybe redraw the final frame without analysis overlay? Or just leave it clear.
            return;
        }

        const startTimeMs = performance.now();
        const currentTime = videoElement.currentTime * 1000; // Convert to ms

        // Only process if time has changed to avoid redundant processing
        if (currentTime > lastVideoTime) {
            const results = poseLandmarker.detectForVideo(videoElement, startTimeMs);
            lastVideoTime = currentTime;

            // Clear canvas before drawing new frame (check context first)
            if (canvasCtx) {
                canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            }

            if (results.landmarks && results.landmarks.length > 0) {
                landmarkData.push({ timestamp: currentTime, landmarks: results.landmarks }); // Store data

                // Draw landmarks and connectors (check context and drawingUtils again)
                if (canvasCtx && drawingUtils) { // Check drawingUtils exists here
                    const utils = drawingUtils; // Assign to local const for TS narrowing
                    results.landmarks.forEach(landmark => {
                         // Define drawing options based on toggles
                        const landmarkOptions = {
                            color: mpShowCertainty ? (data: any) => `rgba(0, 255, 0, ${data.from!.visibility ?? 1})` : '#00FF00', // Green, alpha based on visibility if toggled
                            radius: mpShowDepth ? (data: any) => DrawingUtils.lerp(data.from!.z, -0.5, 0.5, 20, 0.1) : 3 // New radius range: 20 to 0.1
                        };
                        const connectorOptions = {
                             color: mpShowCertainty ? (data: any) => `rgba(255, 255, 255, ${Math.min(data.from!.visibility ?? 1, data.to!.visibility ?? 1)})` : '#FFFFFF', // White, alpha based on connected points' visibility
                             lineWidth: mpShowDepth ? (data: any) => DrawingUtils.lerp((data.from!.z + data.to!.z) / 2, -0.5, 0.5, 20, 6) : 2 // Line width based on average depth, range 20 to 6
                        };

                        // No need to check drawingUtils again inside loop due to narrowing above
                        utils.drawLandmarks(landmark, landmarkOptions);
                        utils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS, connectorOptions);
                    });
                }
            }
        }

        // Continue processing next frame
        animationFrameId = requestAnimationFrame(processRecordedFrame);
    };

    // Ensure the video is playing for analysis
    if (videoElement.paused) {
        await videoElement.play().catch(e => {
            console.error("Error playing recorded video for analysis:", e);
            errorMsg = "Could not play recorded video for analysis.";
            processingRecordedVideo = false;
        });
    }

    // Start the processing loop only if playback started successfully
    if (!videoElement.paused) {
        animationFrameId = requestAnimationFrame(processRecordedFrame);
    }
  }

  function stopRecordedVideoAnalysis() {
      if (processingRecordedVideo) {
          console.log("Explicitly stopping recorded video analysis.");
      }
      processingRecordedVideo = false; // Signal the loop to stop
      // The loop itself will cancel the animation frame
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
    stopRecordedVideoAnalysis(); // Stop analysis if it was running
    landmarkData = []; // Clear landmark data
    if (canvasCtx) canvasCtx.clearRect(0, 0, canvasElement?.width ?? 0, canvasElement?.height ?? 0); // Clear canvas
    await initializeCamera(); // Re-start camera and live detection
  }

  async function discardAll() {
    console.log('Discarding all and navigating away...');
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    videoPreviewUrl = null;
    uploadedVideoUrl = null;
    recording = false;
    stopRecordedVideoAnalysis(); // Stop analysis if it was running
    landmarkData = []; // Clear landmark data
    stopCamera(); // Ensure camera is off and live detection stopped before navigating
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

      // Add landmark data if available
      if (landmarkData.length > 0) {
          metadataFormData.set('landmark_data', JSON.stringify(landmarkData));
      } else {
          metadataFormData.set('landmark_data', '[]'); // Send empty array if no data
      }

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

  <!-- Video Element for Live Feed & Preview + Canvas Overlay -->
  <div class="relative border rounded-lg mb-4 aspect-video bg-black flex items-center justify-center overflow-hidden">
     <video bind:this={videoElement} muted playsinline class="absolute top-0 left-0 w-full h-full object-cover z-0">
       Your browser does not support the video tag.
     </video>
     <!-- Canvas for drawing landmarks -->
     <canvas bind:this={canvasElement} class="absolute top-0 left-0 w-full h-full z-10 pointer-events-none"></canvas>
     {#if !mediaStream && !videoPreviewUrl && !recording && !processingRecordedVideo && !isShowingLiveLandmarks}
       <p class="text-gray-400 absolute z-20">Initializing Camera...</p>
     {:else if isShowingLiveLandmarks && !recording}
       <p class="text-green-400 bg-black bg-opacity-50 p-2 rounded absolute z-20 bottom-2 left-2">Live Landmarks ON</p>
     {:else if processingRecordedVideo}
       <p class="text-yellow-400 bg-black bg-opacity-50 p-2 rounded absolute z-20 bottom-2 left-2">Processing Recorded Video...</p>
     {/if}
  </div>


  {#if !recording && !videoPreviewUrl}
    <!-- Player View - Ready to Record -->

    <!-- MediaPipe Config Box -->
    <div class="border rounded-lg p-4 mb-4 bg-gray-50 space-y-3">
        <h3 class="text-lg font-semibold text-center text-gray-700">MediaPipe Settings</h3>
        <div class="flex items-center justify-between">
            <label for="mp-num-poses" class="block text-sm font-medium text-gray-700">Max Poses:</label>
            <input
                type="number"
                id="mp-num-poses"
                min="1"
                max="5"
                step="1"
                bind:value={mpNumPoses}
                on:change={handleConfigChange}
                disabled={!poseLandmarker || isReinitializing || !!modelError}
                class="w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:opacity-50 disabled:bg-gray-200"
            />
        </div>
        <div class="space-y-1">
            <label for="mp-min-confidence" class="block text-sm font-medium text-gray-700">Min Detection Confidence: {mpMinPoseDetectionConfidence.toFixed(1)}</label>
            <input
                type="range"
                id="mp-min-confidence"
                min="0.1"
                max="1.0"
                step="0.1"
                bind:value={mpMinPoseDetectionConfidence}
                on:change={handleConfigChange}
                disabled={!poseLandmarker || isReinitializing || !!modelError}
                class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            />
        </div>
        <div class="flex items-center justify-between">
            <label for="mp-delegate" class="block text-sm font-medium text-gray-700">Processing Unit:</label>
            <select
                id="mp-delegate"
                bind:value={mpDelegate}
                on:change={handleConfigChange}
                disabled={!poseLandmarker || isReinitializing || !!modelError}
                class="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:opacity-50 disabled:bg-gray-200"
            >
                <option value="GPU">GPU</option>
                <option value="CPU">CPU</option>
            </select>
        </div>
        <div class="flex items-center justify-between">
            <label for="mp-model-type" class="block text-sm font-medium text-gray-700">Model Type:</label>
            <select
                id="mp-model-type"
                bind:value={mpModelType}
                on:change={handleConfigChange}
                disabled={!poseLandmarker || isReinitializing || !!modelError}
                class="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:opacity-50 disabled:bg-gray-200"
            >
                <option value="lite">Lite (Fast)</option>
                <option value="full">Full (Balanced)</option>
                <option value="heavy">Heavy (Accurate)</option>
            </select>
        </div>
         {#if isReinitializing}
            <p class="text-sm text-center text-blue-600">Applying settings...</p>
         {/if}
        <!-- Visualization Toggles -->
        <div class="pt-2 border-t border-gray-200 space-y-2">
             <div class="flex items-center justify-between">
                <label for="mp-show-depth" class="block text-sm font-medium text-gray-700">Visualize Depth (Size):</label>
                <input
                    type="checkbox"
                    id="mp-show-depth"
                    bind:checked={mpShowDepth}
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
             </div>
             <div class="flex items-center justify-between">
                 <label for="mp-show-certainty" class="block text-sm font-medium text-gray-700">Visualize Certainty (Color):</label>
                 <input
                    type="checkbox"
                    id="mp-show-certainty"
                    bind:checked={mpShowCertainty}
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                 />
             </div>
        </div>
    </div>

    <div class="mb-4 flex items-center justify-center">
        <input
            type="checkbox"
            id="live-landmarks-toggle"
            bind:checked={showLiveLandmarks}
            disabled={!poseLandmarker || !!modelError}
            class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50"
        />
        <label for="live-landmarks-toggle" class="ml-2 block text-sm text-gray-900 {(!poseLandmarker || !!modelError) ? 'text-gray-400' : ''}">
            Show Live Landmarks
        </label>
    </div>
     <button
      on:click={startRecording}
      disabled={!mediaStream || !poseLandmarker || !!modelError}
      class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {#if !poseLandmarker && !modelError}Loading Model...{:else if modelError}Model Error{:else}REC{/if}
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
    <!-- Preview & Metadata View (Show recorded landmarks) -->
    <div class="border rounded-lg p-4 mb-4">
       <h2 class="text-xl font-semibold mb-2">Preview {processingRecordedVideo ? '(Analyzing...)' : ''}</h2>
       <!-- Preview is now shown in the main video element above with canvas overlay -->
       <button
        on:click={discardPreview}
        disabled={processingRecordedVideo || submitting}
        class="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded mb-4 disabled:opacity-50"
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
            disabled={submitting || processingRecordedVideo}
            class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {#if submitting}Saving...{:else if processingRecordedVideo}Analyzing...{:else}Salvar{/if}
          </button>
        </div>
      </form>
    </div>
  {/if}

</div>
