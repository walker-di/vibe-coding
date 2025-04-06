import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs/promises';
import path from 'path';

// Define the base directory for static assets
const STATIC_BASE_DIR = path.resolve('static'); // Assumes the process runs from the project root

// Define allowed asset types and their corresponding subdirectories
const ASSET_DIRS: { [key: string]: string } = {
    image: 'images',
    bgm: 'audio/bgm',
    // Add other types if needed in the future
};

export const GET: RequestHandler = async ({ url }) => {
    const assetType = url.searchParams.get('type');

    if (!assetType || !ASSET_DIRS[assetType]) {
        throw error(400, `Invalid or missing 'type' parameter. Allowed types: ${Object.keys(ASSET_DIRS).join(', ')}`);
    }

    const targetDir = ASSET_DIRS[assetType];
    const absoluteDir = path.join(STATIC_BASE_DIR, targetDir);
    const relativeBase = `/${targetDir.replace(/\\/g, '/')}`; // Base path for URLs (e.g., /images or /audio/bgm)

    console.log(`Listing assets of type '${assetType}' from directory: ${absoluteDir}`);

    try {
        // Check if directory exists
        try {
            await fs.access(absoluteDir);
        } catch (e) {
            console.warn(`Asset directory not found: ${absoluteDir}. Returning empty list.`);
            // If the directory doesn't exist, return an empty list gracefully
            return json({ assets: [] });
        }

        const dirents = await fs.readdir(absoluteDir, { withFileTypes: true });

        const files = dirents
            .filter(dirent => dirent.isFile()) // Only include files
            .map(dirent => `${relativeBase}/${dirent.name}`); // Construct relative URL path

        console.log(`Found assets for type '${assetType}':`, files);
        return json({ assets: files });

    } catch (err: any) {
        console.error(`Error listing assets in ${absoluteDir}:`, err);
        throw error(500, `Failed to list assets: ${err.message || 'Internal server error'}`);
    }
};
