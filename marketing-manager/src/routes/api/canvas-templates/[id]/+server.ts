import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { canvasTemplates } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { canvasAspectRatios } from '$lib/constants'; // Import aspect ratios for validation

// GET /api/canvas-templates/[id] - Fetch a single template (including canvasData)
export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		throw error(400, 'Invalid template ID');
	}

	try {
		const template = await db
			.select() // Select all fields
			.from(canvasTemplates)
			.where(eq(canvasTemplates.id, id))
			.limit(1);

		if (!template || template.length === 0) {
			throw error(404, 'Canvas template not found');
		}

		return json(template[0]);
	} catch (err: any) {
		console.error(`Error fetching canvas template ${id}:`, err);
		if (err.status) {
			throw err;
		}
		throw error(500, 'Failed to fetch canvas template');
	}
};

// PUT /api/canvas-templates/[id] - Update a template
export const PUT: RequestHandler = async ({ params, request }) => {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		throw error(400, 'Invalid template ID');
	}

	try {
		const body = await request.json();

		// Check if template exists first (optional but good practice)
		const existing = await db.select({ id: canvasTemplates.id }).from(canvasTemplates).where(eq(canvasTemplates.id, id)).limit(1);
		if (!existing || existing.length === 0) {
			throw error(404, 'Canvas template not found');
		}

		// Validate aspectRatio if provided
		if (body.aspectRatio && !canvasAspectRatios.includes(body.aspectRatio)) {
			throw error(400, `Invalid aspectRatio. Must be one of: ${canvasAspectRatios.join(', ')}`);
		}

		// Prepare update data - only include fields present in the body
		const updateData: Partial<{
			name: string;
			description: string | null;
			aspectRatio: typeof canvasAspectRatios[number]; // Use type from constants
			resolution: string | null;
			canvasData: string;
			previewImageUrl: string | null;
			updatedAt: Date;
		}> = {};
		if (body.name !== undefined) updateData.name = body.name;
		if (body.description !== undefined) updateData.description = body.description;
		if (body.aspectRatio !== undefined) updateData.aspectRatio = body.aspectRatio; // Added
		if (body.resolution !== undefined) updateData.resolution = body.resolution; // Added
		if (body.canvasData !== undefined) updateData.canvasData = body.canvasData;
		if (body.previewImageUrl !== undefined) updateData.previewImageUrl = body.previewImageUrl;

		// Don't update if no fields were provided (excluding updatedAt)
		if (Object.keys(updateData).length === 0) {
			return json(existing[0]); // Or throw a 400 Bad Request
		}

		// Add updatedAt timestamp
		updateData.updatedAt = new Date(); // Use current timestamp

		const result = await db
			.update(canvasTemplates)
			.set(updateData)
			.where(eq(canvasTemplates.id, id))
			.returning(); // Return the updated record

		if (!result || result.length === 0) {
			// This might happen if the ID was valid but the update failed for some reason
			throw error(500, 'Failed to update canvas template');
		}

		return json(result[0]);
	} catch (err: any) {
		console.error(`Error updating canvas template ${id}:`, err);
		if (err.status) {
			throw err;
		}
		// Handle potential unique constraint errors if name becomes unique later
		throw error(500, 'Failed to update canvas template');
	}
};

// DELETE /api/canvas-templates/[id] - Delete a template
export const DELETE: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		throw error(400, 'Invalid template ID');
	}

	try {
		// Check if template exists first
		const existing = await db.select({ id: canvasTemplates.id }).from(canvasTemplates).where(eq(canvasTemplates.id, id)).limit(1);
		if (!existing || existing.length === 0) {
			throw error(404, 'Canvas template not found');
		}

		await db.delete(canvasTemplates).where(eq(canvasTemplates.id, id));

		return new Response(null, { status: 204 }); // No content on successful delete
	} catch (err: any) {
		console.error(`Error deleting canvas template ${id}:`, err);
		if (err.status) {
			throw err;
		}
		throw error(500, 'Failed to delete canvas template');
	}
};
