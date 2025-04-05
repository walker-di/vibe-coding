import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { storyboardFrames, storyboards } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
    downloadFile,
    runFFmpeg,
    getAudioDuration,
    withTemporaryDirectory
} from '$lib/server/ffmpegUtils';

// Define a type for the frame data we need (adjust as necessary)
type FrameData = {
    id: string;
    narrationAudioUrl: string | null;
    backgroundImageUrl: string | null;
    mainImageUrl: string | null;
    bgmUrl: string | null;
    frameOrder: number;
};

export const GET: RequestHandler = async (event) => {
    const { params, fetch: eventFetch } = event;
    const { storyboardId } = params;

    return await withTemporaryDirectory(`storyboard-export-${storyboardId}-`, async (tempDir) => {
        try {
            // 1. Fetch storyboard details (for filename)
            console.log(`Fetching storyboard details for ID: ${storyboardId}`);
            const storyboard = await db.query.storyboards.findFirst({
                where: eq(storyboards.id, storyboardId),
                columns: { name: true }
            });

            if (!storyboard) {
                throw error(404, `Storyboard with ID ${storyboardId} not found.`);
            }
            const safeStoryboardName = storyboard.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'storyboard';
            console.log(`Storyboard name: ${storyboard.name}`);

            // 2. Fetch all frames for the storyboard, ordered by frameOrder
            console.log(`Fetching frames for storyboard ID: ${storyboardId}`);
            const frames: FrameData[] = await db.query.storyboardFrames.findMany({
                where: eq(storyboardFrames.storyboardId, storyboardId),
                orderBy: [asc(storyboardFrames.frameOrder)],
                // Select only necessary columns
                columns: {
                    id: true,
                    narrationAudioUrl: true,
                    backgroundImageUrl: true,
                    mainImageUrl: true,
                    bgmUrl: true,
                    frameOrder: true
                }
            });

            if (!frames || frames.length === 0) {
                throw error(400, `No frames found for storyboard ${storyboardId}.`);
            }
            console.log(`Found ${frames.length} frames.`);

            // Filter frames that have narration (essential for duration and segment creation)
            const validFrames = frames.filter(f => f.narrationAudioUrl);
            if (validFrames.length === 0) {
                throw error(400, `No frames with narration found in storyboard ${storyboardId}. Cannot export video.`);
            }
            console.log(`Processing ${validFrames.length} frames with narration.`);

            const segmentFiles: string[] = []; // Store paths to generated .ts segment files

            // 3. Process each frame to generate a video segment (.ts format recommended for concat)
            for (let i = 0; i < validFrames.length; i++) {
                const frame = validFrames[i];
                const frameLogPrefix = `Frame ${i + 1}/${validFrames.length} (ID: ${frame.id.substring(0, 6)}):`;
                console.log(`${frameLogPrefix} Processing...`);

                // --- Download assets for this frame ---
                console.log(`${frameLogPrefix} Downloading assets...`);
                const narrationFileName = `narration_${i}_${uuidv4()}.mp3`;
                const narrationPath = path.join(tempDir, narrationFileName);
                await downloadFile(frame.narrationAudioUrl!, narrationPath, eventFetch); // Not null asserted due to filter

                const duration = await getAudioDuration(narrationPath);
                if (!duration || duration <= 0) {
                    console.warn(`${frameLogPrefix} Skipping frame - Could not determine valid duration for narration: ${narrationPath}`);
                    continue; // Skip this frame if duration is invalid
                }
                console.log(`${frameLogPrefix} Detected narration duration: ${duration} seconds`);

                let bgImagePath: string | null = null;
                if (frame.backgroundImageUrl) {
                    const bgFileName = `bg_${i}_${uuidv4()}.png`;
                    bgImagePath = path.join(tempDir, bgFileName);
                    await downloadFile(frame.backgroundImageUrl, bgImagePath, eventFetch);
                }

                let mainImagePath: string | null = null;
                if (frame.mainImageUrl) {
                    const mainFileName = `main_${i}_${uuidv4()}.png`;
                    mainImagePath = path.join(tempDir, mainFileName);
                    await downloadFile(frame.mainImageUrl, mainImagePath, eventFetch);
                }

                let bgmPath: string | null = null;
                if (frame.bgmUrl) {
                    const bgmFileName = `bgm_${i}_${uuidv4()}.mp3`;
                    bgmPath = path.join(tempDir, bgmFileName);
                    await downloadFile(frame.bgmUrl, bgmPath, eventFetch);
                }
                console.log(`${frameLogPrefix} Assets downloaded.`);

                // --- Generate video segment using FFmpeg ---
                const segmentOutputFile = `segment_${i}_${uuidv4()}.ts`; // Use .ts for concat
                const segmentOutputPath = path.join(tempDir, segmentOutputFile);

                let overlayFilter = '';
                let baseVideoInputPath = '';

                if (!bgImagePath) {
                    // Generate black background segment
                    const blackBgFile = `black_bg_${i}_${uuidv4()}.ts`; // Output .ts
                    const blackBgPath = path.join(tempDir, blackBgFile);
                    const blackBgCmd = [
                        '-f', 'lavfi', '-i', `color=c=black:s=1280x720:r=25`,
                        '-t', duration.toString(),
                        '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
                        '-tune', 'stillimage',
                        '-c:a', 'aac', '-ar', '48000', '-b:a', '192k', // Ensure consistent audio codec for concat
                        '-bsf:v', 'h264_mp4toannexb', // Needed for .ts output
                        '-f', 'mpegts', // Output format
                        blackBgPath
                    ];
                    await runFFmpeg(blackBgCmd);
                    baseVideoInputPath = blackBgPath;
                } else {
                    baseVideoInputPath = bgImagePath;
                }

                if (mainImagePath) {
                    overlayFilter = `[1:v]scale=576:576[ovrl];[0:v][ovrl]overlay=x=352:y=72`;
                }

                const isBaseImage = /\.(png|jpe?g|webp)$/i.test(baseVideoInputPath);
                const mainImageInputIndex = mainImagePath ? 1 : -1;
                const narrationInputIndex = mainImageInputIndex + 1;
                const bgmInputIndex = bgmPath ? narrationInputIndex + 1 : -1;

                let filterComplexParts: string[] = [];
                let videoMapTarget = '0:v';
                let audioMapTarget = `${narrationInputIndex}:a:0`;

                if (overlayFilter) {
                    filterComplexParts.push(overlayFilter + `[vidout]`);
                    videoMapTarget = '[vidout]';
                }
                if (bgmPath) {
                    filterComplexParts.push(`[${narrationInputIndex}:a][${bgmInputIndex}:a]amix=inputs=2:duration=first:dropout_transition=1:weights='1 0.3'[aout]`);
                    audioMapTarget = '[aout]';
                }

                const filterComplexArg = filterComplexParts.length > 0 ? ['-filter_complex', filterComplexParts.join(';')] : [];

                const segmentCommand = [
                    ...(isBaseImage ? ['-loop', '1'] : []),
                    '-i', baseVideoInputPath,
                    ...(mainImagePath ? ['-i', mainImagePath] : []),
                    '-i', narrationPath,
                    ...(bgmPath ? ['-i', bgmPath] : []),
                    ...filterComplexArg,
                    '-map', videoMapTarget,
                    '-map', audioMapTarget,
                    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
                    '-c:a', 'aac', '-ar', '48000', '-b:a', '192k', // Consistent audio codec
                    '-t', duration.toString(),
                    '-bsf:v', 'h264_mp4toannexb', // Bitstream filter for TS
                    '-f', 'mpegts', // Output format TS
                    segmentOutputPath
                ];

                await runFFmpeg(segmentCommand.filter(Boolean) as string[]);
                console.log(`${frameLogPrefix} Generated segment: ${segmentOutputPath}`);
                segmentFiles.push(segmentOutputPath); // Add successfully generated segment path
            } // End frame loop

            // 4. Concatenate segments if any were generated
            if (segmentFiles.length === 0) {
                throw error(500, `No video segments could be generated for storyboard ${storyboardId}.`);
            }
            console.log(`Generated ${segmentFiles.length} segments. Concatenating...`);

            const fileListPath = path.join(tempDir, 'filelist.txt');
            // Ensure paths in filelist.txt are properly escaped for ffmpeg if they contain special characters
            // For simplicity, assuming basic paths generated by uuidv4 are safe here.
            // Use forward slashes even on Windows for ffmpeg concat demuxer.
            const fileListContent = segmentFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n');
            await fs.writeFile(fileListPath, fileListContent);
            console.log(`Created filelist.txt at ${fileListPath}`);

            const finalOutputFile = `${safeStoryboardName}_unified_${uuidv4()}.mp4`;
            const finalOutputPath = path.join(tempDir, finalOutputFile);

            const concatCommand = [
                '-f', 'concat',
                '-safe', '0', // Allows relative paths in filelist.txt within the temp dir
                '-i', fileListPath,
                '-c', 'copy', // Crucial: avoids re-encoding, much faster
                '-movflags', '+faststart', // Good practice for web video
                finalOutputPath
            ];

            await runFFmpeg(concatCommand);
            console.log(`Concatenated video created: ${finalOutputPath}`);

            // 5. Read and return the final video
            const videoData = await fs.readFile(finalOutputPath);
            console.log(`Read ${videoData.byteLength} bytes from final video file.`);

            return new Response(videoData, {
                status: 200,
                headers: {
                    'Content-Type': 'video/mp4',
                    'Content-Disposition': `attachment; filename="${safeStoryboardName}_unified.mp4"`
                }
            });

        } catch (err: any) {
            console.error(`Error exporting unified storyboard ${storyboardId}:`, err);
            if (err.status && typeof err.status === 'number') {
                throw err; // Re-throw SvelteKit errors
            }
            throw error(500, `Failed to export unified storyboard ${storyboardId}: ${err.message}`);
        }
        // Cleanup is handled by withTemporaryDirectory
    });
};
