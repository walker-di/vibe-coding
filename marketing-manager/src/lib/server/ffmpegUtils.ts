import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { promisify } from 'util';
import os from 'os';
import fetch from 'node-fetch';

const execPromise = promisify(exec);

/**
 * Run an FFmpeg command with the given arguments
 */
export async function runFFmpeg(args: string[]): Promise<string> {
    // For complex filter graphs, we need more detailed logging
    // Check if we're using a complex filter
    const hasComplexFilter = args.includes('-filter_complex');

    // Set appropriate log level based on command complexity
    const logLevel = hasComplexFilter ? 'info' : 'warning';

    // Add -hide_banner to reduce noise in logs
    // Always include -y to overwrite output files without asking
    const command = `ffmpeg -y -hide_banner -loglevel ${logLevel} ${args.join(' ')}`;

    // Log a shortened version of the command for readability
    let logCommand = command;
    if (command.length > 500) {
        logCommand = command.substring(0, 500) + '... [truncated]';
    }
    console.log(`Running FFmpeg command: ${logCommand}`);

    try {
        const { stdout, stderr } = await execPromise(command);
        if (stderr && stderr.trim().length > 0) {
            // Log stderr but truncate if it's too long
            let logStderr = stderr;
            if (stderr.length > 1000) {
                logStderr = stderr.substring(0, 1000) + '... [truncated]';
            }
            console.log(`FFmpeg stderr: ${logStderr}`);
        }
        return stdout;
    } catch (error: any) {
        // Log the full error for debugging
        console.error(`FFmpeg error: ${error.message}`);
        if (error.stderr) {
            // Log stderr but truncate if it's too long
            let logStderr = error.stderr;
            if (error.stderr.length > 1000) {
                logStderr = error.stderr.substring(0, 1000) + '... [truncated]';
            }
            console.error(`FFmpeg stderr: ${logStderr}`);
        }
        throw new Error(`FFmpeg command failed: ${error.message}`);
    }
}

/**
 * Get the duration of an audio file
 */
export async function getAudioDuration(audioPath: string): Promise<number> {
    try {
        const { stdout } = await execPromise(
            `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
        );
        const duration = parseFloat(stdout.trim());
        return isNaN(duration) ? 0 : duration;
    } catch (error: any) {
        console.error(`Error getting audio duration: ${error.message}`);
        return 0;
    }
}

/**
 * Download a file from a URL to a local path
 * Handles both absolute and relative URLs
 */
export async function downloadFile(url: string, outputPath: string): Promise<void> {
    try {
        // Check if the URL is relative (starts with / or doesn't have a protocol)
        if (url.startsWith('/') || !url.match(/^[a-z]+:\/\//i)) {
            // For relative URLs, read from the local filesystem
            // Assuming the URL is relative to the static directory
            const staticDir = path.resolve(process.cwd(), 'static');
            const filePath = path.join(staticDir, url.startsWith('/') ? url.substring(1) : url);

            try {
                const fileContent = await fs.readFile(filePath);
                await fs.writeFile(outputPath, fileContent);
                console.log(`Copied local file from ${filePath} to ${outputPath}`);
                return;
            } catch (fsError) {
                console.error(`Error reading local file ${filePath}:`, fsError);
                throw new Error(`Failed to read local file: ${url}`);
            }
        }

        // Handle absolute URLs with fetch
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
        }

        const buffer = await response.buffer();
        await fs.writeFile(outputPath, buffer);
        console.log(`Downloaded file from ${url} to ${outputPath}`);
    } catch (error: any) {
        console.error(`Error downloading file: ${error.message}`);
        throw error;
    }
}

/**
 * Create a temporary directory and execute a function with it
 * The directory will be cleaned up after the function completes
 */
export async function withTemporaryDirectory<T>(
    prefix: string,
    fn: (tempDir: string) => Promise<T>
): Promise<T> {
    const tempDir = path.join(os.tmpdir(), `${prefix}${uuidv4()}`);

    try {
        await fs.mkdir(tempDir, { recursive: true });
        console.log(`Created temporary directory: ${tempDir}`);

        const result = await fn(tempDir);
        return result;
    } finally {
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
            console.log(`Removed temporary directory: ${tempDir}`);
        } catch (error) {
            console.error(`Failed to remove temporary directory ${tempDir}:`, error);
        }
    }
}
