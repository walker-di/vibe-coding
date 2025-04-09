import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { canvasTemplates } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { canvasAspectRatios } from '$lib/constants'; // Import aspect ratios for validation

// GET /api/canvas-templates - Fetch all templates (basic info)
export const GET: RequestHandler = async () => {
	try {
		const templates = await db
			.select({
				id: canvasTemplates.id,
				name: canvasTemplates.name,
				description: canvasTemplates.description,
				aspectRatio: canvasTemplates.aspectRatio, // Added
				resolution: canvasTemplates.resolution, // Added
				previewImageUrl: canvasTemplates.previewImageUrl,
				createdAt: canvasTemplates.createdAt,
				updatedAt: canvasTemplates.updatedAt
			})
			.from(canvasTemplates)
			.orderBy(desc(canvasTemplates.createdAt)); // Or order by name, etc.

		return json(templates);
	} catch (err) {
		console.error('Error fetching canvas templates:', err);
		throw error(500, 'Failed to fetch canvas templates');
	}
};

// POST /api/canvas-templates - Create a new template
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		// Basic validation
		if (!body.name || !body.canvasData) {
			throw error(400, 'Missing required fields: name and canvasData');
		}
		// Validate aspectRatio if provided
		if (body.aspectRatio && !canvasAspectRatios.includes(body.aspectRatio)) {
			throw error(400, `Invalid aspectRatio. Must be one of: ${canvasAspectRatios.join(', ')}`);
		}

		const newTemplateData = {
			name: body.name,
			description: body.description ?? null,
			aspectRatio: body.aspectRatio ?? '16:9', // Default if not provided
			resolution: body.resolution ?? null, // Allow null
			canvasData: body.canvasData, // Expecting JSON string
			previewImageUrl: body.previewImageUrl ?? null,
			// createdAt is handled by default
			updatedAt: null // Explicitly set updatedAt to null on creation
		};

		const result = await db.insert(canvasTemplates).values(newTemplateData).returning();

		if (!result || result.length === 0) {
			throw error(500, 'Failed to create canvas template');
		}

		return json(result[0], { status: 201 }); // Return the created template
	} catch (err: any) {
		console.error('Error creating canvas template:', err);
		// Handle potential specific Drizzle/DB errors if needed
		if (err.status) {
			// Re-throw errors with status (like validation error)
			throw err;
		}
		throw error(500, 'Failed to create canvas template');
	}
};
