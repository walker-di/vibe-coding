<script lang="ts">
  import StoryboardFrameComponent from '$lib/components/StoryboardFrame.svelte';
  import CreationModal from '$lib/components/CreationModal.svelte';
  // Import the specific frame type if needed, or rely on PageData inference
  // import type { StoryboardFrameDb } from '$lib/types/storyboard';
  import type { PageData } from './$types'; // Import PageData type for this route
  import { invalidate } from '$app/navigation'; // For refreshing data for this specific page
  import { selectedVoice, ptBRVoices } from '$lib/stores/voiceStore'; // Import voice store and list
  import JSZip from 'jszip'; // Re-add JSZip for ZIP export
  // file-saver removed
  import { onMount } from 'svelte';
  import { tick } from 'svelte'; // Import tick for waiting for DOM updates
  import { FFmpeg } from '@ffmpeg/ffmpeg'; // Use static import
  import { fetchFile } from '@ffmpeg/util'; // Use static import


  export let data: PageData; // Receive data from load function

  // data.storyboard should contain { id: string, name: string, createdAt: Date | null }
  // data.frames should be StoryboardFrameDb[] for this storyboard
  $: storyboard = data.storyboard;
  $: frames = data.frames || [];
  $: loadError = data.error; // Get potential error message from load

  let showModal = false;
  let isLoading = false; // State for API call loading (adding frames)
  let isExportingVideo = false; // Renamed state for video export loading
  let isExportingZip = false; // Added state for ZIP export loading
  let apiError: string | null = null; // State for API call errors
  let exportError: string | null = null; // State for export errors (can be shared or separated)

  // FFmpeg state
  let ffmpeg: any | null = null; // Use 'any' since type is loaded dynamically
  let isFFmpegLoading = false;
  let ffmpegLoadError: string | null = null;
  let ffmpegProgress = 0; // 0 to 1
  let ffmpegLogMessages: string[] = []; // To store FFmpeg logs

  // Store individual frame durations
  let frameDurations: { [key: string]: number } = {};

  // Calculate total duration reactively
  $: totalDuration = Object.values(frameDurations).reduce((sum, duration) => sum + (duration || 0), 0);

  // Removed top-level const storyboardId

  onMount(async () => {
    // Check directly from data prop inside onMount
    if (!data.storyboard?.id) {
      console.error("Storyboard ID not found in page data onMount!");
      // Handle error, maybe redirect or show message
    }
    // Load FFmpeg when component mounts
    await loadFFmpeg();
  });

  // Function to load FFmpeg instance
  async function loadFFmpeg() {
    if (ffmpeg || isFFmpegLoading) return; // Already loaded or loading

    isFFmpegLoading = true;
    ffmpegLoadError = null;
    ffmpegProgress = 0;
    ffmpegLogMessages = ['Attempting to load FFmpeg...'];
    console.log('Attempting to load FFmpeg...');
    // Removed timeout logic

    try {
      console.log('Creating FFmpeg instance...');
      ffmpegLogMessages = [...ffmpegLogMessages, 'Creating FFmpeg instance...'];
      // Use static imports now
      const ffmpegInstance = new FFmpeg(); // Use new FFmpeg()
      console.log('FFmpeg instance created.');
      ffmpegLogMessages = [...ffmpegLogMessages, 'FFmpeg instance created. Setting up listeners...'];

      ffmpegInstance.on('log', ({ message }: { message: string }) => { // Add type for message
        // Append new log messages, potentially limit array size later
        const logLine = `[FFmpeg Kit Log] ${message}`;
        ffmpegLogMessages = [...ffmpegLogMessages, logLine];
        // console.log('FFmpeg Log:', message); // Keep original console log if desired, or remove
      });

      ffmpegInstance.on('progress', ({ progress }: { progress: number }) => { // Add type for progress
        ffmpegProgress = progress;
        // console.log(`FFmpeg Progress: ${(progress * 100).toFixed(1)}%`); // Keep original console log if desired, or remove
      });

      console.log('FFmpeg listeners attached.');
      ffmpegLogMessages = [...ffmpegLogMessages, 'FFmpeg listeners attached. Calling default ffmpeg.load()...'];

      // Load using default mechanism (usually CDN)
      await ffmpegInstance.load();

      console.log('ffmpegInstance.load() completed.');
      ffmpegLogMessages = [...ffmpegLogMessages, 'ffmpegInstance.load() completed (default method). Assigning instance...'];

      ffmpeg = ffmpegInstance; // Assign the loaded instance
      ffmpegLogMessages = [...ffmpegLogMessages, 'FFmpeg loaded successfully.'];
      console.log('FFmpeg loaded successfully');

    } catch (err: any) {
      // Removed timeout clearing
      console.error('--- FFmpeg Load Error ---');
      console.error('Error Message:', err?.message);
      console.error('Error Stack:', err?.stack);
      console.error('Full Error Object:', err);
      console.error('--- End FFmpeg Load Error ---');
      ffmpegLoadError = `Failed to load FFmpeg: ${err?.message || 'Unknown error'}`;
      ffmpegLogMessages = [...ffmpegLogMessages, `Error during FFmpeg load: ${ffmpegLoadError}`];
      // Optionally add more details from err if available
      if (err?.stack) {
          ffmpegLogMessages = [...ffmpegLogMessages, `Stack: ${err.stack.substring(0, 100)}...`]; // Log part of the stack
      }
    } finally {
      console.log('loadFFmpeg finally block reached.');
      ffmpegLogMessages = [...ffmpegLogMessages, 'loadFFmpeg finally block reached.'];
      // Ensure loading state is always reset
      isFFmpegLoading = false;
    }
  }

  function openModal() {
    apiError = null; // Clear previous errors when opening modal
    showModal = true;
  }

  function closeModal() {
    showModal = false;
  }

  // Function to handle duration change event from child components
  function handleDurationChange(event: CustomEvent<{ id: string, duration: number }>) {
    const { id, duration } = event.detail;
    if (id && typeof duration === 'number' && isFinite(duration)) {
      frameDurations = { ...frameDurations, [id]: duration };
    }
  }

  // Function to format seconds into MM:SS (copied from child component for now)
  function formatDuration(seconds: number | null | undefined): string {
    if (seconds === null || seconds === undefined || !isFinite(seconds)) {
      return '--:--';
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Handles adding new frames to THIS storyboard
  async function handleAddFrames(event: CustomEvent) {
    // Get storyboardId directly from data when function is called
    const currentStoryboardId = data.storyboard?.id;
    if (!currentStoryboardId) {
      apiError = "Cannot add frames: Storyboard ID is missing.";
      return;
    }
    console.log('Add frames event received:', event.detail);
    isLoading = true;
    apiError = null;
    closeModal(); // Close modal immediately

    try {
      // Use the new endpoint, passing currentStoryboardId in the URL
      const response = await fetch(`/api/storyboard/${currentStoryboardId}/add-frame`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send prompts from modal (e.g., { storyPrompt: '...', title: '...' })
        body: JSON.stringify(event.detail),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API Error: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('API Response (Add Frames):', result);

      // Invalidate data for THIS page to trigger a refresh
      // Use the specific route ID for more targeted invalidation
      await invalidate((url) => url.pathname === `/storyboard/${currentStoryboardId}`);
      // The 'frames' variable will automatically update reactively

    } catch (err: any) {
      console.error('Failed to add frames to storyboard:', err);
      apiError = err.message || 'An unknown error occurred while adding frames.';
    } finally {
      isLoading = false;
    }
  }

  // Helper function to fetch asset and return as Blob (same as before)
  async function fetchAssetAsBlob(url: string): Promise<Blob | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch asset: ${url}, Status: ${response.status}`);
        return null;
      }
      return await response.blob();
    } catch (error) {
      console.error(`Error fetching asset ${url}:`, error);
      return null;
    }
  }

  // Helper function to get extension (same as before)
  function getExtension(url: string | null, blob: Blob | null): string {
      if (blob?.type) {
          const parts = blob.type.split('/');
          if (parts.length === 2) {
              if (parts[1] === 'mpeg') return '.mp3';
              if (parts[1] === 'jpeg') return '.jpg';
              return `.${parts[1]}`;
          }
      }
      if (url) {
          const match = url.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
          if (match) return `.${match[1]}`;
      }
      return '.bin';
  }

  // Re-add the original ZIP export function
  async function exportStoryboardFrames() {
    if (isExportingZip || !frames || frames.length === 0 || !storyboard) return;

    isExportingZip = true;
    exportError = null; // Clear previous errors
    const zip = new JSZip();
    const safeStoryboardName = storyboard.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'storyboard';

    try {
      await Promise.all(frames.map(async (frame, index) => {
        // Use frameOrder if available and reliable, otherwise index
        const frameNumber = frame.frameOrder !== undefined ? frame.frameOrder + 1 : index + 1;
        const framePrefix = `Frame_${frameNumber.toString().padStart(3, '0')}`; // Pad for sorting

        if (frame.backgroundImageUrl) {
          const blob = await fetchAssetAsBlob(frame.backgroundImageUrl);
          if (blob) zip.file(`${framePrefix}_bg${getExtension(frame.backgroundImageUrl, blob)}`, blob);
        }
        if (frame.mainImageUrl) {
          const blob = await fetchAssetAsBlob(frame.mainImageUrl);
          if (blob) zip.file(`${framePrefix}_main${getExtension(frame.mainImageUrl, blob)}`, blob);
        }
        if (frame.narrationAudioUrl) {
          const blob = await fetchAssetAsBlob(frame.narrationAudioUrl);
          if (blob) zip.file(`${framePrefix}_narration${getExtension(frame.narrationAudioUrl, blob)}`, blob);
        }
        if (frame.bgmUrl) {
          const blob = await fetchAssetAsBlob(frame.bgmUrl);
          if (blob) zip.file(`${framePrefix}_bgm${getExtension(frame.bgmUrl, blob)}`, blob);
        }
        // Add metadata JSON file creation and addition if desired (currently removed)
        // const metadata = { ...frame }; // Copy frame data
        // delete metadata.backgroundImageUrl; // Optionally remove URLs if blobs are included
        // delete metadata.mainImageUrl;
        // delete metadata.narrationAudioUrl;
        // delete metadata.bgmUrl;
        // zip.file(`${framePrefix}_metadata.json`, JSON.stringify(metadata, null, 2));

      }));

      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Use native download for ZIP as well
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${safeStoryboardName}_export.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err: any) {
      console.error('Failed to export storyboard ZIP:', err);
      exportError = `ZIP Export failed: ${err.message || 'Unknown error'}`;
    } finally {
      isExportingZip = false;
    }
  }


  // New function to export as video using FFmpeg
  async function exportVideo() {
    // Use isExportingVideo state
    if (isExportingVideo || !frames || frames.length === 0 || !storyboard || !ffmpeg || isFFmpegLoading) {
        if (!ffmpeg && !isFFmpegLoading) {
            exportError = "FFmpeg is not loaded. Please wait or try reloading the page.";
        } else if (isFFmpegLoading) {
            exportError = "FFmpeg is still loading. Please wait.";
        } else if (!frames || frames.length === 0) {
            exportError = "No frames to export.";
        } else if (!frames || frames.length === 0) {
            exportError = "No frames to export.";
        }
        return;
    }

    isExportingVideo = true; // Use correct state variable
    exportError = null;
    ffmpegProgress = 0;
    ffmpegLogMessages = ['Starting video export...'];
    const safeStoryboardName = storyboard.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'storyboard';
    const outputFilename = `${safeStoryboardName}_video.mp4`;
    const tempFiles: string[] = []; // Keep track of files created in FFmpeg FS

    try {
      // 1. Filter and sort frames
      const validFrames = frames
        .filter(f => f.narrationAudioUrl && frameDurations[f.id] && frameDurations[f.id] > 0)
        .sort((a, b) => (a.frameOrder ?? Infinity) - (b.frameOrder ?? Infinity)); // Sort by frameOrder, put undefined last

      if (validFrames.length === 0) {
        throw new Error("No frames with narration and duration found to export.");
      }

      ffmpegLogMessages = [...ffmpegLogMessages, `Found ${validFrames.length} valid frames to process.`];

      const segmentFiles: string[] = []; // Store names of final segment files (e.g., frame_audio_0.mp4)

      // 2. Process each frame
      for (let i = 0; i < validFrames.length; i++) {
        const frame = validFrames[i];
        const duration = frameDurations[frame.id];
        const frameIndex = i; // Use 0-based index for filenames
        const frameLogPrefix = `Frame ${frameIndex + 1}/${validFrames.length} (ID: ${frame.id.substring(0, 6)}):`;
        ffmpegLogMessages = [...ffmpegLogMessages, `${frameLogPrefix} Processing...`];
        ffmpegProgress = (i / validFrames.length) * 0.8; // Allocate 80% progress to frame processing

        let bgInputFile = `bg_${frameIndex}.png`; // Default to image if URL exists
        let mainImageFile = `main_${frameIndex}.png`;
        const narrationFile = `narration_${frameIndex}.mp3`; // Assume mp3, adjust if needed
        const videoSegmentFile = `frame_${frameIndex}.mp4`;
        const finalSegmentFile = `frame_audio_${frameIndex}.mp4`;

        // Add files to cleanup list early
        tempFiles.push(bgInputFile, mainImageFile, narrationFile, videoSegmentFile, finalSegmentFile);

        // Fetch and write assets
        ffmpegLogMessages = [...ffmpegLogMessages, `${frameLogPrefix} Fetching assets...`];
        const [bgBlob, mainBlob, narrationBlob] = await Promise.all([
          frame.backgroundImageUrl ? fetchAssetAsBlob(frame.backgroundImageUrl) : Promise.resolve(null),
          frame.mainImageUrl ? fetchAssetAsBlob(frame.mainImageUrl) : Promise.resolve(null),
          fetchAssetAsBlob(frame.narrationAudioUrl!) // Narration URL is guaranteed by filter
        ]);

        if (!narrationBlob) {
          ffmpegLogMessages = [...ffmpegLogMessages, `${frameLogPrefix} Skipping - Failed to fetch narration audio.`];
          continue; // Skip frame if narration fails
        }
        // Revert back to using fetchFile
        try {
          console.log(`${frameLogPrefix} Writing narration file: ${narrationFile}`);
          ffmpegLogMessages = [...ffmpegLogMessages, `${frameLogPrefix} Writing narration file: ${narrationFile}`];
          await ffmpeg.writeFile(narrationFile, await fetchFile(narrationBlob));
          console.log(`${frameLogPrefix} Narration written successfully.`);
          ffmpegLogMessages = [...ffmpegLogMessages, `${frameLogPrefix} Narration written.`];
        } catch (writeErr: any) {
          console.error(`${frameLogPrefix} Error writing narration file ${narrationFile}:`, writeErr);
          ffmpegLogMessages = [...ffmpegLogMessages, `${frameLogPrefix} Error writing narration file: ${writeErr.message}`];
          throw writeErr; // Re-throw to stop the process for this frame
        }

        // Handle Background
        let bgCommand = '';
        if (bgBlob) {
          // Revert back to using fetchFile
          try {
            console.log(`${frameLogPrefix} Writing background image file: ${bgInputFile}`);
            ffmpegLogMessages = [...ffmpegLogMessages, `${frameLogPrefix} Writing background image file: ${bgInputFile}`];
            await ffmpeg.writeFile(bgInputFile, await fetchFile(bgBlob));
            console.log(`${frameLogPrefix} Background image written successfully.`);
            ffmpegLogMessages = [...ffmpegLogMessages, `${frameLogPrefix} Background image written.`];
            bgCommand = `-i ${bgInputFile}`;
          } catch (writeErr: any) {
            console.error(`${frameLogPrefix} Error writing background image file ${bgInputFile}:`, writeErr);
            ffmpegLogMessages = [...ffmpegLogMessages, `${frameLogPrefix} Error writing background image file: ${writeErr.message}`];
            throw writeErr;
          }
        } else {
          ffmpegLogMessages = [...ffmpegLogMessages, `${frameLogPrefix} No background image, generating black canvas...`];
          // Generate black video segment directly
          bgInputFile = `black_bg_${frameIndex}.mp4`; // Change input name
          tempFiles.push(bgInputFile); // Add to cleanup
          const blackBgCmd = [
            '-f', 'lavfi', '-i', 'color=c=black:s=1280x720:r=25', // Create black color source
            '-t', duration.toString(), // Set duration
            '-c:v', 'libx264', '-pix_fmt', 'yuv420p', // Encode
            '-tune', 'stillimage', // Optimize for static background
            '-movflags', '+faststart',
            bgInputFile
          ];
          console.log(`${frameLogPrefix} Executing black background generation:`, blackBgCmd);
          ffmpegLogMessages = [...ffmpegLogMessages, `${frameLogPrefix} Executing black background generation...`];
          await ffmpeg.exec(blackBgCmd);
          console.log(`${frameLogPrefix} Black background segment generated successfully.`);
          ffmpegLogMessages = [...ffmpegLogMessages, `${frameLogPrefix} Black background segment generated.`];
          bgCommand = `-i ${bgInputFile}`; // Use the generated video as input
        }

        // Handle Main Image Overlay
        let overlayFilter = '';
        let mainInputCommand = '';
        if (mainBlob) {
           // Revert back to using fetchFile
           try {
             console.log(`${frameLogPrefix} Writing main image file: ${mainImageFile}`);
             ffmpegLogMessages = [...ffmpegLogMessages, `${frameLogPrefix} Writing main image file: ${mainImageFile}`];
             await ffmpeg.writeFile(mainImageFile, await fetchFile(mainBlob));
             console.log(`${frameLogPrefix} Main image written successfully.`);
             ffmpegLogMessages = [...ffmpegLogMessages, `${frameLogPrefix} Main image written.`];
             mainInputCommand = `-i ${mainImageFile}`;
           } catch (writeErr: any) {
             console.error(`${frameLogPrefix} Error writing main image file ${mainImageFile}:`, writeErr);
             ffmpegLogMessages = [...ffmpegLogMessages, `${frameLogPrefix} Error writing main image file: ${writeErr.message}`];
             throw writeErr;
           }
          // Calculate overlay position (center 80% height square in 1280x720)
          // 720 * 0.8 = 576. (1280 - 576) / 2 = 352. (720 - 576) / 2 = 72
          overlayFilter = `[1:v]scale=576:576[ovrl];[0:v][ovrl]overlay=x=352:y=72`;
        } else {
          ffmpegLogMessages = [...ffmpegLogMessages, `${frameLogPrefix} No main image, generating white square...`];
          const whiteSquareFile = `white_square_${frameIndex}.png`;
          tempFiles.push(whiteSquareFile);
          const whiteSquareCmd = [
            '-f', 'lavfi', '-i', 'color=c=white:s=576x576', // Create white square
            '-frames:v', '1', // Single frame
            whiteSquareFile
          ];
          console.log(`${frameLogPrefix} Executing white square generation:`, whiteSquareCmd);
          ffmpegLogMessages = [...ffmpegLogMessages, `${frameLogPrefix} Executing white square generation...`];
          await ffmpeg.exec(whiteSquareCmd);
          console.log(`${frameLogPrefix} White square generated successfully.`);
          mainInputCommand = `-i ${whiteSquareFile}`;
          overlayFilter = `[1:v]scale=576:576[ovrl];[0:v][ovrl]overlay=x=352:y=72`;
          ffmpegLogMessages = [...ffmpegLogMessages, `${frameLogPrefix} White square generated.`];
        }

        // Create video segment (with or without overlay)
        console.log(`${frameLogPrefix} Preparing video segment command...`);
        ffmpegLogMessages = [...ffmpegLogMessages, `${frameLogPrefix} Creating video segment...`];
        const videoSegmentCommand = [
          bgCommand.split(' '), // Background input (-i bg_file or -i black_bg_file.mp4)
          mainInputCommand.split(' '), // Main image input (-i main_file or -i white_square) - might be empty if no overlay needed
          overlayFilter ? ['-filter_complex', overlayFilter] : [], // Overlay filter if main image exists
          ['-map', overlayFilter ? '[out]' : '0:v'], // Map output from filter or directly from bg
          ['-t', duration.toString()],
          ['-c:v', 'libx264'],
          ['-pix_fmt', 'yuv420p'],
          ['-movflags', '+faststart'],
          videoSegmentFile
        ].flat().filter(Boolean); // Flatten array and remove empty strings/arrays

        console.log(`${frameLogPrefix} Executing video segment creation:`, videoSegmentCommand);
        ffmpegLogMessages = [...ffmpegLogMessages, `${frameLogPrefix} Executing video segment creation...`];
        await ffmpeg.exec(videoSegmentCommand);
        console.log(`${frameLogPrefix} Video segment created successfully.`);
        ffmpegLogMessages = [...ffmpegLogMessages, `${frameLogPrefix} Video segment created.`];

        // Add narration audio
        console.log(`${frameLogPrefix} Preparing narration adding command...`);
        ffmpegLogMessages = [...ffmpegLogMessages, `${frameLogPrefix} Adding narration...`];
        const addNarrationCmd = [
          '-i', videoSegmentFile,
          '-i', narrationFile,
          '-c:v', 'copy', // Copy video stream
          '-c:a', 'aac', // Encode audio to AAC
          '-map', '0:v:0',
          '-map', '1:a:0',
          '-shortest', // Finish when the shortest input ends (should be video)
          finalSegmentFile
        ];
        console.log(`${frameLogPrefix} Executing narration adding:`, addNarrationCmd);
        ffmpegLogMessages = [...ffmpegLogMessages, `${frameLogPrefix} Executing narration adding...`];
        await ffmpeg.exec(addNarrationCmd);
        console.log(`${frameLogPrefix} Narration added successfully.`);
        ffmpegLogMessages = [...ffmpegLogMessages, `${frameLogPrefix} Narration added.`];
        segmentFiles.push(finalSegmentFile); // Add to list for concatenation

        // Optional: Clean up intermediate files for this frame now to save memory
        // await ffmpeg.deleteFile(bgInputFile);
        // await ffmpeg.deleteFile(mainImageFile); // or white_square...
        // await ffmpeg.deleteFile(narrationFile);
        // await ffmpeg.deleteFile(videoSegmentFile);
      }

      // 3. Concatenate segments
      ffmpegLogMessages = [...ffmpegLogMessages, 'Concatenating video segments...'];
      ffmpegProgress = 0.8; // Move progress bar

      const concatInputFile = 'mylist.txt';
      tempFiles.push(concatInputFile);
      const concatInputContent = segmentFiles.map(f => `file '${f}'`).join('\n');
      try {
        console.log(`Writing concat file: ${concatInputFile}`);
        ffmpegLogMessages = [...ffmpegLogMessages, `Writing concat file: ${concatInputFile}`];
        await ffmpeg.writeFile(concatInputFile, concatInputContent);
        console.log(`Concat file written successfully.`);
      } catch (writeErr: any) {
        console.error(`Error writing concat file ${concatInputFile}:`, writeErr);
        ffmpegLogMessages = [...ffmpegLogMessages, `Error writing concat file: ${writeErr.message}`];
        throw writeErr;
      }

      const concatCmd = [
        '-f', 'concat',
        '-safe', '0', // Allow relative paths in list
        '-i', concatInputFile,
        '-c', 'copy', // Copy streams without re-encoding
        outputFilename
      ];
      console.log('Executing concatenation:', concatCmd);
      ffmpegLogMessages = [...ffmpegLogMessages, 'Executing concatenation...'];
      await ffmpeg.exec(concatCmd);
      console.log('Concatenation complete.');
      // --- Inspect ffmpeg object before FS operations ---
      console.log('Inspecting ffmpeg object before FS operations:', ffmpeg);
      // --- Add FS listing here ---
      try {
        const filesInRoot = ffmpeg.FS('readdir', '/');
        console.log('Files in virtual FS root after concat:', filesInRoot);
        ffmpegLogMessages = [...ffmpegLogMessages, `Files in FS: ${filesInRoot.join(', ')}`];
      } catch (fsError: any) {
        console.error('Error listing files in virtual FS after concat:', fsError);
        ffmpegLogMessages = [...ffmpegLogMessages, `Error listing FS: ${fsError.message}`];
      }
      // --- End FS listing ---
      ffmpegLogMessages = [...ffmpegLogMessages, 'Concatenation complete. Reading final video file...'];
      ffmpegProgress = 0.95;

      // 4. Read and Download (using native browser download)
      console.log(`Attempting to read final output file: ${outputFilename}`);
      ffmpegLogMessages = [...ffmpegLogMessages, `Reading final output file: ${outputFilename}`];
      const outputData = await ffmpeg.readFile(outputFilename);
      console.log(`Successfully read output file (length: ${outputData.byteLength}). Creating blob...`);
      const videoBlob = new Blob([outputData], { type: 'video/mp4' });
      console.log('Blob created. Creating object URL...');
      // Create a URL for the blob
      const url = URL.createObjectURL(videoBlob);

      // Create a temporary anchor element
      const a = document.createElement('a');
      a.style.display = 'none'; // Hide the element
      a.href = url;
      a.download = outputFilename; // Set the desired filename

      // Append the anchor to the body, click it, and remove it
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Revoke the object URL to free up memory
      URL.revokeObjectURL(url);

      ffmpegLogMessages = [...ffmpegLogMessages, `Video download initiated as ${outputFilename}!`];
      ffmpegProgress = 1;

    } catch (err: any) {
      console.error('Failed to export video:', err);
      exportError = `Video export failed: ${err.message || 'Unknown error'}`;
      ffmpegLogMessages = [...ffmpegLogMessages, `Error: ${exportError}`];
    } finally {
      isExportingVideo = false; // Use correct state variable
      // 5. Cleanup FFmpeg FS
      ffmpegLogMessages = [...ffmpegLogMessages, 'Cleaning up temporary files...'];
      if (ffmpeg) {
        for (const file of tempFiles) {
          try {
            // Optional: Check if file exists before deleting? Might be overkill.
            console.log(`Attempting to delete temp file: ${file}`);
            await ffmpeg.deleteFile(file);
            console.log(`Deleted temp file: ${file}`);
          } catch (e: any) {
            // Log FS errors specifically during cleanup
            console.warn(`Could not delete temp file ${file}: ${e.message}`, e);
            ffmpegLogMessages = [...ffmpegLogMessages, `Warn: Could not delete temp file ${file}: ${e.message}`];
          }
        }
        try {
            console.log(`Attempting to delete output file: ${outputFilename}`);
            await ffmpeg.deleteFile(outputFilename); // Also delete final output from FS
            console.log(`Deleted output file: ${outputFilename}`);
        } catch (e: any) {
             console.warn(`Could not delete output file ${outputFilename}: ${e.message}`, e);
             ffmpegLogMessages = [...ffmpegLogMessages, `Warn: Could not delete output file ${outputFilename}: ${e.message}`];
        }
      }
      ffmpegLogMessages = [...ffmpegLogMessages, 'Cleanup complete.'];
      console.log("Export process finished.");
    }
  }

</script>

<svelte:head>
  <title>Storyboard: {storyboard?.name || 'Loading...'}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
</svelte:head>

<div class="container mt-4">
  <!-- Header Row -->
  <div class="d-flex justify-content-between align-items-center mb-2"> <!-- Reduced bottom margin -->
    <h1 class="mb-0">
      <a href="/" class="text-decoration-none me-2" title="Back to Storyboards List" aria-label="Back to Storyboards List"><i class="bi bi-arrow-left-circle"></i></a>
      Storyboard: {storyboard?.name || 'Loading...'}
      <!-- Add edit name button here later -->
    </h1>
    <div class="d-flex align-items-center">
      <!-- Voice Selection Dropdown -->
      <div class="me-3">
        <label for="voiceSelect" class="form-label visually-hidden">Voz da Narração</label>
        <select id="voiceSelect" class="form-select form-select-sm" bind:value={$selectedVoice}>
          {#each ptBRVoices as voice}
            <option value={voice.value}>{voice.name}</option>
          {/each}
        </select>
      </div>

      <button class="btn btn-success me-2" on:click={openModal} disabled={isLoading || isExportingVideo || isExportingZip}>
        <i class="bi bi-film me-1"></i> Adicionar Quadros
      </button>
      <!-- Add ZIP Export Button Back -->
      <button class="btn btn-outline-secondary me-2" on:click={exportStoryboardFrames} disabled={isExportingZip || isLoading || frames.length === 0 || isExportingVideo}>
        {#if isExportingZip}
          <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          Exportando ZIP...
        {:else}
          <i class="bi bi-box-arrow-up me-1"></i> Exportar Arquivos
        {/if}
      </button>
      <!-- Video Export Button -->
      <button class="btn btn-primary" on:click={exportVideo} disabled={isExportingVideo || isLoading || frames.length === 0 || isFFmpegLoading || !ffmpeg || isExportingZip}>
        {#if isExportingVideo}
          <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          Exportando Vídeo ({ (ffmpegProgress * 100).toFixed(0) }%)
        {:else if isFFmpegLoading}
           <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
           Carregando FFmpeg...
        {:else}
          <i class="bi bi-film me-1"></i> Exportar Vídeo
        {/if}
      </button>
    </div>
  </div>

  <!-- FFmpeg Load Error Display (Ensure it shows even if not exporting) -->
   {#if ffmpegLoadError && !isExportingVideo}
       <div class="alert alert-danger alert-dismissible fade show mt-3" role="alert">
         <strong>FFmpeg Load Error:</strong> {ffmpegLoadError}
         <button type="button" class="btn-close" on:click={() => { ffmpegLoadError = null; ffmpegLogMessages = []; }} aria-label="Close"></button>
       </div>
   {/if}

  <!-- Total Duration Display -->
  <div class="text-muted mb-4"> <!-- Added margin bottom -->
      Duração Total da Narração: <strong>{formatDuration(totalDuration)}</strong>
  </div>


  <!-- Loading Indicator for adding frames -->
  {#if isLoading}
    <div class="d-flex justify-content-center my-3">
      <div class="spinner-border text-success" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
       <span class="ms-2">Gerando e adicionando quadros...</span>
    </div>
  {/if}

  <!-- Export Error Display -->
   <!-- Export Status/Error Display (Combined or separate as needed) -->
   {#if isExportingVideo || isExportingZip || exportError}
       <div class="alert {exportError ? 'alert-danger' : 'alert-info'} alert-dismissible fade show mt-3" role="alert">
         {#if isExportingVideo}
            <div>
                <strong>Exportando vídeo...</strong> ({ (ffmpegProgress * 100).toFixed(0) }%)
                <div class="progress mt-2" style="height: 5px;">
                    <div class="progress-bar" role="progressbar" style="width: {ffmpegProgress * 100}%" aria-valuenow={ffmpegProgress * 100} aria-valuemin="0" aria-valuemax="100"></div>
                </div>
                {#if ffmpegLogMessages.length > 0}
                    <pre class="mt-2 small bg-light p-2 rounded" style="max-height: 100px; overflow-y: auto;"><code>{ffmpegLogMessages[ffmpegLogMessages.length - 1]}</code></pre>
                {/if}
            </div>
         {:else if isExportingZip}
             <div>
                 <strong>Exportando arquivos ZIP...</strong>
                 <div class="progress mt-2" style="height: 5px;">
                     <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 100%" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"></div>
                 </div>
             </div>
         {:else if exportError}
            {exportError}
            <button type="button" class="btn-close" on:click={() => exportError = null} aria-label="Close"></button>
         {/if}
       </div>
   {/if}

  <!-- API Error Display -->
   {#if apiError}
       <div class="alert alert-danger alert-dismissible fade show" role="alert">
         {apiError}
         <button type="button" class="btn-close" on:click={() => apiError = null} aria-label="Close"></button>
       </div>
   {/if}

  <!-- Load Error Display -->
   {#if loadError}
       <div class="alert alert-warning" role="alert">
         {loadError}
       </div>
   {/if}


  <!-- Storyboard Frames List -->
  <div class="mb-3">
    {#if frames.length > 0}
      <!-- Render frames sorted by frameOrder -->
      {#each frames.sort((a, b) => (a.frameOrder ?? 0) - (b.frameOrder ?? 0)) as frame (frame.id)}
        <StoryboardFrameComponent frame={frame} on:durationchange={handleDurationChange} />
      {/each}
    {:else if !loadError && !isLoading}
      <p class="text-center text-muted">Nenhum quadro criado ainda para este storyboard. Clique em "Adicionar Quadros" para começar.</p>
    {/if}
  </div>

  <!-- Add Button (alternative trigger) -->
   <div class="text-center mb-4">
     <button class="btn btn-outline-success" on:click={openModal} disabled={isLoading || isExportingVideo || isExportingZip}>
       + Adicionar Quadros
     </button>
   </div>

</div>

<!-- Creation Modal (used for adding frames now) -->
<!-- Pass storyboardId or other context if modal needs it -->
<CreationModal bind:show={showModal} on:close={closeModal} on:create={handleAddFrames} />
