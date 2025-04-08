import { db } from '$lib/server/db';
import { products } from '$lib/server/db/schema';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';

// GET /api/products - List all products
export const GET: RequestHandler = async () => {
	try {
		const allProducts = await db.select().from(products).orderBy(products.createdAt);
		return json(allProducts);
	} catch (err) {
		console.error('Error fetching products:', err);
		throw error(500, 'Internal Server Error');
	}
};

// POST /api/products - Create a new product
export const POST: RequestHandler = async ({ request }) => {
	let productData;
	try {
		productData = await request.json();
	} catch (err) {
		throw error(400, 'Invalid JSON');
	}

	// Basic validation
	if (!productData || typeof productData.name !== 'string' || productData.name.trim() === '') {
		throw error(400, 'Missing required field: name');
	}

	try {
		const newProduct = await db
			.insert(products)
			.values({
				name: productData.name.trim(),
				description: productData.description,
				imageUrl: productData.imageUrl,
				industry: productData.industry,
				overview: productData.overview,
				details: productData.details,
				featuresStrengths: productData.featuresStrengths
				// createdAt is handled by default
				// updatedAt is null initially
			})
			.returning();

		if (newProduct.length === 0) {
			throw error(500, 'Failed to create product');
		}

		return json(newProduct[0], { status: 201 });
	} catch (err) {
		console.error('Error creating product:', err);
		// Could add more specific error handling (e.g., unique constraints) if needed
		throw error(500, 'Internal Server Error');
	}
};
