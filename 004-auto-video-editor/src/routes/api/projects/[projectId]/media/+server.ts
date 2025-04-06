import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { media, projects } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '$env/dynamic/private'; // To potentially get base upload path if needed

// Define the base directory for uploads relative to the project root
// Ensure this matches the .gitignore entry (/static/uploads/)
const UPLOAD_DIR_BASE = path.resolve('static/uploads');

// Ensure the base upload directory exists
await fs.mkdir(UPLOAD_DIR_BASE, { recursive: true });

// GET /api/projects/[projectId]/media - List media for a project
export const GET: RequestHandler = async ({ params }) => {
	const projectId = params.projectId;

	if (!projectId) {
		throw error(400, 'Project ID is required');
	}

	try {
		// Verify project exists (optional but good practice)
		const projectExists = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).limit(1);
		if (projectExists.length === 0) {
			throw error(404, 'Project not found');
		}

		const projectMedia = await db.select().from(media).where(eq(media.projectId, projectId));
		return json(projectMedia);

	} catch (e: any) {
		// Handle specific errors like 404 or re-throw others
		if (e.status === 404) {
			throw e;
		}
		console.error(`Error fetching media for project ${projectId}:`, e);
		throw error(500, 'Failed to fetch media');
	}
};


// POST /api/projects/[projectId]/media - Upload media file(s)
export const POST: RequestHandler = async ({ request, params }) => {
	const projectId = params.projectId;

	if (!projectId) {
		throw error(400, 'Project ID is required');
	}

	// Verify project exists before uploading
	try {
		const projectExists = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).limit(1);
		if (projectExists.length === 0) {
			throw error(404, 'Project not found');
		}
	} catch (e) {
		console.error(`Error verifying project ${projectId}:`, e);
		throw error(500, 'Failed to verify project');
	}

	const formData = await request.formData();
	const files = formData.getAll('files') as File[]; // Assuming input name is 'files'

	if (!files || files.length === 0) {
		throw error(400, 'No files provided');
	}

	const projectUploadDir = path.join(UPLOAD_DIR_BASE, projectId);
	await fs.mkdir(projectUploadDir, { recursive: true }); // Ensure project-specific dir exists

	const createdMediaRecords = [];

	for (const file of files) {
		if (!(file instanceof File)) {
			console.warn('Skipping non-file entry in form data');
			continue;
		}

		try {
			const fileBuffer = Buffer.from(await file.arrayBuffer());
			const fileExtension = path.extname(file.name);
			// Sanitize filename or generate a unique one
			const safeFilenameBase = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(fileExtension, '');
			// Basic uniqueness - consider adding timestamp or hash for robustness
			const uniqueFilename = `${safeFilenameBase}_${Date.now()}${fileExtension}`;
			const filePath = path.join(projectUploadDir, uniqueFilename);
			const relativePath = `/uploads/${projectId}/${uniqueFilename}`; // Path relative to static dir

			await fs.writeFile(filePath, fileBuffer);

			// Determine media type (basic check)
			let mediaType: 'video' | 'audio' = 'video'; // Default assumption
			if (file.type.startsWith('audio/')) {
				mediaType = 'audio';
			} else if (!file.type.startsWith('video/')) {
				// If not explicitly audio or video, log a warning or handle differently
				console.warn(`Uploaded file "${file.name}" has unexpected MIME type: ${file.type}. Assuming video.`);
			}

			const newMediaId = crypto.randomUUID();

			// Insert into database
			const inserted = await db.insert(media).values({
				id: newMediaId,
				projectId: projectId,
				name: file.name, // Store original filename
				type: mediaType,
				sourcePath: relativePath, // Store relative path for serving
				// duration: null // TODO: Extract duration later if needed
			}).returning(); // SQLite might not support returning well here, adjust if needed

			// If returning() doesn't work reliably with better-sqlite3, query separately
			const newRecord = inserted[0] ?? (await db.select().from(media).where(eq(media.id, newMediaId)).limit(1))[0];

			if (newRecord) {
				createdMediaRecords.push(newRecord);
			} else {
				// Handle case where record wasn't created or retrieved
				console.error(`Failed to retrieve record for uploaded file: ${file.name}`);
				// Optionally: attempt to delete the saved file if DB insert failed
				await fs.unlink(filePath).catch(err => console.error(`Failed to cleanup file ${filePath}:`, err));
				// Don't throw error for the whole batch, just log this one failed
			}

		} catch (e) {
			console.error(`Error processing file ${file.name}:`, e);
			// Decide if one file failure should stop the whole batch
			// For now, log and continue
		}
	}

	if (createdMediaRecords.length === 0 && files.length > 0) {
		throw error(500, 'Failed to process any uploaded files.');
	}

	return json(createdMediaRecords, { status: 201 });
};
