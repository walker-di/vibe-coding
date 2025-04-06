import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Define allowed asset types and their corresponding directories and web paths
const assetConfig = {
    image: {
        dir: path.resolve('static/images'), // Absolute path to save directory
        webPath: '/images',                 // Base web path
        allowedMimeTypes: /^image\/(png|jpeg|jpg|gif|webp)$/ // Allowed image MIME types
    },
    bgm: {
        dir: path.resolve('static/audio/bgm'), // Absolute path to save directory
        webPath: '/audio/bgm',                 // Base web path
        allowedMimeTypes: /^audio\/(mpeg|mp3|wav|ogg|aac)$/ // Allowed audio MIME types
    }
};

export const POST: RequestHandler = async ({ request }) => {
    let formData;
    try {
        formData = await request.formData();
    } catch (e) {
        console.error("Failed to parse FormData:", e);
        throw error(400, 'Invalid request format. Expected FormData.');
    }

    const file = formData.get('file') as File | null;
    const assetType = formData.get('assetType') as keyof typeof assetConfig | null;

    // --- Validation ---
    if (!file) {
        throw error(400, 'Missing file in request data.');
    }
    if (!assetType || !(assetType in assetConfig)) {
        throw error(400, `Invalid or missing assetType. Must be one of: ${Object.keys(assetConfig).join(', ')}`);
    }

    const config = assetConfig[assetType];

    // Validate MIME type
    if (!config.allowedMimeTypes.test(file.type)) {
        throw error(400, `Invalid file type: ${file.type}. Allowed types for ${assetType}: ${config.allowedMimeTypes}`);
    }

    // --- File Processing ---
    try {
        // Ensure the target directory exists
        await fs.mkdir(config.dir, { recursive: true });

        // Generate a unique filename (e.g., timestamp-randombytes.extension)
        const fileExtension = path.extname(file.name) || `.${file.type.split('/')[1]}`; // Get extension or derive from MIME
        const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const uniqueFilename = `${uniqueSuffix}${fileExtension}`;
        const savePath = path.join(config.dir, uniqueFilename);
        const webFilePath = `${config.webPath}/${uniqueFilename}`; // Path to return to client

        // Read the file buffer and write it to the destination
        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(savePath, buffer);

        console.log(`Successfully uploaded ${assetType} to ${savePath}. Web path: ${webFilePath}`);

        // Return the web-accessible path
        return json({ filePath: webFilePath });

    } catch (err: any) {
        console.error(`Error processing upload for ${assetType}:`, err);
        // Handle potential file system errors
        if (err.code === 'ENOENT') {
             throw error(500, `Server configuration error: Directory not found at ${config.dir}`);
        }
        throw error(500, `Failed to upload file: ${err.message || 'Internal server error'}`);
    }
};
