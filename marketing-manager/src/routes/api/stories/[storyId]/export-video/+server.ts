import { error, type RequestHandler } from '@sveltejs/kit';
import { runFFmpeg, downloadFile, getAudioDuration, withTemporaryDirectory } from '$lib/server/ffmpegUtils';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { SceneTransition } from '$lib/types/story.types';

export const GET: RequestHandler = async ({ params, fetch }) => {
    const { storyId } = params;

    if (!storyId || isNaN(Number(storyId))) {
        throw error(400, 'Invalid story ID');
    }

    return withTemporaryDirectory(`story-export-${storyId}-`, async (tempDir) => {
        try {
            // 1. Fetch the story data with all scenes and clips
            const storyResponse = await fetch(`/api/stories/${storyId}?includeScenes=true&includeClips=true`);
            if (!storyResponse.ok) {
                throw error(404, `Story with ID ${storyId} not found`);
            }

            const storyData = await storyResponse.json();
            const story = storyData.data;

            if (!story || !story.scenes || story.scenes.length === 0) {
                throw error(404, `Story data not found or has no scenes for ID ${storyId}`);
            }

            // 1.1 Fetch all transitions for this story
            console.log('Fetching transitions for story...');
            const transitionsResponse = await fetch(`/api/transitions?storyId=${storyId}`);
            let transitions: SceneTransition[] = [];

            if (transitionsResponse.ok) {
                const transitionsData = await transitionsResponse.json();
                if (transitionsData.success && Array.isArray(transitionsData.data)) {
                    transitions = transitionsData.data;
                    console.log(`Found ${transitions.length} transitions for story ${storyId}`);

                    // Log all transitions for debugging
                    if (transitions.length > 0) {
                        console.log('Transitions configuration:');
                        transitions.forEach(t => {
                            console.log(`  - From scene ${t.fromSceneId} to scene ${t.toSceneId}: ${t.type}, ${t.duration}ms`);
                        });
                    }
                }
            } else {
                console.warn(`Failed to fetch transitions for story ${storyId}. Will proceed without transitions.`);
            }

            // 2. Ensure all clips have narration audio and download assets
            console.log('Processing clips and downloading assets...');

            // Collect all clips from all scenes and organize by scene
            const allClips = [];
            const clipsByScene = new Map();
            const sceneBgmPaths = new Map(); // Map to store downloaded BGM file paths

            // Sort scenes by orderIndex to ensure correct sequence
            const sortedScenes = [...story.scenes].sort((a, b) => a.orderIndex - b.orderIndex);

            for (const scene of sortedScenes) {
                if (!scene.clips || scene.clips.length === 0) continue;

                // Download BGM for this scene if available
                if (scene.bgmUrl) {
                    console.log(`Downloading BGM for scene ${scene.id}: ${scene.bgmName || 'Unnamed BGM'}`);
                    const bgmFileName = `bgm_scene_${scene.id}_${uuidv4()}.mp3`;
                    const bgmPath = path.join(tempDir, bgmFileName);

                    try {
                        await downloadFile(scene.bgmUrl, bgmPath);
                        sceneBgmPaths.set(scene.id, bgmPath);
                        console.log(`Downloaded BGM for scene ${scene.id} to ${bgmPath}`);
                    } catch (err) {
                        console.error(`Failed to download BGM for scene ${scene.id}:`, err);
                        // Continue without BGM if download fails
                    }
                }

                // Sort clips within each scene by orderIndex
                const sortedClips = [...scene.clips].sort((a, b) => a.orderIndex - b.orderIndex);
                clipsByScene.set(scene.id, sortedClips);

                for (const clip of sortedClips) {
                    // Generate narration audio if it doesn't exist
                    if (!clip.narrationAudioUrl && clip.narration) {
                        console.log(`Generating narration audio for clip ${clip.id}...`);
                        const narrationResponse = await fetch('/api/ai-storyboard/generate-narration', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                clipId: clip.id,
                                voiceName: clip.voiceName || 'pt-BR-FranciscaNeural'
                            })
                        });

                        if (narrationResponse.ok) {
                            const narrationResult = await narrationResponse.json();
                            clip.narrationAudioUrl = narrationResult.narrationAudioUrl;

                            // Update the clip with the new narration audio URL
                            await fetch(`/api/clips/${clip.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    narrationAudioUrl: clip.narrationAudioUrl
                                })
                            });

                            console.log(`Generated narration audio for clip ${clip.id}`);
                        } else {
                            console.error(`Failed to generate narration for clip ${clip.id}`);
                        }
                    }

                    allClips.push(clip);
                }
            }

            if (allClips.length === 0) {
                throw error(400, 'No clips found to export');
            }

            // 3. Generate scene-based videos and prepare for concatenation
            console.log('Generating scene-based videos...');

            // Log BGM information for debugging
            if (sceneBgmPaths.size > 0) {
                console.log(`Found BGM for ${sceneBgmPaths.size} scenes:`);
                for (const [sceneId, bgmPath] of sceneBgmPaths.entries()) {
                    console.log(`  - Scene ${sceneId}: ${bgmPath}`);
                }
            } else {
                console.log('No BGM found for any scenes.');
            }

            // Update clips by scene with more detailed filtering
            for (const scene of sortedScenes) {
                // Update the existing clipsByScene map with filtered clips
                clipsByScene.set(scene.id, allClips.filter(clip => clip.sceneId === scene.id));
            }

            // Calculate clip start times within each scene for transitions
            const clipStartTimes = new Map<number, number>(); // Map of clipId -> startTime
            const sceneDurations = new Map<number, number>(); // Track cumulative duration for each scene

            // Initialize scene durations
            for (const scene of sortedScenes) {
                sceneDurations.set(scene.id, 0);
            }

            // Calculate start time of each clip within its scene
            for (const clip of allClips) {
                const sceneId = clip.sceneId;
                const currentSceneDuration = sceneDurations.get(sceneId) || 0;

                // Set this clip's start time within the scene
                clipStartTimes.set(clip.id, currentSceneDuration);

                // Update the scene's cumulative duration
                const clipDuration = clip.duration || 3; // Default to 3 seconds
                sceneDurations.set(sceneId, currentSceneDuration + clipDuration);

                // Ensure clip duration is set
                clip.duration = clipDuration;
            }

            // Debug: Check if any clip start times are unusually large
            for (const [clipId, startTime] of clipStartTimes.entries()) {
                if (startTime > 1000) {
                    console.warn(`Unusually large start time detected for clip ${clipId}: ${startTime}s, resetting to 0`);
                    clipStartTimes.set(clipId, 0);
                }
            }

            // Log clip start times for debugging
            console.log('Clip start times within scenes:');
            for (const [clipId, startTime] of clipStartTimes.entries()) {
                const clip = allClips.find(c => c.id === clipId);
                if (clip) {
                    console.log(`  - Clip ${clipId} (Scene ${clip.sceneId}): starts at ${startTime}s`);
                }
            }

            // Create a file to list all videos for concatenation
            const concatListPath = path.join(tempDir, 'concat_list.txt');
            let concatFileContent = '';
            let totalDuration = 0;

            // Track videos for each scene to apply transitions between scenes
            const sceneVideos = new Map();
            let previousSceneId = null;

            // Process each clip
            for (let i = 0; i < allClips.length; i++) {
                const clip = allClips[i];
                console.log(`Processing clip ${i+1}/${allClips.length} (ID: ${clip.id})...`);

                // Download narration audio
                const narrationFileName = `narration_${clip.id}_${uuidv4()}.mp3`;
                const narrationPath = path.join(tempDir, narrationFileName);
                await downloadFile(clip.narrationAudioUrl, narrationPath);

                // Get narration duration
                const duration = await getAudioDuration(narrationPath);
                if (!duration || duration <= 0) {
                    console.warn(`Could not determine a valid duration for clip ${clip.id}, using default 3 seconds`);
                    clip.duration = 3;
                } else {
                    clip.duration = duration;
                }

                totalDuration += clip.duration;

                // Download image if available
                let mainImagePath = null;
                if (clip.imageUrl) {
                    const imageFileName = `image_${clip.id}_${uuidv4()}.jpg`;
                    mainImagePath = path.join(tempDir, imageFileName);
                    await downloadFile(clip.imageUrl, mainImagePath);
                } else {
                    // Create a black image if no image is available
                    mainImagePath = path.join(tempDir, `black_${clip.id}.png`);
                    await runFFmpeg([
                        '-f', 'lavfi',
                        '-i', 'color=c=black:s=1280x720',
                        '-frames:v', '1',
                        mainImagePath
                    ]);
                }

                // Generate clip video - using a simpler approach
                const clipOutputFileName = `clip_${clip.id}_${uuidv4()}.mp4`;
                const clipOutputPath = path.join(tempDir, clipOutputFileName);

                // Get the scene this clip belongs to
                const sceneId = clip.sceneId;

                // Track this clip's video for its scene
                if (!sceneVideos.has(sceneId)) {
                    sceneVideos.set(sceneId, []);
                }

                // Determine if this is the first or last clip overall
                const isFirstClip = i === 0;
                const isLastClip = i === allClips.length - 1;

                // Determine if this is the first or last clip in its scene
                const sceneClips = clipsByScene.get(sceneId) || [];
                const isFirstInScene = sceneClips.indexOf(clip) === 0;
                const isLastInScene = sceneClips.indexOf(clip) === sceneClips.length - 1;

                // Prepare video filters
                let videoFilters = [];

                // Add fade-in effect to the first clip of the story
                if (isFirstClip) {
                    videoFilters.push('fade=t=in:st=0:d=0.5');
                }

                // Add fade-out effect to the last clip of the story
                if (isLastClip) {
                    const fadeOutStart = Math.max(0, clip.duration - 0.5);
                    videoFilters.push(`fade=t=out:st=${fadeOutStart}:d=0.5`);
                }

                // Check if there's a transition from the previous scene to this scene
                if (previousSceneId !== null && isFirstInScene) {
                    const transition = transitions.find(t =>
                        t.fromSceneId === previousSceneId && t.toSceneId === sceneId);

                    if (transition) {
                        console.log(`Applying transition from scene ${previousSceneId} to scene ${sceneId}: ${transition.type} (${transition.duration}ms)`);

                        // Convert transition duration from ms to seconds and ensure it's a valid value
                        // Make sure we have a valid duration (minimum 0.1 seconds, maximum 5 seconds)
                        const rawDurationSec = transition.duration / 1000;
                        const transitionDurationSec = Math.max(0.1, Math.min(5.0, rawDurationSec));

                        console.log(`Applying transition with duration: ${transition.duration}ms (${transitionDurationSec}s)`);

                        // Apply transition based on type - using simpler effects to ensure correct speed
                        switch (transition.type) {
                            case 'Fade':
                                // Simple fade in effect with exact duration
                                videoFilters.push(`fade=t=in:st=0:d=${transitionDurationSec}`);
                                break;
                            case 'Slide':
                                // Simplified slide effect - just use fade for now to ensure correct timing
                                videoFilters.push(`fade=t=in:st=0:d=${transitionDurationSec}`);
                                break;
                            case 'Zoom':
                                // Simplified zoom effect - just use fade for now to ensure correct timing
                                videoFilters.push(`fade=t=in:st=0:d=${transitionDurationSec}`);
                                break;
                            case 'Wipe':
                                // Simplified wipe effect - just use fade for now to ensure correct timing
                                videoFilters.push(`fade=t=in:st=0:d=${transitionDurationSec}`);
                                break;
                            case 'None':
                                // No transition effect
                                break;
                            default:
                                // Default to fade if type is unknown
                                console.log(`Unknown transition type: ${transition.type}, defaulting to fade`);
                                videoFilters.push(`fade=t=in:st=0:d=${transitionDurationSec}`);
                        }
                    } else if (!isFirstClip) {
                        // If no specific transition is defined but it's not the first clip,
                        // add a default gentle fade-in
                        videoFilters.push('fade=t=in:st=0:d=0.3');
                    }
                } else if (!isFirstClip && isFirstInScene) {
                    // If it's the first clip in a scene but no transition is defined,
                    // add a default gentle fade-in
                    videoFilters.push('fade=t=in:st=0:d=0.3');
                }

                // If it's the last clip in a scene and not the last clip overall,
                // add a fade-out at the end to prepare for the next scene
                if (isLastInScene && !isLastClip) {
                    // Apply fade-out for the last clip in a scene (not the last clip overall)
                    let fadeOutDuration = 0.3; // Default duration in seconds
                    let nextSceneId = null;

                    // Try to find the current scene and the next scene
                    const currentScene = sortedScenes.find(s => s.id === sceneId);
                    if (currentScene) {
                        // Find the next scene by order index
                        const nextScene = sortedScenes.find(s => s.orderIndex > currentScene.orderIndex);
                        if (nextScene) {
                            nextSceneId = nextScene.id;

                            // Check if there's a transition defined
                            const transition = transitions.find(t =>
                                t.fromSceneId === sceneId && t.toSceneId === nextSceneId);

                            if (transition) {
                                // Convert transition duration from ms to seconds and ensure it's a valid value
                                const rawDurationSec = transition.duration / 1000;
                                fadeOutDuration = Math.max(0.1, Math.min(5.0, rawDurationSec));

                                console.log(`Applying outgoing transition from scene ${sceneId} to scene ${nextSceneId}: ${transition.type} (${transition.duration}ms, ${fadeOutDuration}s)`);
                            }
                        }
                    } else {
                        console.warn(`Could not find scene with ID ${sceneId} in sortedScenes`);
                    }

                    // Apply the fade-out effect with the determined duration
                    const fadeOutStart = Math.max(0, clip.duration - fadeOutDuration);
                    videoFilters.push(`fade=t=out:st=${fadeOutStart}:d=${fadeOutDuration}`);
                }

                // Log the video filters being applied
                if (videoFilters.length > 0) {
                    console.log(`Video filters for clip ${clip.id}: ${videoFilters.join(',')}`);
                }

                // Check if this scene has BGM
                const bgmPath = sceneBgmPaths.get(sceneId);
                const hasBgm = !!bgmPath;

                // Create FFmpeg command array with memory optimization
                const ffmpegArgs = [
                    // Set framerate before input
                    '-framerate', '25',
                    // Add memory optimization flags
                    '-threads', '2',  // Limit threads to reduce memory usage
                    // Input image with loop
                    '-loop', '1', '-i', mainImagePath,
                    // Input narration audio
                    '-i', narrationPath
                ];

                // Add BGM input if available and this is the first clip in the scene
                // For subsequent clips in the same scene, we'll use the narration only and add BGM later
                const isFirstClipInScene = clipsByScene.get(sceneId)?.indexOf(clip) === 0;

                if (hasBgm && isFirstClipInScene) {
                    ffmpegArgs.push('-i', bgmPath);
                    console.log(`Added BGM to first clip ${clip.id} in scene ${sceneId} using original BGM file: ${bgmPath}`);
                }

                // Add video filters if any
                if (videoFilters.length > 0) {
                    ffmpegArgs.push('-vf', videoFilters.join(','));
                }

                // Handle audio mapping based on whether this is the first clip in the scene
                if (hasBgm && isFirstClipInScene) {
                    // For the first clip in a scene with BGM, mix narration with BGM
                    // Volume: narration at 1.0 (100%), BGM at 0.3 (30%)
                    ffmpegArgs.push(
                        '-filter_complex',
                        `[1:a]volume=1.0[narration];[2:a]volume=0.3[bgm];[narration][bgm]amix=inputs=2:duration=shortest[aout]`,
                        '-map', '0:v',   // Map video from first input
                        '-map', '[aout]' // Map mixed audio
                    );

                    console.log(`Added BGM to first clip ${clip.id} in scene ${sceneId}`);
                } else {
                    // For subsequent clips in the scene or clips without BGM, just use narration
                    ffmpegArgs.push('-map', '0:v', '-map', '1:a');

                    if (hasBgm && !isFirstClipInScene) {
                        console.log(`Skipping BGM for non-first clip ${clip.id} in scene ${sceneId} - will be added during scene concatenation`);
                    }
                }

                // Add remaining encoding parameters with memory optimizations
                ffmpegArgs.push(
                    // Video codec settings with memory optimizations
                    '-c:v', 'libx264',
                    '-preset', 'ultrafast', // Use fastest preset to reduce memory usage
                    '-crf', '28',          // Lower quality but faster encoding
                    '-pix_fmt', 'yuv420p',
                    // Audio codec
                    '-c:a', 'aac',
                    '-b:a', '128k',        // Lower audio bitrate
                    // Set exact duration
                    '-shortest',
                    // Optimize for still images
                    '-tune', 'stillimage',
                    // Framerate
                    '-r', '25',
                    // Optimize for streaming
                    '-movflags', '+faststart',
                    // Output file
                    clipOutputPath
                );

                // Run FFmpeg with the constructed arguments
                await runFFmpeg(ffmpegArgs);

                console.log(`Generated clip video: ${clipOutputPath}`);

                // Verify the clip was created successfully
                try {
                    const clipStats = await fs.stat(clipOutputPath);
                    if (clipStats.size === 0) {
                        throw new Error(`Generated clip file is empty: ${clipOutputPath}`);
                    }
                    console.log(`Clip size: ${clipStats.size} bytes`);
                } catch (err: any) {
                    console.error(`Error verifying clip file: ${err.message || 'Unknown error'}`);
                    continue; // Skip this clip if there was an error
                }

                // Add to concat list
                concatFileContent += `file '${clipOutputPath.replace(/'/g, "'\\''")}'\n`;

                // Track this video for its scene
                sceneVideos.get(sceneId).push(clipOutputPath);

                // Update previous scene ID if this is the last clip in the scene
                if (isLastInScene) {
                    previousSceneId = sceneId;
                }
            }

            // Process each scene separately first
            console.log('Processing scenes with continuous BGM...');
            const sceneOutputPaths = [];

            // Group clips by scene
            const sceneClips = new Map();
            for (const scene of sortedScenes) {
                sceneClips.set(scene.id, allClips.filter(clip => clip.sceneId === scene.id));
            }

            // Process each scene
            for (const scene of sortedScenes) {
                const clips = sceneClips.get(scene.id) || [];
                if (clips.length === 0) {
                    console.log(`Scene ${scene.id} has no clips, skipping...`);
                    continue;
                }

                console.log(`Processing scene ${scene.id} with ${clips.length} clips...`);

                // Create a concat list for this scene's clips
                const sceneClipListPath = path.join(tempDir, `scene_${scene.id}_clips.txt`);
                let sceneClipListContent = '';

                // Add all clips in this scene to the list
                for (const clip of clips) {
                    // Get the clip file from the sceneVideos map
                    const clipFiles = sceneVideos.get(scene.id) || [];
                    if (clipFiles.length === 0) {
                        console.warn(`No clip files found for scene ${scene.id}, skipping...`);
                        continue;
                    }

                    // Find the clip file for this clip
                    const clipFile = clipFiles.find(file => file.includes(`clip_${clip.id}_`));
                    if (!clipFile) {
                        console.warn(`No clip file found for clip ${clip.id}, skipping...`);
                        continue;
                    }

                    sceneClipListContent += `file '${clipFile.replace(/'/g, "'\\''")}'
`;
                }

                // Write the scene clip list
                await fs.writeFile(sceneClipListPath, sceneClipListContent);

                // Create a scene output file
                const sceneOutputPath = path.join(tempDir, `scene_${scene.id}_${uuidv4()}.mp4`);

                // Check if this scene has BGM
                const bgmPath = sceneBgmPaths.get(scene.id);
                const hasBgm = !!bgmPath;

                if (hasBgm) {
                    // For scenes with BGM, concatenate clips first
                    const tempSceneOutputPath = path.join(tempDir, `scene_${scene.id}_temp_${uuidv4()}.mp4`);

                    // Concatenate clips without re-encoding
                    await runFFmpeg([
                        '-f', 'concat',
                        '-safe', '0',
                        '-i', sceneClipListPath,
                        '-c', 'copy',
                        tempSceneOutputPath
                    ]);

                    // Now add BGM to the entire scene
                    console.log(`Adding continuous BGM to scene ${scene.id}...`);
                    await runFFmpeg([
                        '-i', tempSceneOutputPath,
                        '-i', bgmPath,
                        '-filter_complex',
                        `[0:a]volume=1.0[narration];[1:a]volume=0.3[bgm];[narration][bgm]amix=inputs=2:duration=first[aout]`,
                        '-map', '0:v',
                        '-map', '[aout]',
                        '-c:v', 'copy',
                        '-c:a', 'aac',
                        '-b:a', '128k',
                        sceneOutputPath
                    ]);

                    // Clean up temporary file
                    try {
                        await fs.unlink(tempSceneOutputPath);
                    } catch (err) {
                        console.warn(`Failed to delete temporary scene file: ${err.message}`);
                    }
                } else {
                    // For scenes without BGM, just concatenate the clips
                    await runFFmpeg([
                        '-f', 'concat',
                        '-safe', '0',
                        '-i', sceneClipListPath,
                        '-c', 'copy',
                        sceneOutputPath
                    ]);
                }

                // Add this scene to the final list
                sceneOutputPaths.push(sceneOutputPath);
            }

            // Create a final concat list with all scenes
            const finalConcatListPath = path.join(tempDir, 'final_concat_list.txt');
            let finalConcatContent = '';

            for (const scenePath of sceneOutputPaths) {
                finalConcatContent += `file '${scenePath.replace(/'/g, "'\\''")}'
`;
            }

            // Write the final concat list
            await fs.writeFile(finalConcatListPath, finalConcatContent);
            console.log(`Created final concat list at ${finalConcatListPath}`);

            // 4. Concatenate all scene videos
            console.log('Concatenating scene videos...');
            const outputFileName = `story_${storyId}_${uuidv4()}.mp4`;
            const outputPath = path.join(tempDir, outputFileName);

            // Run FFmpeg to concatenate with memory optimizations
            await runFFmpeg([
                '-f', 'concat',
                '-safe', '0',
                '-i', finalConcatListPath,
                '-threads', '2',    // Limit threads to reduce memory usage
                '-c:v', 'libx264', // Re-encode video to ensure transitions work correctly
                '-preset', 'ultrafast', // Use fastest preset to reduce memory usage
                '-crf', '28',      // Lower quality but faster encoding
                '-c:a', 'aac',     // Re-encode audio to match
                '-b:a', '128k',    // Lower audio bitrate
                '-pix_fmt', 'yuv420p',
                '-r', '25',        // Maintain consistent framerate
                '-movflags', '+faststart', // Optimize for web playback
                outputPath
            ]);

            // Verify the output file exists and has content
            const fileStats = await fs.stat(outputPath);
            console.log(`Output file size: ${fileStats.size} bytes`);
            console.log(`Expected duration: ${totalDuration} seconds`);

            console.log(`Generated unified video: ${outputPath}`);

            // 5. Read the video file
            const videoData = await fs.readFile(outputPath);
            console.log(`Read ${videoData.byteLength} bytes from unified video file.`);

            // 6. Return the video file
            return new Response(videoData, {
                status: 200,
                headers: {
                    'Content-Type': 'video/mp4',
                    'Content-Disposition': `attachment; filename="story_${storyId}_unified.mp4"`
                }
            });
        } catch (err: any) {
            console.error(`Error exporting unified video for story ${storyId}:`, err);
            throw error(500, err.message || 'Failed to export unified video');
        }
    });
};
