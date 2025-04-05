import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db'; // Assuming db instance is here
import { storyboardFrames } from '$lib/server/db/schema'; // Assuming schema is here
import { eq } from 'drizzle-orm';
import fs from 'fs/promises'; // Keep for readFile at the end
import path from 'path';
import { v4 as uuidv4 } from 'uuid'; // For unique temp filenames
import {
    downloadFile,
    runFFmpeg,
    getAudioDuration,
    withTemporaryDirectory
} from '$lib/server/ffmpegUtils'; // Import helpers


export const GET: RequestHandler = async (event) => { // Destructure event to get params and fetch
    const { params, fetch: eventFetch } = event; // Use eventFetch for internal requests
    const { storyboardId, frameId } = params; // Keep storyboardId for potential future use

    // Use the withTemporaryDirectory helper for automatic cleanup
    return await withTemporaryDirectory(`frame-export-${frameId}-`, async (tempDir) => {
        try {
            const tempFiles: string[] = []; // Keep track of files created *within* this operation for logging/debugging if needed

            // 1. Fetch frame data from DB
            console.log(`Fetching frame data for frameId: ${frameId}`);
            const frame = await db.query.storyboardFrames.findFirst({
                where: eq(storyboardFrames.id, frameId),
            });

            if (!frame) {
                throw error(404, `Frame with ID ${frameId} not found.`);
            }
            if (!frame.narrationAudioUrl) {
                 throw error(400, `Frame ${frameId} is missing narration audio URL.`);
            }
            console.log(`Frame data fetched.`);


            // 2. Download assets and get narration duration
            console.log('Downloading assets...');
            const narrationFileName = `narration_${uuidv4()}.mp3`; // Use UUID for uniqueness
            const narrationPath = path.join(tempDir, narrationFileName);
            tempFiles.push(narrationPath); // Track file
            await downloadFile(frame.narrationAudioUrl, narrationPath, eventFetch);
            console.log(`Downloaded narration to ${narrationPath}`);

            const duration = await getAudioDuration(narrationPath);
            if (!duration || duration <= 0) {
                throw new Error(`Could not determine a valid duration for narration audio: ${narrationPath}`);
            }
            console.log(`Detected narration duration: ${duration} seconds`);

            let bgImagePath: string | null = null;
            if (frame.backgroundImageUrl) {
                const bgFileName = `bg_${uuidv4()}.png`;
                bgImagePath = path.join(tempDir, bgFileName);
                tempFiles.push(bgImagePath); // Track file
                await downloadFile(frame.backgroundImageUrl, bgImagePath, eventFetch);
                console.log(`Downloaded background image to ${bgImagePath}`);
            }

            let mainImagePath: string | null = null;
            if (frame.mainImageUrl) {
                const mainFileName = `main_${uuidv4()}.png`;
                mainImagePath = path.join(tempDir, mainFileName);
                tempFiles.push(mainImagePath); // Track file
                await downloadFile(frame.mainImageUrl, mainImagePath, eventFetch);
                console.log(`Downloaded main image to ${mainImagePath}`);
            }

            let bgmPath: string | null = null;
            if (frame.bgmUrl) {
                const bgmFileName = `bgm_${uuidv4()}.mp3`;
                bgmPath = path.join(tempDir, bgmFileName);
                tempFiles.push(bgmPath); // Track file
                await downloadFile(frame.bgmUrl, bgmPath, eventFetch);
                console.log(`Downloaded BGM to ${bgmPath}`);
            }

            console.log('Assets downloaded.');

            // 3. Prepare FFmpeg commands
            const finalOutputFile = `frame_final_${uuidv4()}.mp4`;
            const finalOutputPath = path.join(tempDir, finalOutputFile);
            tempFiles.push(finalOutputPath); // Track file

            let overlayFilter = '';
            let baseVideoInputPath = '';

            if (!bgImagePath) {
                const blackBgFile = `black_bg_${uuidv4()}.mp4`;
                const blackBgPath = path.join(tempDir, blackBgFile);
                tempFiles.push(blackBgPath); // Track file
                const blackBgCmd = [
                    '-f', 'lavfi', '-i', `color=c=black:s=1280x720:r=25`,
                    '-t', duration.toString(),
                    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
                    '-tune', 'stillimage',
                    '-movflags', '+faststart',
                    blackBgPath
                ];
                await runFFmpeg(blackBgCmd);
                baseVideoInputPath = blackBgPath;
                console.log(`Generated black background video: ${blackBgPath}`);
            } else {
                 baseVideoInputPath = bgImagePath;
            }

            if (mainImagePath) {
                overlayFilter = `[1:v]scale=576:576[ovrl];[0:v][ovrl]overlay=x=352:y=72`;
            } else {
                console.log('No main image provided, skipping overlay.');
            }

            console.log('Preparing combined FFmpeg command...');
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

            const combinedCommand = [
                 ...(isBaseImage ? ['-loop', '1'] : []),
                 '-i', baseVideoInputPath,
                 ...(mainImagePath ? ['-i', mainImagePath] : []),
                 '-i', narrationPath,
                 ...(bgmPath ? ['-i', bgmPath] : []),
                 ...filterComplexArg,
                 '-map', videoMapTarget,
                 '-map', audioMapTarget,
                 '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
                 '-c:a', 'aac',
                 '-movflags', '+faststart',
                 '-t', duration.toString(),
                 finalOutputPath
            ];

            await runFFmpeg(combinedCommand.filter(Boolean) as string[]);
            console.log(`Generated final video directly: ${finalOutputPath}`);

            // 4. Read the final video file
            console.log(`Reading final video file: ${finalOutputPath}`);
            const videoData = await fs.readFile(finalOutputPath);
            console.log(`Read ${videoData.byteLength} bytes from final video file.`);

            // 5. Return the video file
            console.log(`Returning video data in response...`);
            return new Response(videoData, {
                status: 200,
                headers: {
                    'Content-Type': 'video/mp4',
                    'Content-Disposition': `attachment; filename="frame_${frameId}.mp4"`
                }
            });

        // Catch errors within the operation and re-throw as SvelteKit errors
        } catch (err: any) {
            console.error(`Error exporting frame ${frameId} within withTemporaryDirectory:`, err);
            // Use SvelteKit's error helper for proper HTTP error responses
            // Check if it's already a SvelteKit HttpError
            if (err.status && typeof err.status === 'number') {
                throw err; // Re-throw SvelteKit errors directly
            }
            // Otherwise, wrap it in a 500 error
            throw error(500, `Failed to export frame ${frameId}: ${err.message}`);
        }
        // Cleanup is handled automatically by withTemporaryDirectory's finally block
    });
};
