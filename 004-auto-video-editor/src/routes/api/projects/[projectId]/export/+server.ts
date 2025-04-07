import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { db } from '$lib/server/db';
import { projects, media } from '$lib/server/db/schema'; // Corrected import
import { eq, asc, inArray } from 'drizzle-orm'; // Added inArray

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

		// The stored timeline is the full Timeline object: { projectId, tracks: [...], totalDuration }
		// We need to parse it, extract clips from all tracks, and sort them.
		let parsedTimeline: { tracks?: { clips?: { mediaId: string, startTime: number, [key: string]: any }[] }[] };
		try {
			parsedTimeline = JSON.parse(projectData[0].timeline);
			if (!parsedTimeline || !Array.isArray(parsedTimeline.tracks)) {
				throw new Error('Parsed timeline data does not contain a valid tracks array.');
			}
		} catch (e: any) {
			console.error("Failed to parse timeline JSON or invalid structure:", e);
			return json({ success: false, error: `Failed to parse timeline data: ${e.message}` }, { status: 500 });
		}

		// Flatten clips from all tracks and sort them by start time
		const allClips = parsedTimeline.tracks
			.flatMap(track => track.clips || []) // Handle potentially missing clips array on a track
			.sort((a, b) => (a.startTime ?? 0) - (b.startTime ?? 0));


		if (allClips.length === 0) {
			return json({ success: false, error: 'Timeline contains no clips' }, { status: 400 });
		}

		const mediaIds = allClips.map(clip => clip.mediaId);
		if (mediaIds.length === 0) {
			return json({ success: false, error: 'No media IDs found in timeline' }, { status: 400 });
		}

		// Fetch media paths for the IDs in the timeline
		const mediaData = await db.select({
				id: media.id,
				sourcePath: media.sourcePath
			})
			.from(media)
			.where(inArray(media.id, mediaIds));

		// Create a map for quick lookup
		const mediaPathMap = new Map(mediaData.map(m => [m.id, m.sourcePath]));

		// Reconstruct ordered list of paths based on the globally sorted clips
		const orderedFilePaths: string[] = [];
		for (const clip of allClips) {
			const filePath = mediaPathMap.get(clip.mediaId);
			if (filePath) {
				orderedFilePaths.push(filePath);
			} else {
				// This case should ideally not happen if media deletion cleans up the timeline,
				// but good to have a check.
				console.warn(`Media ID ${clip.mediaId} from sorted clips not found in media table.`);
				return json({ success: false, error: `Media file for clip with ID ${clip.mediaId} not found.` }, { status: 404 });
			}
		}

		if (orderedFilePaths.length === 0) {
			return json({ success: false, error: 'No valid media files found for the timeline clips' }, { status: 404 });
		}

		// --- 2. Prepare for FFmpeg ---
		const projectExportDir = path.join(baseExportsDir, projectId);
		await fs.mkdir(projectExportDir, { recursive: true });

		const outputFileName = `output_${Date.now()}.mp4`;
		const outputFilePath = path.join(projectExportDir, outputFileName);
		const outputUrl = `/exports/${projectId}/${outputFileName}`; // Relative URL for client

		// --- 3. Generate FFmpeg command (Simple Concatenation Example) ---
		// Create a temporary file list for ffmpeg concat demuxer
		const fileListPath = path.join(projectExportDir, `files_${Date.now()}.txt`);
		let fileListContent = '';
		for (const relativePath of orderedFilePaths) {
			// IMPORTANT: Assumes sourcePath are relative to 'static' directory based on schema comment
			// FFmpeg needs absolute paths or paths relative to where it's run.
			// Let's construct absolute paths based on the CWD.
			// Example sourcePath: '/uploads/projectId/filename.mp4' -> needs to become 'd:/.../static/uploads/projectId/filename.mp4'
			const absoluteMediaPath = path.resolve('static', relativePath.startsWith('/') ? relativePath.substring(1) : relativePath);
			// Escape single quotes in file paths for the list file
            const escapedPath = absoluteMediaPath.replace(/'/g, "'\\''");
			fileListContent += `file '${escapedPath}'\n`;
		}
		await fs.writeFile(fileListPath, fileListContent);

		const ffmpegArgs = [
			'-f', 'concat',    // Use the concat demuxer
			'-safe', '0',      // Allow unsafe file paths (needed for absolute paths)
			'-i', fileListPath,// Input file list
			'-c', 'copy',      // Copy codecs (faster, no re-encoding)
			outputFilePath     // Output file path
		];

		// --- 4. Execute FFmpeg ---
		console.log(`Executing FFmpeg for project ${projectId}: ffmpeg ${ffmpegArgs.join(' ')}`);
		const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

		// Wrap in a promise to await completion
		const ffmpegResult = await new Promise<{ success: boolean; error?: string }>((resolve) => {
			let stderrOutput = '';
			ffmpegProcess.stderr.on('data', (data) => {
				stderrOutput += data.toString();
				console.error(`FFmpeg stderr: ${data}`);
			});

			ffmpegProcess.on('close', (code) => {
				console.log(`FFmpeg process exited with code ${code}`);
				// Clean up the temporary file list
				fs.unlink(fileListPath).catch(err => console.error("Failed to delete temp file list:", err));

				if (code === 0) {
					resolve({ success: true });
				} else {
					resolve({ success: false, error: `FFmpeg failed with code ${code}. Output:\n${stderrOutput}` });
				}
			});

			ffmpegProcess.on('error', (err) => {
				console.error('Failed to start FFmpeg process:', err);
				// Clean up the temporary file list
				fs.unlink(fileListPath).catch(unlinkErr => console.error("Failed to delete temp file list:", unlinkErr));
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
