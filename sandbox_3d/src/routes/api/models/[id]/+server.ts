import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { uploadedModels } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

// DELETE /api/models/:id - Delete an uploaded model
export const DELETE: RequestHandler = async ({ params }) => {
	const modelId = parseInt(params.id ?? '', 10);

	if (isNaN(modelId)) {
		throw error(400, 'Invalid model ID');
	}

	try {
		// Find the model first to get its storage path
		const model = await db.query.uploadedModels.findFirst({
			where: eq(uploadedModels.id, modelId),
		});

		if (!model) {
			throw error(404, 'Model not found');
		}

		// Delete the database record
		const deleteResult = await db.delete(uploadedModels).where(eq(uploadedModels.id, modelId)).returning({ id: uploadedModels.id });

		if (deleteResult.length === 0) {
			// Should not happen if findFirst succeeded, but good practice to check
			throw error(404, 'Model not found during delete operation');
		}

		// If DB deletion was successful, attempt to delete the file
		if (model.storagePath) {
			try {
                const absoluteStoragePath = path.resolve(model.storagePath);

                // Security check: Ensure the resolved path is within the intended uploads directory
                const uploadDirResolved = path.resolve('static/uploads/models');
                if (!absoluteStoragePath.startsWith(uploadDirResolved)) {
                    console.error(`Attempted path traversal during delete: ${model.storagePath} resolved to ${absoluteStoragePath}`);
                    // Log this, but proceed with returning success as the DB record is gone.
                    // Alternatively, throw a 500 error if strict consistency is required.
                } else {
				    await fs.unlink(absoluteStoragePath);
                }
			} catch (unlinkError: any) {
				// Log the error but don't fail the request if the DB entry is gone
				if (unlinkError.code !== 'ENOENT') { // Ignore 'file not found' errors
					console.error(`Error deleting model file ${model.storagePath}:`, unlinkError);
                    // Optionally, you could re-insert the DB record or mark it as orphaned here
                    // depending on desired consistency level. For now, we prioritize removing the DB record.
				}
			}
		}

		// Return success
		return json({ message: `Model ${modelId} deleted successfully` }, { status: 200 }); // Or return new Response(null, { status: 204 });

	} catch (err: any) {
		console.error(`Error deleting model ${modelId}:`, err);
		if (err.status) { // Re-throw errors from `error()`
			throw err;
		}
		throw error(500, 'Failed to delete model');
	}
};
