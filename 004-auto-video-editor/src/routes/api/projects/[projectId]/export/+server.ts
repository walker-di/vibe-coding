import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { db } from '$lib/server/db';
import { projects, media } from '$lib/server/db/schema'; // Corrected import
import { eq, asc, inArray } from 'drizzle-orm';
import type { Clip, Timeline, Track } from '$lib/types'; // Import Timeline and Track types

// Ensure the base exports directory exists
const baseExportsDir = path.resolve('static/exports');
await fs.mkdir(baseExportsDir, { recursive: true });

export const POST: RequestHandler = async ({ params }) => {
	const projectId = params.projectId;

	if (!projectId) {
		return json({ success: false, error: 'Project ID is required' }, { status: 400 });
	}

	try {
		// --- 1. Fetch project timeline and associated media ---
		const projectData = await db.select({
				timeline: projects.timeline
			})
			.from(projects)
			.where(eq(projects.id, projectId))
			.limit(1);

		if (!projectData || projectData.length === 0 || !projectData[0].timeline) {
			return json({ success: false, error: 'Project or timeline not found' }, { status: 404 });
		}

		// --- Parse Timeline and Validate ---
		let parsedTimeline: Timeline; // Explicitly type as Timeline
		try {
			// Cast the parsed object to Timeline after basic validation
			const rawParsed = JSON.parse(projectData[0].timeline);
			if (!rawParsed || !Array.isArray(rawParsed.tracks)) {
				throw new Error('Parsed timeline data does not contain a valid tracks array.');
			}
			// Add more checks if necessary before casting
			parsedTimeline = rawParsed as Timeline;

			// Optional: Deeper validation of the structure if needed
			if (!parsedTimeline.tracks.every(track => typeof track.id === 'string' && typeof track.type === 'string' && Array.isArray(track.clips))) {
				throw new Error('Parsed timeline data has invalid track structure.');
			}

		} catch (e: any) {
			console.error("Failed to parse or validate timeline JSON:", e);
			return json({ success: false, error: `Failed to parse or validate timeline data: ${e.message}` }, { status: 500 });
		}

		// --- Flatten, Validate, and Sort Clips ---
		// Find the first video track (or any track with clips as fallback)
		const videoTrack = parsedTimeline.tracks.find(t => t.type === 'video');
		if (!videoTrack || !videoTrack.clips || videoTrack.clips.length === 0) {
			const firstTrackWithClips = parsedTimeline.tracks.find(t => t.clips && t.clips.length > 0);
			if (!firstTrackWithClips || !firstTrackWithClips.clips) {
				return json({ success: false, error: 'Timeline contains no clips in any track' }, { status: 400 });
			}
			// Use the first track found if no specific video track is present
			console.warn("No 'video' track found, using first track with clips for export.");
			// allClips = firstTrackWithClips.clips.sort((a, b) => a.startTime - b.startTime);
            // Let's flatten and sort globally for now, simpler concat filter
            // This assumes a single output track is desired.
		}

        // Flatten all clips from all tracks and sort globally by timeline start time
        const allClips: Clip[] = parsedTimeline.tracks
            .flatMap(track => track.clips || [])
            .filter(clip => // Basic validation
                clip &&
                typeof clip.mediaId === 'string' &&
                typeof clip.startTime === 'number' &&
                typeof clip.endTime === 'number' &&
                typeof clip.sourceStartTime === 'number' &&
                typeof clip.sourceEndTime === 'number' &&
                clip.endTime > clip.startTime && // Basic duration check
                clip.sourceEndTime > clip.sourceStartTime // Basic source duration check
            )
            .sort((a, b) => a.startTime - b.startTime);


		if (allClips.length === 0) {
			return json({ success: false, error: 'Timeline contains no valid clips after filtering' }, { status: 400 });
		}

		// --- Fetch Media Data ---
		const mediaIds = [...new Set(allClips.map(clip => clip.mediaId))]; // Unique media IDs
		if (mediaIds.length === 0) {
			return json({ success: false, error: 'No media IDs found in valid clips' }, { status: 400 });
		}

		const mediaData = await db.select({
				id: media.id,
				sourcePath: media.sourcePath
			})
			.from(media)
			.where(inArray(media.id, mediaIds));

		const mediaPathMap = new Map(mediaData.map(m => [m.id, m.sourcePath]));

		// --- Map Clips to Absolute Paths and Input Indices ---
		const inputs: string[] = [];
		const inputMap = new Map<string, number>(); // Map mediaId to input index
		const clipsWithPaths: (Clip & { absolutePath: string; inputIndex: number })[] = [];

		for (const clip of allClips) {
			const relativePath = mediaPathMap.get(clip.mediaId);
			if (!relativePath) {
				console.warn(`Media ID ${clip.mediaId} from timeline not found in media table.`);
				return json({ success: false, error: `Media file for clip with ID ${clip.mediaId} not found.` }, { status: 404 });
			}

			const absolutePath = path.resolve('static', relativePath.startsWith('/') ? relativePath.substring(1) : relativePath);

			let inputIndex = inputMap.get(absolutePath);
			if (inputIndex === undefined) {
				inputIndex = inputs.length;
				inputs.push(absolutePath);
				inputMap.set(absolutePath, inputIndex);
			}

			clipsWithPaths.push({ ...clip, absolutePath, inputIndex });
		}

		if (clipsWithPaths.length === 0) {
			return json({ success: false, error: 'No valid media files could be mapped for the timeline clips' }, { status: 404 });
		}

		// --- 2. Prepare for FFmpeg ---
		const projectExportDir = path.join(baseExportsDir, projectId);
		await fs.mkdir(projectExportDir, { recursive: true });

		const outputFileName = `output_${Date.now()}.mp4`;
		const outputFilePath = path.join(projectExportDir, outputFileName);
		const outputUrl = `/exports/${projectId}/${outputFileName}`; // Relative URL for client

		// --- 3. Generate FFmpeg Complex Filtergraph Command ---
		let filterComplex = '';
		const segmentOutputs: string[] = []; // Store names like [v0][a0]

		clipsWithPaths.forEach((clip, index) => {
			const inputIndex = clip.inputIndex;
			const sourceDuration = clip.sourceEndTime - clip.sourceStartTime;

			// Trim video segment
			filterComplex += `[${inputIndex}:v]trim=start=${clip.sourceStartTime}:duration=${sourceDuration},setpts=PTS-STARTPTS[v${index}];`;
			// Trim audio segment
			filterComplex += `[${inputIndex}:a]atrim=start=${clip.sourceStartTime}:duration=${sourceDuration},asetpts=PTS-STARTPTS[a${index}];`;

			segmentOutputs.push(`[v${index}][a${index}]`);
		});

		// Concatenate all segments
		filterComplex += `${segmentOutputs.join('')}concat=n=${clipsWithPaths.length}:v=1:a=1[outv][outa]`;

		const ffmpegArgs: string[] = [];
		// Add inputs
		inputs.forEach(inputPath => {
			ffmpegArgs.push('-i', inputPath);
		});

		// Add filtergraph and mapping
		ffmpegArgs.push(
			'-filter_complex', filterComplex,
			'-map', '[outv]',
			'-map', '[outa]',
			// Add encoding options (example: h.264 video, aac audio)
			'-c:v', 'libx264',
			'-preset', 'medium', // encoding speed vs compression tradeoff
			'-crf', '23',       // quality setting (lower is better quality, larger file)
			'-c:a', 'aac',
			'-b:a', '128k',     // audio bitrate
			'-movflags', '+faststart', // Optimize for web streaming
			outputFilePath      // Output file path
		);


		// --- 4. Execute FFmpeg ---
		console.log(`Executing FFmpeg for project ${projectId}: ffmpeg ${ffmpegArgs.map(arg => arg.includes(' ') ? `"${arg}"` : arg).join(' ')}`); // Log command carefully
		const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

		// Wrap in a promise to await completion
		const ffmpegResult = await new Promise<{ success: boolean; error?: string }>((resolve) => {
			let stderrOutput = '';
			ffmpegProcess.stderr.on('data', (data) => {
				stderrOutput += data.toString();
				// Reduce noise: Only log significant FFmpeg output or errors
				// console.error(`FFmpeg stderr: ${data}`);
			});

			ffmpegProcess.on('close', (code) => {
				console.log(`FFmpeg process exited with code ${code}`);
				if (code === 0) {
					resolve({ success: true });
				} else {
					console.error(`FFmpeg failed. Full stderr:\n${stderrOutput}`); // Log full error on failure
					resolve({ success: false, error: `FFmpeg failed with code ${code}. Check server logs for details.` });
				}
			});

			ffmpegProcess.on('error', (err) => {
				console.error('Failed to start FFmpeg process:', err);
				console.error(`FFmpeg failed. Full stderr before error:\n${stderrOutput}`);
				resolve({ success: false, error: `Failed to start FFmpeg: ${err.message}` });
			});
		});


		// --- 5. Return result ---
		if (ffmpegResult.success) {
			return json({ success: true, url: outputUrl });
		} else {
			// Attempt to clean up potentially incomplete output file
			fs.unlink(outputFilePath).catch(err => console.error("Failed to delete incomplete output file:", err));
			return json({ success: false, error: ffmpegResult.error || 'Unknown FFmpeg error' }, { status: 500 });
		}

	} catch (error: any) {
		console.error(`Error exporting project ${projectId}:`, error);
		return json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
	}
};
