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

            // 3. Generate individual clip videos and prepare for concatenation
            console.log('Generating individual clip videos...');

            // Log BGM information for debugging
            if (sceneBgmPaths.size > 0) {
                console.log(`Found BGM for ${sceneBgmPaths.size} scenes:`);
                for (const [sceneId, bgmPath] of sceneBgmPaths.entries()) {
                    console.log(`  - Scene ${sceneId}: ${bgmPath}`);
                }
            } else {
                console.log('No BGM found for any scenes.');
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

                // Create FFmpeg command array
                const ffmpegArgs = [
                    // Set framerate before input
                    '-framerate', '25',
                    // Input image with loop
                    '-loop', '1', '-i', mainImagePath,
                    // Input narration audio
                    '-i', narrationPath
                ];

                // Add BGM input if available
                if (hasBgm) {
                    ffmpegArgs.push('-i', bgmPath);
                    console.log(`Added BGM to clip ${clip.id} using original BGM file: ${bgmPath}`);
                }

                // Add video filters if any
                if (videoFilters.length > 0) {
                    ffmpegArgs.push('-vf', videoFilters.join(','));
                }

                // Create filter complex for audio mixing if we have BGM
                if (hasBgm) {
                    // Create a filter complex to mix narration and BGM
                    // Volume: narration at 1.0 (100%), BGM at 0.3 (30%)
                    // Use atrim to start BGM at 0 and limit to clip duration
                    const clipDuration = clip.duration || 3; // Default to 3 seconds if no duration

                    ffmpegArgs.push(
                        '-filter_complex',
                        `[1:a]volume=1.0[narration];[2:a]volume=0.3,atrim=0:${clipDuration}[bgm];[narration][bgm]amix=inputs=2:duration=shortest[aout]`,
                        '-map', '0:v',   // Map video from first input
                        '-map', '[aout]' // Map mixed audio
                    );

                    console.log(`Added BGM to clip ${clip.id} with duration: ${clipDuration}s`);
                } else {
                    // No BGM, just map the narration audio
                    ffmpegArgs.push('-map', '0:v', '-map', '1:a');
                }

                // Add remaining encoding parameters
                ffmpegArgs.push(
                    // Video codec settings
                    '-c:v', 'libx264',
                    '-pix_fmt', 'yuv420p',
                    // Audio codec
                    '-c:a', 'aac',
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

            // Write the concat list file
            await fs.writeFile(concatListPath, concatFileContent);
            console.log(`Created concat list at ${concatListPath}`);

            // 4. Concatenate all videos
            console.log('Concatenating videos...');
            const outputFileName = `story_${storyId}_${uuidv4()}.mp4`;
            const outputPath = path.join(tempDir, outputFileName);

            // Run FFmpeg to concatenate
            // Note: We're not using '-c copy' to ensure transitions are applied correctly
            await runFFmpeg([
                '-f', 'concat',
                '-safe', '0',
                '-i', concatListPath,
                '-c:v', 'libx264', // Re-encode video to ensure transitions work correctly
                '-c:a', 'aac',     // Re-encode audio to match
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
