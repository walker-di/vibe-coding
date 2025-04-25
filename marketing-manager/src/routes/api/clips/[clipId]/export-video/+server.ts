import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { runFFmpeg, getAudioDuration, downloadFile, withTemporaryDirectory } from '$lib/server/ffmpegUtils';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const GET: RequestHandler = async ({ params, fetch }) => {
    const { clipId } = params;

    if (!clipId || isNaN(Number(clipId))) {
        throw error(400, 'Invalid clip ID');
    }

    return await withTemporaryDirectory(`clip-export-${clipId}-`, async (tempDir) => {
        try {
            // 1. Fetch the clip data from the database
            const clipResponse = await fetch(`/api/clips/${clipId}`);
            if (!clipResponse.ok) {
                throw error(404, `Clip with ID ${clipId} not found`);
            }

            const clipData = await clipResponse.json();
            const clip = clipData.data;

            if (!clip) {
                throw error(404, `Clip data not found for ID ${clipId}`);
            }

            // 1.1 Fetch the story data to get audio settings
            const storyResponse = await fetch(`/api/stories/${clip.storyId}`);
            let story = null;
            let narrationVolume = 1.0;
            let bgmVolume = 0.5;
            let narrationSpeed = 1.0;

            if (storyResponse.ok) {
                const storyData = await storyResponse.json();
                story = storyData.data;

                // Get audio settings from the story
                narrationVolume = story.narrationVolume ?? 1.0;
                bgmVolume = story.bgmVolume ?? 0.5;
                narrationSpeed = story.narrationSpeed ?? 1.0;

                console.log('Story audio settings:', { narrationVolume, bgmVolume, narrationSpeed });
            } else {
                console.warn(`Could not fetch story data for clip ${clipId}, using default audio settings`);
            }

            // 2. Check if the clip has the required data for video generation
            if (!clip.narration) {
                throw error(400, `Clip ${clipId} is missing narration text`);
            }

            if (!clip.narrationAudioUrl) {
                // Generate narration audio if it doesn't exist
                const narrationResponse = await fetch('/api/ai-storyboard/generate-narration', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        clipId: clip.id,
                        voiceName: clip.voiceName || 'pt-BR-FranciscaNeural',
                        narrationSpeed: narrationSpeed // Use story's narration speed setting
                    })
                });

                console.log(`Generating narration with speed: ${narrationSpeed} for clip ${clip.id}`);

                if (!narrationResponse.ok) {
                    throw error(500, 'Failed to generate narration audio');
                }

                const narrationResult = await narrationResponse.json();
                clip.narrationAudioUrl = narrationResult.narrationAudioUrl;

                // Update the clip with the new narration audio URL
                await fetch(`/api/clips/${clipId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        narrationAudioUrl: clip.narrationAudioUrl
                    })
                });
            }

            // 3. Download assets
            console.log('Downloading assets...');

            // Download narration audio
            const narrationFileName = `narration_${uuidv4()}.mp3`;
            let narrationPath = path.join(tempDir, narrationFileName);
            const normalizedNarrationPath = path.join(tempDir, `normalized_${narrationFileName}`);
            await downloadFile(clip.narrationAudioUrl, narrationPath);
            console.log(`Downloaded narration to ${narrationPath}`);

            // Normalize the narration audio to ensure consistent volume levels
            try {
                await runFFmpeg([
                    '-i', narrationPath,
                    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
                    '-ar', '44100',
                    normalizedNarrationPath
                ]);
                console.log(`Normalized narration audio for clip ${clipId}`);
                // Use the normalized audio file instead of the original
                narrationPath = normalizedNarrationPath;
            } catch (normError) {
                console.warn(`Failed to normalize narration audio for clip ${clipId}, using original: ${normError.message}`);
                // Continue with the original audio file if normalization fails
            }

            // Get narration duration
            const duration = await getAudioDuration(narrationPath);
            if (!duration || duration <= 0) {
                throw new Error(`Could not determine a valid duration for narration audio: ${narrationPath}`);
            }
            console.log(`Narration duration: ${duration} seconds`);

            // Download image if available
            let mainImagePath = null;
            if (clip.imageUrl) {
                const imageFileName = `image_${uuidv4()}.jpg`;
                mainImagePath = path.join(tempDir, imageFileName);
                await downloadFile(clip.imageUrl, mainImagePath);
                console.log(`Downloaded image to ${mainImagePath}`);
            }

            // 4. Generate video
            console.log('Generating video...');
            const outputFileName = `clip_${clipId}_${uuidv4()}.mp4`;
            const outputPath = path.join(tempDir, outputFileName);

            // Prepare FFmpeg command
            const ffmpegArgs = [];

            // Create a filter complex approach for more precise control
            const filterComplex = [];

            // Add inputs
            if (mainImagePath) {
                // Use the image as input with loop
                ffmpegArgs.push('-loop', '1', '-i', mainImagePath);
            } else {
                // Create a black background
                ffmpegArgs.push('-f', 'lavfi', '-i', 'color=c=black:s=1280x720:r=25');
            }

            // Add narration audio
            ffmpegArgs.push('-i', narrationPath);

            // Create filter complex to trim video to exact audio duration, apply volume, and normalize audio
            filterComplex.push(
                `[0:v]trim=duration=${duration}[v0];` +
                `[1:a]volume=${narrationVolume},dynaudnorm=f=150:g=15,atrim=duration=${duration}[a0]`
            );

            console.log(`Applying narration volume: ${narrationVolume} to clip ${clipId}`);

            // Add output options
            ffmpegArgs.push(
                '-filter_complex', filterComplex.join(''),
                '-map', '[v0]', // Map the filtered video stream
                '-map', '[a0]', // Map the filtered audio stream
                '-c:v', 'libx264',
                '-pix_fmt', 'yuv420p',
                '-c:a', 'aac',
                '-r', '25', // Maintain consistent framerate
                '-tune', 'stillimage', // Optimize for still images
                '-movflags', '+faststart',
                outputPath
            );

            // Run FFmpeg
            await runFFmpeg(ffmpegArgs);
            console.log(`Generated video: ${outputPath}`);

            // 5. Read the video file
            const videoData = await fs.readFile(outputPath);
            console.log(`Read ${videoData.byteLength} bytes from video file.`);

            // 6. Return the video file
            return new Response(videoData, {
                status: 200,
                headers: {
                    'Content-Type': 'video/mp4',
                    'Content-Disposition': `attachment; filename="clip_${clipId}.mp4"`
                }
            });
        } catch (err: any) {
            console.error(`Error exporting clip ${clipId}:`, err);
            throw error(500, err.message || 'Failed to export clip video');
        }
    });
};
