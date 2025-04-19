import { json, error, type RequestHandler } from '@sveltejs/kit'; // Import RequestHandler directly
import { db } from '$lib/server/db';
import { uploadedModels } from '$lib/server/db/schema';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = path.resolve('static/uploads/models');

// Ensure the upload directory exists
await fs.mkdir(UPLOAD_DIR, { recursive: true });

// GET /api/models - List all uploaded models (metadata)
export const GET: RequestHandler = async () => {
	try {
		const models = await db.select().from(uploadedModels).orderBy(uploadedModels.createdAt);
		return json(models);
	} catch (err) {
		console.error('Error fetching models:', err);
		throw error(500, 'Failed to fetch models');
	}
};

// POST /api/models/upload - Upload a new 3D model
export const POST: RequestHandler = async ({ request }: { request: Request }) => { // Add type for request
	try {
		const formData = await request.formData();
		const file = formData.get('modelFile') as File | null; // Assuming the input name is 'modelFile'

		if (!file) {
			throw error(400, 'No file uploaded');
		}

		// Basic validation (can be expanded)
		if (!file.name || file.size === 0) {
			throw error(400, 'Invalid file');
		}
		// Add mime type validation if needed e.g., ['model/gltf-binary', 'model/obj']

		const originalFilename = file.name;
		const fileExtension = path.extname(originalFilename);
		const uniqueSuffix = crypto.randomBytes(8).toString('hex');
		const uniqueFilename = `${path.basename(originalFilename, fileExtension)}-${uniqueSuffix}${fileExtension}`;
		const storagePath = path.join(UPLOAD_DIR, uniqueFilename); // Store relative path? No, store absolute for fs ops, but maybe relative for serving? Let's stick to absolute for fs.
        const relativeStoragePath = path.join('static/uploads/models', uniqueFilename); // Path relative to project root for DB

		// Save the file
		const buffer = Buffer.from(await file.arrayBuffer());
		await fs.writeFile(storagePath, buffer);

		// Insert metadata into the database
		const [newModel] = await db
			.insert(uploadedModels)
			.values({
				name: path.basename(originalFilename, fileExtension), // Use base name as default name
				originalFilename: originalFilename,
				storagePath: relativeStoragePath, // Store the relative path for easier serving/management
				mimeType: file.type || 'application/octet-stream',
				size: file.size,
			})
			.returning();

		if (!newModel) {
			// Clean up saved file if DB insert fails
			await fs.unlink(storagePath).catch(console.error);
			throw error(500, 'Failed to save model metadata to database');
		}

		return json(newModel, { status: 201 });

	} catch (err: any) {
		console.error('Error uploading model:', err);
		// Handle specific errors thrown by `error()`
		if (err.status) {
			throw err;
		}
		throw error(500, 'Failed to upload model');
	}
};
