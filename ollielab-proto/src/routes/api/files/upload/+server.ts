import { json, error, fail } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeFile, mkdir } from 'node:fs/promises'; // Import mkdir
import { env } from '$env/dynamic/private';
import { createId } from '@paralleldrive/cuid2';

// Configure storage path to use static/uploads
const UPLOAD_DIR = env.UPLOAD_DIR || 'static/uploads';

export const POST: RequestHandler = async ({ request, locals }) => {
	// --- Authentication Check (using locals populated by hooks.server.ts) ---
	if (!locals.session || !locals.user) {
		throw error(401, 'Unauthorized: You must be logged in to upload files.');
	}
	// const userId = locals.user.id; // Optional: use userId for organizing uploads

	// --- File Handling ---
	const formData = await request.formData();
	const file = formData.get('file') as File | null; // Assuming the file input name is 'file'

	if (!file || !(file instanceof File)) {
		return fail(400, { message: 'No file uploaded or invalid file format.' });
	}

	// --- TODO: Add File Validation ---
	// - Check file type (e.g., allow only video/mp4, video/webm)
	// - Check file size limit

	console.log(`Received file: ${file.name}, Size: ${file.size}, Type: ${file.type}`);

	// --- Storage Logic (Example: Local Disk) ---
	// In production, you'd likely use cloud storage (S3, GCS, Azure Blob Storage).
	try {
		const fileExtension = file.name.split('.').pop() || 'tmp';
		const uniqueFilename = `${createId()}.${fileExtension}`;
		const uploadPath = `${UPLOAD_DIR}/${uniqueFilename}`;

		// Ensure the upload directory exists
		await mkdir(UPLOAD_DIR, { recursive: true });

		console.log(`Attempting to save file to: ${uploadPath}`);

		// Convert File blob to Buffer for writing
		const buffer = Buffer.from(await file.arrayBuffer());
		await writeFile(uploadPath, buffer);

		console.log(`File saved successfully: ${uploadPath}`);

		// Return the URL or path to the saved file
		// Since it's in static/, it should be directly accessible relative to the base URL
		const fileUrl = `/uploads/${uniqueFilename}`; // Path relative to static/

		return json({ success: true, url: fileUrl }, { status: 201 });

	} catch (err) {
		console.error('Error saving uploaded file:', err);
		throw error(500, 'Internal Server Error: Failed to save uploaded file.');
	}
};
