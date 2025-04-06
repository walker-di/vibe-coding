import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm'; // Import sql
import crypto from 'crypto'; // For generating UUIDs

// GET /api/projects - List all projects
export const GET: RequestHandler = async () => {
	try {
		const allProjects = await db.select().from(projects);
		return json(allProjects);
	} catch (e) {
		console.error('Error fetching projects:', e);
		throw error(500, 'Failed to fetch projects');
	}
};

// POST /api/projects - Create a new project
export const POST: RequestHandler = async ({ request }) => {
	let data;
	try {
		data = await request.json();
	} catch (e) {
		throw error(400, 'Invalid JSON body');
	}

	if (!data || typeof data.name !== 'string' || data.name.trim() === '') {
		throw error(400, 'Missing or invalid project name');
	}

	const newId = crypto.randomUUID();
	const projectName = data.name.trim();

	try {
		// Drizzle with better-sqlite3 returns the inserted row(s) when using .returning()
		// However, better-sqlite3 itself doesn't support RETURNING directly in the same way as Postgres.
		// We insert first, then select the newly created row.
		// Note: .returning() *does* work with drizzle-orm/node-postgres, drizzle-orm/postgres-js etc.
		// For SQLite, we'll insert and then immediately query by ID. This isn't perfectly atomic
		// but sufficient for this stage. A transaction could be used for more robustness.

		await db.insert(projects).values({
			id: newId,
			name: projectName
			// createdAt and updatedAt will use default values defined in the schema
		});

		// Fetch the newly created project to return it
		const newProject = await db
			.select()
			.from(projects)
			.where(sql`${projects.id} = ${newId}`)
			.limit(1);

		if (!newProject || newProject.length === 0) {
			throw new Error('Failed to retrieve newly created project');
		}

		return json(newProject[0], { status: 201 });
	} catch (e) {
		console.error('Error creating project:', e);
		// Consider more specific error handling (e.g., unique constraint violation) if needed
		throw error(500, `Failed to create project: ${e instanceof Error ? e.message : 'Unknown error'}`);
	}
};
