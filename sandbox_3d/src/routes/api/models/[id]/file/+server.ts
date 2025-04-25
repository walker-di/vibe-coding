import { error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { uploadedModels } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

// GET /api/models/:id/file - Serve the actual model file
export const GET: RequestHandler = async ({ params }) => {
	const modelId = parseInt(params.id ?? '', 10);

	if (isNaN(modelId)) {
		throw error(400, 'Invalid model ID');
	}

	try {
		// Fetch model metadata from DB
		const model = await db.query.uploadedModels.findFirst({
			where: eq(uploadedModels.id, modelId),
		});

		if (!model || !model.storagePath) {
			throw error(404, 'Model not found');
		}

		// Construct the absolute path on the server
		// IMPORTANT: Ensure storagePath is validated or constrained to prevent path traversal.
		// Here, we assume storagePath is relative to the project root (e.g., 'static/uploads/models/model.glb')
		// and resolve it safely.
		const absoluteStoragePath = path.resolve(model.storagePath);

        // Security check: Ensure the resolved path is still within the intended uploads directory
        const uploadDirResolved = path.resolve('static/uploads/models');
        if (!absoluteStoragePath.startsWith(uploadDirResolved)) {
            console.error(`Attempted path traversal: ${model.storagePath} resolved to ${absoluteStoragePath}`);
            throw error(403, 'Forbidden');
        }


		// Read the file content
		const fileBuffer = await fs.readFile(absoluteStoragePath);

		// Determine Content-Type
		const contentType = model.mimeType || 'application/octet-stream';

		// Return the file content as a Response
		return new Response(fileBuffer, {
			status: 200,
			headers: {
				'Content-Type': contentType,
				'Content-Length': fileBuffer.length.toString(),
				// Optional: Add Content-Disposition for download behavior
				// 'Content-Disposition': `attachment; filename="${model.originalFilename}"`
				// 'Content-Disposition': `inline; filename="${model.originalFilename}"` // Suggest inline display
			},
		});

	} catch (err: any) {
		console.error(`Error serving model file ${modelId}:`, err);
		if (err.status) { // Re-throw errors from `error()`
			throw err;
		}
        if (err.code === 'ENOENT') { // Handle file not found on disk
            throw error(404, 'Model file not found on server');
        }
		throw error(500, 'Failed to serve model file');
	}
};
