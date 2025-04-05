import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db'; // Assuming db instance is here
import { storyboardFrames } from '$lib/server/db/schema'; // Assuming schema is here
import { eq } from 'drizzle-orm';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import { createWriteStream } from 'fs'; // Import createWriteStream directly
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid'; // For unique temp filenames
import { pipeline } from 'node:stream/promises'; // Use pipeline for robust streaming
import { Readable } from 'node:stream'; // Use Readable from node:stream

// Helper to download a file using stream pipeline (Simplified)
async function downloadFile(url: string, destPath: string, fetchFn: typeof fetch): Promise<void> {
    console.log(`Attempting to download: ${url} to ${destPath}`);
    let response: Response | null = null; // Define response variable outside try
    try {
        response = await fetchFn(url); // Use event.fetch
        console.log(`Download response status for ${url}: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            let errorBody = '';
            try { errorBody = await response.text(); } catch (e) { /* Ignore */ }
            throw new Error(`Status ${response.status}: ${response.statusText}. Body: ${errorBody}`);
        }
        if (!response.body) {
            throw new Error(`Response body missing`);
        }

        // Stream directly using pipeline
        await pipeline(
            Readable.fromWeb(response.body as import('node:stream/web').ReadableStream<Uint8Array>),
            createWriteStream(destPath)
        );
        console.log(`Successfully downloaded and saved ${url} to ${destPath}`);

    } catch (downloadError: any) {
        console.error(`Error downloading ${url}:`, downloadError);
        // Construct a more informative error message
        const statusText = response ? `${response.status} ${response.statusText}` : 'N/A';
        throw new Error(`Download failed for ${url} (Status: ${statusText}): ${downloadError.message}`);
    }
}

// Helper to run FFmpeg
function runFFmpeg(args: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
        console.log('Executing FFmpeg with args:', args.join(' '));
        const ffmpegProcess = spawn('ffmpeg', args, { stdio: 'pipe' }); // Ensure ffmpeg is in PATH

        let stdout = '';
        let stderr = '';

        ffmpegProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        ffmpegProcess.stderr.on('data', (data) => {
            stderr += data.toString();
            console.log(`FFmpeg stderr: ${data.toString()}`); // Log stderr in real-time
        });

        ffmpegProcess.on('close', (code) => {
            console.log(`FFmpeg process exited with code ${code}`);
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                reject(new Error(`FFmpeg exited with code ${code}. Stderr: ${stderr}`));
            }
        });

        ffmpegProcess.on('error', (err) => {
            console.error('Failed to start FFmpeg process:', err);
            reject(new Error(`Failed to start FFmpeg: ${err.message}. Is FFmpeg installed and in PATH?`));
        });
    });
}

// Helper to run ffprobe and get duration
async function getAudioDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
        const args = [
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            filePath
        ];
        console.log('Executing ffprobe with args:', args.join(' '));
        const ffprobeProcess = spawn('ffprobe', args, { stdio: 'pipe' }); // Ensure ffprobe is in PATH

        let stdout = '';
        let stderr = '';

        ffprobeProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        ffprobeProcess.stderr.on('data', (data) => {
            stderr += data.toString();
            console.log(`ffprobe stderr: ${data.toString()}`);
        });

        ffprobeProcess.on('close', (code) => {
            console.log(`ffprobe process exited with code ${code}`);
            if (code === 0 && stdout.trim()) {
                try {
                    const duration = parseFloat(stdout.trim());
                    if (isNaN(duration)) {
                         reject(new Error(`ffprobe output was not a valid number: ${stdout.trim()}`));
                    } else {
                         resolve(duration);
                    }
                } catch (parseError) {
                     reject(new Error(`Failed to parse ffprobe duration output: ${stdout.trim()}. Error: ${parseError}`));
                }
            } else {
                reject(new Error(`ffprobe exited with code ${code}. Stderr: ${stderr}`));
            }
        });

         ffprobeProcess.on('error', (err) => {
            console.error('Failed to start ffprobe process:', err);
            reject(new Error(`Failed to start ffprobe: ${err.message}. Is ffprobe installed and in PATH?`));
        });
    });
}


export const GET: RequestHandler = async (event) => { // Destructure event to get params and fetch
    const { params, fetch: eventFetch } = event; // Use eventFetch for internal requests
    const { storyboardId, frameId } = params;
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `frame-export-${frameId}-`));
    const tempFiles: string[] = []; // Keep track of files to clean up

    try {
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
        // TODO: Get duration - Assuming it's stored on the frame or needs calculation
        // For now, let's hardcode a default or require it from the client if needed.
        // We'll use a placeholder duration logic later if needed.
        // Let's assume duration comes from the client or another source for now.
        // We need the duration for the ffmpeg command.
        // Duration will be determined by ffprobe below
        console.log(`Frame data fetched.`);


        // 2. Download assets and get narration duration
        console.log('Downloading assets...');
        const narrationFileName = `narration_${uuidv4()}.mp3`; // Use UUID for uniqueness
        const narrationPath = path.join(tempDir, narrationFileName);
        tempFiles.push(narrationPath);
        // Pass eventFetch to downloadFile
        await downloadFile(frame.narrationAudioUrl, narrationPath, eventFetch);
        console.log(`Downloaded narration to ${narrationPath}`);

        // Get actual duration from the downloaded audio file
        const duration = await getAudioDuration(narrationPath);
        if (!duration || duration <= 0) {
            throw new Error(`Could not determine a valid duration for narration audio: ${narrationPath}`);
        }
        console.log(`Detected narration duration: ${duration} seconds`);

        let bgImagePath: string | null = null;
        let bgInputArg = '';
        if (frame.backgroundImageUrl) {
            const bgFileName = `bg_${uuidv4()}.png`; // Assume png, adjust if needed
            bgImagePath = path.join(tempDir, bgFileName);
            tempFiles.push(bgImagePath);
            // Pass eventFetch to downloadFile
            await downloadFile(frame.backgroundImageUrl, bgImagePath, eventFetch);
            bgInputArg = `-i ${bgImagePath}`;
            console.log(`Downloaded background image to ${bgImagePath}`);
        }

        let mainImagePath: string | null = null;
        let mainInputArg = '';
        if (frame.mainImageUrl) {
            const mainFileName = `main_${uuidv4()}.png`; // Assume png
            mainImagePath = path.join(tempDir, mainFileName);
            tempFiles.push(mainImagePath);
            // Pass eventFetch to downloadFile
            await downloadFile(frame.mainImageUrl, mainImagePath, eventFetch);
            mainInputArg = `-i ${mainImagePath}`;
            console.log(`Downloaded main image to ${mainImagePath}`);
        }

        // Download BGM if URL exists
        let bgmPath: string | null = null;
        if (frame.bgmUrl) {
            const bgmFileName = `bgm_${uuidv4()}.mp3`; // Assume mp3
            bgmPath = path.join(tempDir, bgmFileName);
            tempFiles.push(bgmPath);
            // Pass eventFetch to downloadFile
            await downloadFile(frame.bgmUrl, bgmPath, eventFetch);
            console.log(`Downloaded BGM to ${bgmPath}`);
        }

        console.log('Assets downloaded.');

        // 3. Prepare FFmpeg commands (similar logic to frontend, but with server paths)
        const videoSegmentFile = `frame_segment_${uuidv4()}.mp4`;
        const videoSegmentPath = path.join(tempDir, videoSegmentFile);
        tempFiles.push(videoSegmentPath);

        const finalOutputFile = `frame_final_${uuidv4()}.mp4`;
        const finalOutputPath = path.join(tempDir, finalOutputFile);
        tempFiles.push(finalOutputPath);

        // --- Command 1: Create base video (black or background + overlay) ---
        let overlayFilter = '';
        let baseVideoInputPath = '';

        if (!bgImagePath) {
            // Generate black background VIDEO of the correct duration
            const blackBgFile = `black_bg_${uuidv4()}.mp4`; // Output mp4
            const blackBgPath = path.join(tempDir, blackBgFile);
            tempFiles.push(blackBgPath);
            const blackBgCmd = [
                '-f', 'lavfi', '-i', `color=c=black:s=1280x720:r=25`,
                '-t', duration.toString(), // Use detected duration
                '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
                '-tune', 'stillimage', // Still okay for static color
                '-movflags', '+faststart',
                blackBgPath // Output path for the black video
            ];
            await runFFmpeg(blackBgCmd);
            baseVideoInputPath = blackBgPath; // Use this video path as input
            console.log(`Generated black background video: ${blackBgPath}`);
        } else {
             baseVideoInputPath = bgImagePath; // Use downloaded bg image
        }

        // Determine overlay filter if main image exists
        if (mainImagePath) {
            overlayFilter = `[1:v]scale=576:576[ovrl];[0:v][ovrl]overlay=x=352:y=72`;
        } else {
            // Optional: Generate white square if no main image (like frontend)
            // For simplicity, we'll skip this on backend for now unless needed
            console.log('No main image provided, skipping overlay.');
        }

        // --- Combined Command: Create base video + overlay + mix narration & BGM ---
        console.log('Preparing combined FFmpeg command...');
        const isBaseImage = bgImagePath && /\.(png|jpe?g|webp)$/i.test(baseVideoInputPath);

        // Input mapping:
        // 0: Base image/video
        // 1: Main image (if exists)
        // N: Narration audio (index depends on main image)
        // N+1: BGM audio (if exists)
        const mainImageInputIndex = mainImagePath ? 1 : -1; // -1 if no main image
        const narrationInputIndex = mainImageInputIndex + 1;
        const bgmInputIndex = bgmPath ? narrationInputIndex + 1 : -1;

        // Build filter complex string
        let filterComplexParts: string[] = [];
        let videoMapTarget = '0:v'; // Default map target for video
        let audioMapTarget = `${narrationInputIndex}:a:0`; // Default map target for audio (narration only)

        // Add overlay filter if needed
        if (overlayFilter) {
            filterComplexParts.push(overlayFilter + `[vidout]`);
            videoMapTarget = '[vidout]'; // Map from overlay output
        }

        // Add audio mixing filter if BGM exists
        if (bgmPath) {
            // Mix narration and BGM. Adjust volume: narration normal (1.0), BGM quieter (0.3)
            filterComplexParts.push(`[${narrationInputIndex}:a][${bgmInputIndex}:a]amix=inputs=2:duration=first:dropout_transition=1:weights='1 0.3'[aout]`);
            audioMapTarget = '[aout]'; // Map from amix output
        }

        const filterComplexArg = filterComplexParts.length > 0 ? ['-filter_complex', filterComplexParts.join(';')] : [];

        const combinedCommand = [
             ...(isBaseImage ? ['-loop', '1'] : []), // Loop if base is image
             '-i', baseVideoInputPath, // Input 0
             ...(mainImagePath ? ['-i', mainImagePath] : []), // Input 1 (optional)
             '-i', narrationPath, // Input N
             ...(bgmPath ? ['-i', bgmPath] : []), // Input N+1 (optional)
             ...filterComplexArg, // Add filter complex if needed
             '-map', videoMapTarget, // Map video output
             '-map', audioMapTarget, // Map audio output (narration or mixed)
             '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
             '-c:a', 'aac', // Encode final audio to AAC
             '-movflags', '+faststart',
             '-t', duration.toString(), // Use detected narration duration EXPLICITLY
             // '-shortest', // REMOVED - Replaced by explicit -t
             finalOutputPath // Final output path directly
        ];

        await runFFmpeg(combinedCommand.filter(Boolean) as string[]);
        console.log(`Generated final video directly: ${finalOutputPath}`);

        // --- Redundant Command 2 Block Removed ---

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
                'Content-Disposition': `attachment; filename="frame_${frameId}.mp4"` // Suggest filename
            }
        });

    } catch (err: any) {
        console.error(`Error exporting frame ${frameId}:`, err);
        // Ensure cleanup happens even on error
        throw error(500, `Failed to export frame ${frameId}: ${err.message}`);
    } finally {
        // 6. Cleanup temporary files
        console.log(`Cleaning up temporary files in ${tempDir}`);
        for (const file of tempFiles) {
            try {
                await fs.unlink(file);
                console.log(`Deleted temp file: ${file}`);
            } catch (cleanupErr: any) {
                // Log cleanup errors but don't fail the request because of them
                console.warn(`Failed to delete temp file ${file}: ${cleanupErr.message}`);
            }
        }
        try {
            await fs.rmdir(tempDir); // Remove the temp directory itself
             console.log(`Removed temp directory: ${tempDir}`);
        } catch (cleanupErr: any) {
             console.warn(`Failed to remove temp directory ${tempDir}: ${cleanupErr.message}`);
        }
    }
};
