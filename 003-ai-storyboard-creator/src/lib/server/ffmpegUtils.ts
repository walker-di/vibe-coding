import { spawn } from 'child_process';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import os from 'os';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { v4 as uuidv4 } from 'uuid'; // Keep for potential future use in helpers

// Helper to download a file using stream pipeline
export async function downloadFile(url: string, destPath: string, fetchFn: typeof fetch): Promise<void> {
    console.log(`Attempting to download: ${url} to ${destPath}`);
    let response: Response | null = null;
    try {
        response = await fetchFn(url);
        console.log(`Download response status for ${url}: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            let errorBody = '';
            try { errorBody = await response.text(); } catch (e) { /* Ignore */ }
            throw new Error(`Status ${response.status}: ${response.statusText}. Body: ${errorBody}`);
        }
        if (!response.body) {
            throw new Error(`Response body missing`);
        }

        await pipeline(
            Readable.fromWeb(response.body as import('node:stream/web').ReadableStream<Uint8Array>),
            createWriteStream(destPath)
        );
        console.log(`Successfully downloaded and saved ${url} to ${destPath}`);

    } catch (downloadError: any) {
        console.error(`Error downloading ${url}:`, downloadError);
        const statusText = response ? `${response.status} ${response.statusText}` : 'N/A';
        throw new Error(`Download failed for ${url} (Status: ${statusText}): ${downloadError.message}`);
    }
}

// Helper to run FFmpeg
export function runFFmpeg(args: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
        console.log('Executing FFmpeg with args:', args.join(' '));
        // Ensure ffmpeg is in PATH or provide full path if necessary
        const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg'; // Allow overriding via env var
        const ffmpegProcess = spawn(ffmpegPath, args, { stdio: 'pipe' });

        let stdout = '';
        let stderr = '';

        ffmpegProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        ffmpegProcess.stderr.on('data', (data) => {
            stderr += data.toString();
            console.log(`FFmpeg stderr: ${data.toString()}`);
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
            reject(new Error(`Failed to start FFmpeg: ${err.message}. Is FFmpeg installed and in PATH (or FFMPEG_PATH set)?`));
        });
    });
}

// Helper to run ffprobe and get duration
export async function getAudioDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
        const args = [
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            filePath
        ];
        console.log('Executing ffprobe with args:', args.join(' '));
        // Ensure ffprobe is in PATH or provide full path if necessary
        const ffprobePath = process.env.FFPROBE_PATH || 'ffprobe'; // Allow overriding via env var
        const ffprobeProcess = spawn(ffprobePath, args, { stdio: 'pipe' });

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
                    if (isNaN(duration) || duration <= 0) { // Add check for non-positive duration
                         reject(new Error(`ffprobe output was not a valid positive number: ${stdout.trim()}`));
                    } else {
                         resolve(duration);
                    }
                } catch (parseError) {
                     reject(new Error(`Failed to parse ffprobe duration output: ${stdout.trim()}. Error: ${parseError}`));
                }
            } else {
                reject(new Error(`ffprobe exited with code ${code}. Stderr: ${stderr || 'No stderr output'}`)); // Include stderr in error
            }
        });

         ffprobeProcess.on('error', (err) => {
            console.error('Failed to start ffprobe process:', err);
            reject(new Error(`Failed to start ffprobe: ${err.message}. Is ffprobe installed and in PATH (or FFPROBE_PATH set)?`));
        });
    });
}

// Helper for temporary directory management and cleanup
export async function withTemporaryDirectory<T>(prefix: string, operation: (tempDir: string) => Promise<T>): Promise<T> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
    console.log(`Created temporary directory: ${tempDir}`);
    try {
        return await operation(tempDir);
    } finally {
        console.log(`Cleaning up temporary directory: ${tempDir}`);
        try {
            await fs.rm(tempDir, { recursive: true, force: true }); // Use fs.rm for robustness
            console.log(`Removed temporary directory: ${tempDir}`);
        } catch (cleanupErr: any) {
            console.warn(`Failed to remove temporary directory ${tempDir}: ${cleanupErr.message}`);
            // Log cleanup errors but don't fail the main operation because of them
        }
    }
}
