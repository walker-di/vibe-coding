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
                        voiceName: clip.voiceName || 'pt-BR-FranciscaNeural'
                    })
                });

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
            const narrationPath = path.join(tempDir, narrationFileName);
            await downloadFile(clip.narrationAudioUrl, narrationPath);
            console.log(`Downloaded narration to ${narrationPath}`);

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

            // Add output options
            ffmpegArgs.push(
                '-c:v', 'libx264',
                '-pix_fmt', 'yuv420p',
                '-c:a', 'aac',
                '-movflags', '+faststart',
                '-t', duration.toString(),
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
