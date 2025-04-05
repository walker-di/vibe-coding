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
    transitionTypeAfter: string; // Added
    transitionDurationAfter: number; // Added
};

// Map of transition names supported by xfade (based on user's help output)
const validXfadeTransitions: { [key: string]: boolean } = {
    fade: true, wipeleft: true, wiperight: true, wipeup: true, wipedown: true,
    slideleft: true, slideright: true, slideup: true, slidedown: true, circlecrop: true,
    rectcrop: true, distance: true, fadeblack: true, fadewhite: true, radial: true,
    smoothleft: true, smoothright: true, smoothup: true, smoothdown: true, circleopen: true,
    circleclose: true, vertopen: true, vertclose: true, horzopen: true, horzclose: true,
    dissolve: true, pixelize: true, diagtl: true, diagtr: true, diagbl: true, diagbr: true,
    hlslice: true, hrslice: true, vuslice: true, vdslice: true, hblur: true, fadegrays: true,
    wipetl: true, wipetr: true, wipebl: true, wipebr: true, squeezeh: true, squeezev: true,
    zoomin: true, fadefast: true, fadeslow: true, hlwind: true, hrwind: true, vuwind: true,
    vdwind: true, coverleft: true, coverright: true, coverup: true, coverdown: true,
    revealleft: true, revealright: true, revealup: true, revealdown: true
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
                columns: {
                    id: true, narrationAudioUrl: true, backgroundImageUrl: true, mainImageUrl: true,
                    bgmUrl: true, frameOrder: true, transitionTypeAfter: true, transitionDurationAfter: true
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

            // Check if any frame has a transition defined
            let useTransitions = validFrames.some(f => f.transitionTypeAfter && f.transitionTypeAfter !== 'none');
            console.log(`Transitions will be ${useTransitions ? 'ENABLED (using xfade/concat filter)' : 'DISABLED (using concat demuxer)'}.`); // Updated log message

            const segmentFiles: string[] = []; // Store paths to generated .ts segment files
            const segmentDurations: number[] = []; // Store durations for transition offset calculation

            // 3. Process each frame to generate a video segment (.ts format recommended for concat)
            for (let i = 0; i < validFrames.length; i++) {
                const frame = validFrames[i];
                const frameLogPrefix = `Frame ${i + 1}/${validFrames.length} (ID: ${frame.id.substring(0, 6)}):`;
                console.log(`${frameLogPrefix} Processing...`);

                // --- Download assets ---
                console.log(`${frameLogPrefix} Downloading assets...`);
                const narrationFileName = `narration_${i}_${uuidv4()}.mp3`;
                const narrationPath = path.join(tempDir, narrationFileName);
                await downloadFile(frame.narrationAudioUrl!, narrationPath, eventFetch);

                let duration: number;
                try {
                    duration = await getAudioDuration(narrationPath);
                    if (!duration || duration <= 0) throw new Error(`Invalid duration detected: ${duration}`);
                    console.log(`${frameLogPrefix} Detected narration duration: ${duration} seconds`);
                    segmentDurations.push(duration);
                } catch (durationError: any) {
                     console.warn(`${frameLogPrefix} Skipping frame - Could not determine valid duration for narration: ${narrationPath}. Error: ${durationError.message}`);
                     useTransitions = false; // Disable transitions if any segment fails
                     console.log("Disabling transitions due to duration error in one segment.");
                     throw error(500, `Failed to get duration for frame ${i + 1}. Cannot proceed with export.`);
                }

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

                // --- Generate video segment ---
                const segmentOutputFile = `segment_${i}_${uuidv4()}.ts`;
                const segmentOutputPath = path.join(tempDir, segmentOutputFile);

                let baseVideoInputPath = '';
                let isBaseImage = false;

                // --- Corrected Input Handling ---
                const segmentCommandInputs: string[] = [];
                const inputMapping: { [key: string]: number } = {};
                let inputIndex = 0;

                // Base input (image or black video)
                if (!bgImagePath) {
                    const blackBgFile = `black_bg_${i}_${uuidv4()}.ts`;
                    const blackBgPath = path.join(tempDir, blackBgFile);
                    const segmentAudioCodecArgs = ['-c:a', 'aac', '-ar', '48000', '-b:a', '192k'];
                    const blackBgCmd = [
                        '-f', 'lavfi', '-i', `color=c=black:s=1280x720:r=25`, // Input 0: Video
                        '-f', 'lavfi', '-i', 'anullsrc=channel_layout=mono:sample_rate=48000', // Input 1: Audio
                        '-map', '0:v', '-map', '1:a',
                        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-tune', 'stillimage',
                        ...segmentAudioCodecArgs,
                        '-t', duration.toString(),
                        '-bsf:v', 'h264_mp4toannexb', '-f', 'mpegts',
                        blackBgPath
                    ];
                    console.log(`Executing FFmpeg for black background: ${blackBgCmd.join(' ')}`);
                    await runFFmpeg(blackBgCmd);
                    baseVideoInputPath = blackBgPath;
                    isBaseImage = false;
                } else {
                    baseVideoInputPath = bgImagePath;
                    isBaseImage = /\.(png|jpe?g|webp)$/i.test(baseVideoInputPath);
                }
                segmentCommandInputs.push(...(isBaseImage ? ['-loop', '1'] : []), '-i', baseVideoInputPath);
                inputMapping['baseVideo'] = inputIndex++;

                if (mainImagePath) {
                    segmentCommandInputs.push('-i', mainImagePath);
                    inputMapping['mainImage'] = inputIndex++;
                }
                segmentCommandInputs.push('-i', narrationPath);
                inputMapping['narration'] = inputIndex++;
                if (bgmPath) {
                    segmentCommandInputs.push('-i', bgmPath);
                    inputMapping['bgm'] = inputIndex++;
                }
                // --- End Corrected Input Handling ---


                // --- Build filter complex and map using corrected inputMapping ---
                const filterComplexParts: string[] = [];
                const initialVideoLabel = `[${inputMapping['baseVideo']}:v]`;
                const initialAudioLabel = `[${inputMapping['narration']}:a]`;
                let videoMapLabel = initialVideoLabel;
                let audioMapLabel = initialAudioLabel;

                if (mainImagePath) {
                    const overlayOutputLabel = '[vid_overlayed]';
                    filterComplexParts.push(
                        `[${inputMapping['mainImage']}:v]scale=576:576[ovrl];${videoMapLabel}[ovrl]overlay=x=352:y=72${overlayOutputLabel}`
                    );
                    videoMapLabel = overlayOutputLabel;
                }

                if (bgmPath) {
                    const mixOutputLabel = '[audio_mixed]';
                    filterComplexParts.push(
                        `${audioMapLabel}[${inputMapping['bgm']}:a]amix=inputs=2:duration=first:dropout_transition=1:weights='1 0.3'${mixOutputLabel}`
                    );
                    audioMapLabel = mixOutputLabel;
                } else if (!bgImagePath && inputMapping['baseVideo'] !== undefined) {
                    audioMapLabel = `[${inputMapping['narration']}:a]`;
                }

                // --- Assemble the command ---
                const segmentCommandArgs: string[] = [...segmentCommandInputs];
                let finalVideoMapArg = videoMapLabel;
                let finalAudioMapArg = audioMapLabel;

                if (filterComplexParts.length > 0) {
                    // A filter graph is being used. Check if passthrough filters are needed.
                    const wasVideoFiltered = videoMapLabel !== initialVideoLabel;
                    const wasAudioFiltered = audioMapLabel !== initialAudioLabel;

                    const videoPassthroughLabel = '[v_passthrough]';
                    const audioPassthroughLabel = '[a_passthrough]';

                    if (!wasVideoFiltered) {
                        filterComplexParts.push(`${initialVideoLabel}null${videoPassthroughLabel}`);
                        finalVideoMapArg = videoPassthroughLabel;
                    }

                    if (!wasAudioFiltered) {
                        filterComplexParts.push(`${initialAudioLabel}anull${audioPassthroughLabel}`);
                        finalAudioMapArg = audioPassthroughLabel;
                    }

                    segmentCommandArgs.push('-filter_complex', filterComplexParts.join(';'));
                }

                // Add mapping arguments
                segmentCommandArgs.push('-map', finalVideoMapArg);
                segmentCommandArgs.push('-map', finalAudioMapArg);

                // Add encoding options and output file
                const segmentAudioCodecArgs = ['-c:a', 'aac', '-ar', '48000', '-b:a', '192k'];
                segmentCommandArgs.push(
                    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
                    ...segmentAudioCodecArgs,
                    '-t', duration.toString(),
                    '-bsf:v', 'h264_mp4toannexb',
                    '-f', 'mpegts',
                    segmentOutputPath
                );

                console.log(`${frameLogPrefix} Executing FFmpeg segment command: ${segmentCommandArgs.join(' ')}`);
                await runFFmpeg(segmentCommandArgs.filter(Boolean) as string[]);
                console.log(`${frameLogPrefix} Generated segment: ${segmentOutputPath}`);
                segmentFiles.push(segmentOutputPath);
            } // End frame loop

            // 4. Concatenate segments
            if (segmentFiles.length === 0) {
                throw error(500, `No valid video segments could be generated for storyboard ${storyboardId}.`);
            }
            console.log(`Generated ${segmentFiles.length} segments.`);

            const finalOutputFile = `${safeStoryboardName}_unified_${uuidv4()}.mp4`;
            const finalOutputPath = path.join(tempDir, finalOutputFile);

            // Re-evaluate useTransitions based on actual segments generated and check count
            useTransitions = useTransitions && segmentFiles.length > 1;

            if (useTransitions) {
                // --- Use xfade filter for VIDEO transitions, concat filter for AUDIO ---
                console.log('Building complex filter graph: xfade (video) + concat (audio)...');
                const inputs = segmentFiles.map(f => ['-i', f]).flat();

                let videoFilterChain = '';
                let lastVideoOutputLabel = '[0:v]'; // Start with the video stream of the first input

                // 1. Build the sequential VIDEO chain using xfade
                for (let i = 0; i < segmentFiles.length - 1; i++) {
                    const transitionType = validFrames[i].transitionTypeAfter || 'none';
                    let safeTransitionType = validXfadeTransitions[transitionType] ? transitionType : 'fade';
                    let transitionDuration = validFrames[i].transitionDurationAfter ?? 1.0;
                    const segmentDuration = segmentDurations[i];
                    const nextInputVideo = `[${i + 1}:v]`;
                    const outputLabel = `[v${i}]`;

                    // If type is 'none', simulate a cut with a very short fade
                    if (transitionType === 'none') {
                        safeTransitionType = 'fade';
                        transitionDuration = 0.01; // Simulate cut
                        console.log(`  - Simulating video cut with short fade between segment ${i} and ${i + 1}`);
                    }

                    const offset = Math.max(0, segmentDuration - transitionDuration);
                    videoFilterChain += `${lastVideoOutputLabel}${nextInputVideo}xfade=transition=${safeTransitionType}:duration=${transitionDuration}:offset=${offset}${outputLabel};`;
                    lastVideoOutputLabel = outputLabel; // Chain the output
                    console.log(`  - Added video xfade: ${safeTransitionType} (${transitionDuration}s) between segment ${i} and ${i + 1} starting at ${offset}s within segment ${i}`);
                }

                // 2. Build the sequential AUDIO chain using concat filter
                const audioInputs = segmentFiles.map((_, i) => `[${i}:a]`).join('');
                const audioFilterChain = `${audioInputs}concat=n=${segmentFiles.length}:v=0:a=1[aout]`;
                console.log(`  - Added audio concatenation for ${segmentFiles.length} segments.`);

                // 3. Combine video and audio filter chains
                const filterComplex = `${videoFilterChain}${audioFilterChain}`;

                // 4. Build the final command
                const transitionCommand = [
                    ...inputs,
                    '-filter_complex', filterComplex,
                    '-map', lastVideoOutputLabel, // Map the final video label from the xfade chain
                    '-map', '[aout]',         // Map the final audio label from the concat chain
                    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
                    '-c:a', 'aac', '-ar', '48000', '-b:a', '192k', // Ensure consistent audio encoding
                    '-movflags', '+faststart',
                    finalOutputPath
                ];
                console.log('Executing FFmpeg command with xfade (video) / concat (audio)...');
                await runFFmpeg(transitionCommand);
                console.log(`Video with transitions created: ${finalOutputPath}`);

            } else {
                // --- Use concat demuxer (fast, no transitions or only one segment) ---
                console.log('Using concat demuxer (no transitions or single segment)...');
                const fileListPath = path.join(tempDir, 'filelist.txt');
                const fileListContent = segmentFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n');
                await fs.writeFile(fileListPath, fileListContent);
                console.log(`Created filelist.txt at ${fileListPath}`);

                const concatCommand = [
                    '-f', 'concat', '-safe', '0', '-i', fileListPath,
                    '-c', 'copy', // No re-encoding
                    '-movflags', '+faststart', finalOutputPath
                ];
                console.log('Executing FFmpeg command without transitions...');
                await runFFmpeg(concatCommand);
                console.log(`Concatenated video created (no transitions): ${finalOutputPath}`);
            }

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
