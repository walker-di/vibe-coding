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
    getStreamDuration, // Crucial for iterative xfade offset
    withTemporaryDirectory
} from '$lib/server/ffmpegUtils';

// Types and constants remain the same...
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
        let finalVideoPath: string | null = null; // Keep track of the final result path

        try {
            // 1. Fetch storyboard details - OK
            console.log(`Fetching storyboard details for ID: ${storyboardId}`);
            const storyboard = await db.query.storyboards.findFirst({
                where: eq(storyboards.id, storyboardId),
                columns: { name: true }
             });
            if (!storyboard) { throw error(404, `Storyboard with ID ${storyboardId} not found.`); }
            const safeStoryboardName = storyboard.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'storyboard';
            console.log(`Storyboard name: ${storyboard.name}`);

            // 2. Fetch frames - OK
            console.log(`Fetching frames for storyboard ID: ${storyboardId}`);
            const frames: FrameData[] = await db.query.storyboardFrames.findMany({
                where: eq(storyboardFrames.storyboardId, storyboardId),
                orderBy: [asc(storyboardFrames.frameOrder)],
                columns: {
                    id: true, narrationAudioUrl: true, backgroundImageUrl: true, mainImageUrl: true,
                    bgmUrl: true, frameOrder: true, transitionTypeAfter: true, transitionDurationAfter: true
                }
             });
            if (!frames || frames.length === 0) { throw error(400, `No frames found...`); }
            console.log(`Found ${frames.length} frames.`);

            // Filter frames - OK
            const validFrames = frames.filter(f => f.narrationAudioUrl);
            if (validFrames.length === 0) { throw error(400, `No frames with narration found...`); }
            console.log(`Processing ${validFrames.length} frames with narration.`);

            let useTransitions = validFrames.some(f => f.transitionTypeAfter && f.transitionTypeAfter !== 'none') && validFrames.length > 1;
            console.log(`Transitions will be ${useTransitions ? 'ENABLED' : 'DISABLED'}.`);

            const segmentFiles: string[] = [];
            // We still need initial segment durations if using xfade offset correctly
            const segmentOriginalDurations: number[] = [];

            // 3. Generate ALL individual segments FIRST (using precision strategy)
            console.log("--- Generating Individual Segments ---");
            for (let i = 0; i < validFrames.length; i++) {
                const frame = validFrames[i];
                const frameLogPrefix = `SegmentGen ${i + 1}/${validFrames.length}:`;
                console.log(`${frameLogPrefix} Processing Frame ID ${frame.id.substring(0, 6)}...`);

                // --- Download assets & Get Duration ---
                const narrationFileName = `narration_${i}_${uuidv4()}.mp3`;
                const narrationPath = path.join(tempDir, narrationFileName);
                await downloadFile(frame.narrationAudioUrl!, narrationPath, eventFetch);

                let duration: number;
                try {
                    duration = await getAudioDuration(narrationPath); // Or getStreamDuration(narrationPath, 'audio')
                    if (!duration || duration <= 0) throw new Error(`Invalid duration: ${duration}`);
                    console.log(`${frameLogPrefix} Narration duration: ${duration}s`);
                    segmentOriginalDurations.push(duration); // Store original duration
                } catch (durationError: any) {
                     console.warn(`${frameLogPrefix} Error getting duration: ${durationError.message}. Disabling transitions.`);
                     useTransitions = false;
                     throw error(500, `Failed to get duration for frame ${i + 1}.`);
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

                // --- Segment Generation (Precision Filter Strategy) ---
                const segmentOutputFile = `segment_${i}_${uuidv4()}.ts`;
                const segmentOutputPath = path.join(tempDir, segmentOutputFile);

                const segmentCommandInputs: string[] = [];
                const inputMapping: { [key: string]: number } = {};
                let inputIndex = 0;
                 // --- Inputs ---
                if (bgImagePath) {
                    segmentCommandInputs.push('-loop', '1', '-r', '25', '-i', bgImagePath);
                    inputMapping['baseVideo'] = inputIndex++;
                } else {
                    segmentCommandInputs.push('-f', 'lavfi', '-i', `color=c=black:s=1280x720:r=25`);
                    inputMapping['baseVideo'] = inputIndex++;
                }
                if (mainImagePath) {
                    segmentCommandInputs.push('-i', mainImagePath); // No loop for static image
                    inputMapping['mainImage'] = inputIndex++;
                }
                segmentCommandInputs.push('-i', narrationPath);
                inputMapping['narration'] = inputIndex++;
                if (bgmPath) {
                    // Don't loop BGM input here; handle duration in filter if needed, or let amix cut it.
                    segmentCommandInputs.push('-i', bgmPath);
                    inputMapping['bgm'] = inputIndex++;
                 }

                // --- Build Filter Complex (Precision Strategy) ---
                const filterComplexParts: string[] = [];
                const baseVideoInputLabel = `[${inputMapping['baseVideo']}:v]`;
                const narrationInputLabel = `[${inputMapping['narration']}:a]`;
                const trimmedVideoLabel = '[v_trimmed]';
                const trimmedAudioLabel = '[a_trimmed]';
                // Use toFixed(3) for potentially better precision handling in filters
                filterComplexParts.push(`${baseVideoInputLabel}trim=duration=${duration.toFixed(3)},setpts=PTS-STARTPTS${trimmedVideoLabel}`);
                filterComplexParts.push(`${narrationInputLabel}atrim=duration=${duration.toFixed(3)},asetpts=PTS-STARTPTS${trimmedAudioLabel}`);
                let currentVideoLabel = trimmedVideoLabel;
                let currentAudioLabel = trimmedAudioLabel;
                if (mainImagePath && inputMapping['mainImage'] !== undefined) {
                    const mainImageInputLabel = `[${inputMapping['mainImage']}:v]`;
                    const scaledOverlayLabel = '[ovrl_scaled]';
                    const overlayOutputLabel = '[vid_overlayed]';
                    filterComplexParts.push(
                        `${mainImageInputLabel}scale=576:576${scaledOverlayLabel}`
                    );
                    filterComplexParts.push(
                        `${currentVideoLabel}${scaledOverlayLabel}overlay=x=352:y=72:shortest=0${overlayOutputLabel}`
                    );
                    currentVideoLabel = overlayOutputLabel;
                 }
                if (bgmPath && inputMapping['bgm'] !== undefined) {
                    const bgmInputLabel = `[${inputMapping['bgm']}:a]`;
                    const mixedAudioOutputLabel = '[audio_mixed]';
                    filterComplexParts.push(
                        `${currentAudioLabel}${bgmInputLabel}amix=inputs=2:duration=first:dropout_transition=1:weights='1 0.3'${mixedAudioOutputLabel}`
                    );
                    currentAudioLabel = mixedAudioOutputLabel;
                 }

                 // --- Assemble Final Segment Command ---
                const segmentCommandArgs: string[] = [ ...segmentCommandInputs ];
                segmentCommandArgs.push('-filter_complex', filterComplexParts.join(';'));
                segmentCommandArgs.push('-map', currentVideoLabel, '-map', currentAudioLabel);
                const segmentAudioCodecArgs = ['-c:a', 'aac', '-ar', '48000', '-b:a', '192k'];
                 segmentCommandArgs.push(
                     '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'stillimage',
                     '-pix_fmt', 'yuv420p',
                     '-r', '25', // <-- ADD EXPLICIT FRAME RATE HERE
                     ...segmentAudioCodecArgs,
                     // ---> ADD THIS LINE <---
                     '-t', duration.toFixed(3), // Explicitly set segment duration
                     // ---> END ADDITION <---
                     '-bsf:v', 'h264_mp4toannexb',
                     '-f', 'mpegts',
                    segmentOutputPath
                );


                console.log(`${frameLogPrefix} Executing FFmpeg segment command...`); // Log less verbosely here
                try {
                    await runFFmpeg(segmentCommandArgs.filter(Boolean) as string[]);
                    console.log(`${frameLogPrefix} Generated segment: ${segmentOutputPath}`);
                } catch(ffmpegError) {
                     console.error(`${frameLogPrefix} FFMPEG SEGMENT GENERATION FAILED: `, ffmpegError);
                     throw error(500, `FFmpeg failed for segment ${i + 1}.`);
                }

                // ---> Verification and Padding <---
                let finalSegmentPathForConcat = segmentOutputPath; // Default to original segment
                console.log(`${frameLogPrefix} Verifying and potentially padding segment duration...`);
                try {
                    const actualVideoDuration = await getStreamDuration(segmentOutputPath, 'video');
                    const actualAudioDuration = await getStreamDuration(segmentOutputPath, 'audio');
                    console.log(`${frameLogPrefix} Expected: ${duration.toFixed(3)}, Actual Video: ${actualVideoDuration.toFixed(3)}, Actual Audio: ${actualAudioDuration.toFixed(3)}`);

                    const durationDiff = actualVideoDuration - actualAudioDuration;
                    const paddingThreshold = 0.02; // Pad if audio is shorter by more than 20ms

                    if (actualVideoDuration > 0 && actualAudioDuration > 0 && durationDiff > paddingThreshold) {
                        console.warn(`${frameLogPrefix} Audio is shorter than video by ${durationDiff.toFixed(3)}s. Padding audio...`);
                        const paddedSegmentOutputFile = `segment_${i}_padded_${uuidv4()}.ts`;
                        const paddedSegmentOutputPath = path.join(tempDir, paddedSegmentOutputFile);

                        const paddingCommand = [
                            '-i', segmentOutputPath,
                            '-filter_complex', `[0:a]apad=pad_dur=${durationDiff.toFixed(3)}[aout]`, // Pad audio to match video
                            '-map', '0:v', // Map original video stream
                            '-map', '[aout]', // Map padded audio stream
                            '-c:v', 'copy', // Copy video stream directly
                            '-c:a', 'aac', '-ar', '48000', '-b:a', '192k', // Re-encode padded audio
                            '-bsf:v', 'h264_mp4toannexb', // Keep for TS
                            '-f', 'mpegts',
                            paddedSegmentOutputPath
                        ];

                        console.log(`${frameLogPrefix} Executing FFmpeg audio padding command...`);
                        await runFFmpeg(paddingCommand);
                        console.log(`${frameLogPrefix} Generated padded segment: ${paddedSegmentOutputPath}`);
                        finalSegmentPathForConcat = paddedSegmentOutputPath; // Use padded segment for concatenation

                        // Optional: Verify padded segment duration
                        // const paddedAudioDuration = await getStreamDuration(paddedSegmentOutputPath, 'audio');
                        // console.log(`${frameLogPrefix} Padded Audio Duration: ${paddedAudioDuration.toFixed(3)}`);

                    } else if (durationDiff < -paddingThreshold) {
                         console.warn(`${frameLogPrefix} Audio is LONGER than video by ${Math.abs(durationDiff).toFixed(3)}s. This might still cause issues. Using original segment.`);
                         // Note: Trimming audio here would be more complex and might cut actual sound.
                         // Padding is generally safer. If this warning appears frequently, investigate segment generation.
                    } else {
                         console.log(`${frameLogPrefix} Segment durations are within tolerance. Using original segment.`);
                    }

                } catch (probeError: any) {
                    console.error(`${frameLogPrefix} Failed to probe or pad segment duration: ${probeError.message}. Using original segment.`);
                    // Fallback to using the original, potentially problematic segment
                    finalSegmentPathForConcat = segmentOutputPath;
                 }

                segmentFiles.push(finalSegmentPathForConcat); // Add the chosen segment path (original or padded)
            } // End segment generation loop
            console.log("--- Finished Generating Individual Segments ---");


            // 4. Iterative Concatenation
            if (segmentFiles.length === 0) {
                throw error(500, `No valid video segments were generated.`);
            }

            console.log(`--- Starting Iterative Concatenation (${segmentFiles.length} segments) ---`);

            // Base case: If only one segment, it's the final video
            if (segmentFiles.length === 1) {
                console.log("Only one segment, copying to final output.");
                const finalOutputBase = `${safeStoryboardName}_unified_${uuidv4()}`;
                const tempTsPath = path.join(tempDir, `${finalOutputBase}.ts`); // Keep as .ts initially
                await fs.copyFile(segmentFiles[0], tempTsPath);

                // Convert the single TS to MP4
                 const finalMp4Path = path.join(tempDir, `${finalOutputBase}.mp4`);
                 console.log(`Converting single segment ${tempTsPath} to MP4: ${finalMp4Path}`);
                 try {
                     await runFFmpeg([
                         '-i', tempTsPath,
                         '-c', 'copy', // Try direct copy first
                         '-movflags', '+faststart',
                         finalMp4Path
                     ]);
                 } catch (copyError) {
                     console.warn(`Single segment copy to MP4 failed: ${copyError}. Re-encoding.`);
                     await runFFmpeg([
                         '-i', tempTsPath,
                         '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
                         '-c:a', 'aac', '-ar', '48000', '-b:a', '192k',
                         '-movflags', '+faststart',
                         finalMp4Path // Overwrite failed attempt
                     ]);
                 }
                 finalVideoPath = finalMp4Path; // Update final path

            } else {
                // Iterative case
                let currentResultPath = segmentFiles[0]; // Start with the first segment as the initial result

                for (let i = 1; i < segmentFiles.length; i++) {
                    const stepLogPrefix = `Concat Step ${i}/${segmentFiles.length - 1}:`;
                    const nextSegmentPath = segmentFiles[i];
                    // Keep intermediates as TS for consistency
                    const intermediateOutputPath = path.join(tempDir, `intermediate_${i}_${uuidv4()}.ts`);

                    console.log(`${stepLogPrefix} Combining '${path.basename(currentResultPath)}' + '${path.basename(nextSegmentPath)}' -> '${path.basename(intermediateOutputPath)}'`);

                    const inputs = ['-i', currentResultPath, '-i', nextSegmentPath];
                    let concatCommand: string[];

                    if (useTransitions) {
                        // --- Use xfade for joining this pair ---
                        const frameIndexForTransition = i - 1; // Transition *after* frame i-1 connects it to frame i
                        const transitionType = validFrames[frameIndexForTransition].transitionTypeAfter || 'none';
                        let safeTransitionType = validXfadeTransitions[transitionType] ? transitionType : 'fade';
                        let transitionDuration = validFrames[frameIndexForTransition].transitionDurationAfter ?? 1.0;

                        // Get duration of the FIRST input for offset calculation (the current intermediate result)
                        let previousDuration: number;
                        try {
                            // Probe the intermediate file (which might be .ts for step 1, .mp4 after)
                            previousDuration = await getStreamDuration(currentResultPath, 'video');
                            if (!previousDuration || previousDuration <= 0) throw new Error(`Invalid probed duration ${previousDuration}`);
                            console.log(`${stepLogPrefix} Duration of previous result (${path.basename(currentResultPath)}): ${previousDuration}s`);
                        } catch (e: any) {
                             console.error(`${stepLogPrefix} Failed to get duration for ${currentResultPath}. Cannot apply xfade offset correctly. Error: ${e.message}`);
                             // Use original duration as fallback, less accurate but better than failing?
                             previousDuration = segmentOriginalDurations[frameIndexForTransition];
                             console.warn(`${stepLogPrefix} Using original segment duration ${previousDuration}s as fallback for offset.`);
                             if (!previousDuration || previousDuration <= 0) {
                                 throw error(500, `Cannot determine duration of intermediate video ${currentResultPath} and fallback failed.`);
                             }
                        }


                        if (transitionDuration <= 0.01 || transitionType === 'none') { // Consider 0.01 a cut
                             safeTransitionType = 'fade'; // Use fade for cuts
                             transitionDuration = 0.001; // Make it almost instantaneous
                             console.log(`${stepLogPrefix} Simulating cut with instant fade.`);
                        } else if (transitionDuration >= previousDuration) {
                             console.warn(`${stepLogPrefix} Transition duration (${transitionDuration}s) >= previous duration (${previousDuration}s). Clamping.`);
                             transitionDuration = Math.max(0.01, previousDuration * 0.9); // Ensure > 0
                        }

                        const offset = Math.max(0, previousDuration - transitionDuration);
                        // Use acrossfade for audio when using xfade for video
                        const filterComplex = `[0:v][1:v]xfade=transition=${safeTransitionType}:duration=${transitionDuration.toFixed(3)}:offset=${offset.toFixed(3)}[vout];[0:a][1:a]acrossfade=d=${transitionDuration.toFixed(3)}:o=1[aout]`;

                        concatCommand = [
                            ...inputs,
                            '-filter_complex', filterComplex,
                            '-map', '[vout]', '-map', '[aout]',
                             // Output TS: Encoding needed, but no MP4 specific flags
                             '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
                             '-r', '25', // <-- ADD EXPLICIT FRAME RATE HERE
                             '-c:a', 'aac', '-ar', '48000', '-b:a', '192k',
                             '-bsf:v', 'h264_mp4toannexb', // Keep for TS
                             '-f', 'mpegts',             // Output TS
                            intermediateOutputPath
                        ];
                        console.log(`${stepLogPrefix} Using xfade: type=${safeTransitionType}, duration=${transitionDuration.toFixed(3)}, offset=${offset.toFixed(3)}`);

                    } else {
                        // --- Use concat filter (re-encoding, no transitions) ---
                        const filterComplex = `[0:v][1:v]concat=n=2:v=1:a=0[vout];[0:a][1:a]concat=n=2:v=0:a=1[aout]`;
                        concatCommand = [
                            ...inputs,
                            '-filter_complex', filterComplex,
                            '-map', '[vout]', '-map', '[aout]',
                             // Output TS: Encoding needed, but no MP4 specific flags
                             '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
                             '-r', '25', // <-- ADD EXPLICIT FRAME RATE HERE
                             '-c:a', 'aac', '-ar', '48000', '-b:a', '192k',
                             '-bsf:v', 'h264_mp4toannexb', // Keep for TS
                             '-f', 'mpegts',             // Output TS
                            intermediateOutputPath
                        ];
                        console.log(`${stepLogPrefix} Using concat filter (no transition).`);
                    }

                    console.log(`${stepLogPrefix} Executing FFmpeg iterative concat command...`);
                    console.log(`FFMPEG Iterative Concat: ffmpeg ${concatCommand.join(' ')}`); // Log the command
                    try {
                        await runFFmpeg(concatCommand);
                        console.log(`${stepLogPrefix} Successfully created intermediate: ${intermediateOutputPath}`);

                        // NOTE: withTemporaryDirectory handles cleanup. Manual deletion omitted for simplicity.

                        currentResultPath = intermediateOutputPath; // Update the path for the next iteration

                    } catch (concatError) {
                        console.error(`${stepLogPrefix} FAILED to concatenate step ${i}. Error:`, concatError);
                        throw error(500, `Failed during iterative concatenation at step ${i}. Check logs for details.`);
                    }
                }
                // After the loop, currentResultPath holds the path to the final combined video
                finalVideoPath = currentResultPath;
            }

            // 5. Final Output Preparation
            if (!finalVideoPath) {
                 throw new Error("Final video path was not set after concatenation.");
            }

            console.log(`--- Iterative Concatenation finished. Final TS video: ${finalVideoPath} ---`);

            // 5. Final Conversion to MP4
            const finalMp4Path = path.join(tempDir, `${safeStoryboardName}_final_${uuidv4()}.mp4`);
            console.log(`Converting final TS ${finalVideoPath} to MP4: ${finalMp4Path}`);
            try {
                await runFFmpeg([
                    '-i', finalVideoPath,
                    '-c', 'copy', // Try direct copy first, should be safe from TS->MP4
                    '-movflags', '+faststart',
                    finalMp4Path
                ]);
                console.log(`Successfully converted final TS to MP4 (copy).`);
            } catch (finalCopyError) {
                console.warn(`Final TS to MP4 copy failed: ${finalCopyError}. Re-encoding.`);
                      await runFFmpeg([
                          '-i', finalVideoPath,
                          '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
                          '-r', '25', // <-- ADD EXPLICIT FRAME RATE HERE
                          '-c:a', 'aac', '-ar', '48000', '-b:a', '192k',
                          '-movflags', '+faststart',
                          finalMp4Path // Overwrite failed attempt
                ]);
                 console.log(`Successfully converted final TS to MP4 (re-encode).`);
            }

            // 6. Read and return the final MP4 video
            console.log(`Reading final MP4 file: ${finalMp4Path}`);
            const videoData = await fs.readFile(finalMp4Path);
            console.log(`Read ${videoData.byteLength} bytes from final MP4 file.`);

            // 7. Return the video file
            console.log(`Returning video data in response...`);
            return new Response(videoData, {
                status: 200,
                headers: {
                    'Content-Type': 'video/mp4',
                    'Content-Disposition': `attachment; filename="${safeStoryboardName}_unified.mp4"`
                }
            });

        } catch (err: any) {
            console.error(`Error exporting unified storyboard ${storyboardId}:`, err);
            if (err.status && typeof err.status === 'number') { throw err; }
            throw error(500, `Failed to export unified storyboard ${storyboardId}: ${err.message}`);
        }
        // Cleanup by withTemporaryDirectory
    });
};
