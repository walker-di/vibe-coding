import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { runFFmpeg, getAudioDuration, downloadFile, withTemporaryDirectory } from '$lib/server/ffmpegUtils';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const GET: RequestHandler = async ({ params, fetch }) => {
    const { storyId } = params;

    if (!storyId || isNaN(Number(storyId))) {
        throw error(400, 'Invalid story ID');
    }

    return await withTemporaryDirectory(`story-export-${storyId}-`, async (tempDir) => {
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

            // 2. Ensure all clips have narration audio and download assets
            console.log('Processing clips and downloading assets...');

            // Collect all clips from all scenes
            const allClips = [];
            for (const scene of story.scenes) {
                if (!scene.clips || scene.clips.length === 0) continue;

                for (const clip of scene.clips) {
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

            // Create a file to list all videos for concatenation
            const concatListPath = path.join(tempDir, 'concat_list.txt');
            let concatFileContent = '';

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

                // Download image if available
                let mainImagePath = null;
                if (clip.imageUrl) {
                    const imageFileName = `image_${clip.id}_${uuidv4()}.jpg`;
                    mainImagePath = path.join(tempDir, imageFileName);
                    await downloadFile(clip.imageUrl, mainImagePath);
                }

                // Generate clip video
                const clipOutputFileName = `clip_${clip.id}_${uuidv4()}.mp4`;
                const clipOutputPath = path.join(tempDir, clipOutputFileName);

                // Prepare FFmpeg command for this clip
                const clipFfmpegArgs = [];

                // Add inputs
                if (mainImagePath) {
                    // Use the image as input with loop
                    clipFfmpegArgs.push('-loop', '1', '-i', mainImagePath);
                } else {
                    // Create a black background
                    clipFfmpegArgs.push('-f', 'lavfi', '-i', 'color=c=black:s=1280x720:r=25');
                }

                // Add narration audio
                clipFfmpegArgs.push('-i', narrationPath);

                // Add output options
                clipFfmpegArgs.push(
                    '-c:v', 'libx264',
                    '-pix_fmt', 'yuv420p',
                    '-c:a', 'aac',
                    '-movflags', '+faststart',
                    '-t', clip.duration.toString(),
                    clipOutputPath
                );

                // Run FFmpeg for this clip
                await runFFmpeg(clipFfmpegArgs);
                console.log(`Generated clip video: ${clipOutputPath}`);

                // Add to concat list
                concatFileContent += `file '${clipOutputPath.replace(/'/g, "'\\''")}'
`;

                // Add a fade transition if this is not the last clip
                if (i < allClips.length - 1) {
                    // Create a 1-second fade transition
                    const transitionFileName = `transition_${i}_${uuidv4()}.mp4`;
                    const transitionPath = path.join(tempDir, transitionFileName);

                    // Generate a 1-second black video with fade
                    await runFFmpeg([
                        '-f', 'lavfi', '-i', 'color=c=black:s=1280x720:r=25:d=1',
                        '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
                        transitionPath
                    ]);

                    // Add transition to concat list
                    concatFileContent += `file '${transitionPath.replace(/'/g, "'\\''")}'
`;
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
            await runFFmpeg([
                '-f', 'concat',
                '-safe', '0',
                '-i', concatListPath,
                '-c', 'copy',
                outputPath
            ]);

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
