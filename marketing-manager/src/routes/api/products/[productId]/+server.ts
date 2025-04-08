import { db } from '$lib/server/db';
import { products } from '$lib/server/db/schema';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';

// GET /api/products/[productId] - Get a specific product
export const GET: RequestHandler = async ({ params }) => {
	const productId = parseInt(params.productId, 10);
	if (isNaN(productId)) {
		throw error(400, 'Invalid Product ID');
	}

	try {
		const product = await db.select().from(products).where(eq(products.id, productId));

		if (product.length === 0) {
			throw error(404, 'Product not found');
		}

		return json(product[0]);
	} catch (err: any) {
		// Catch specific 404 error from try block
		if (err.status === 404) {
			throw err;
		}
		console.error(`Error fetching product ${productId}:`, err);
		throw error(500, 'Internal Server Error');
	}
};

// PUT /api/products/[productId] - Update a specific product
export const PUT: RequestHandler = async ({ params, request }) => {
	const productId = parseInt(params.productId, 10);
	if (isNaN(productId)) {
		throw error(400, 'Invalid Product ID');
	}

	let productData;
	try {
		productData = await request.json();
	} catch (err) {
		throw error(400, 'Invalid JSON');
	}

	// Basic validation (ensure name is not being blanked out)
	if (productData.name !== undefined && (typeof productData.name !== 'string' || productData.name.trim() === '')) {
		throw error(400, 'Product name cannot be empty');
	}

	try {
		// Check if product exists first
		const existing = await db.select({ id: products.id }).from(products).where(eq(products.id, productId));
		if (existing.length === 0) {
			throw error(404, 'Product not found');
		}

		const updatedProduct = await db
			.update(products)
			.set({
				name: productData.name?.trim(), // Use optional chaining and trim
				description: productData.description,
				imageUrl: productData.imageUrl,
				industry: productData.industry,
				overview: productData.overview,
				details: productData.details,
				featuresStrengths: productData.featuresStrengths,
				updatedAt: new Date() // Manually set updatedAt timestamp
			})
			.where(eq(products.id, productId))
			.returning();

		if (updatedProduct.length === 0) {
			// This case should ideally be caught by the existence check above, but added for safety
			throw error(404, 'Product not found after update attempt');
		}

		return json(updatedProduct[0]);
	} catch (err: any) {
        // Catch specific 404 error from try block
		if (err.status === 404) {
			throw err;
		}
		console.error(`Error updating product ${productId}:`, err);
		throw error(500, 'Internal Server Error');
	}
};

// DELETE /api/products/[productId] - Delete a specific product
export const DELETE: RequestHandler = async ({ params }) => {
	const productId = parseInt(params.productId, 10);
	if (isNaN(productId)) {
		throw error(400, 'Invalid Product ID');
	}

	try {
        // Check if product exists first for a better 404 message
		const existing = await db.select({ id: products.id }).from(products).where(eq(products.id, productId));
		if (existing.length === 0) {
			throw error(404, 'Product not found');
		}

		const result = await db.delete(products).where(eq(products.id, productId)).returning({ id: products.id });

        // Drizzle returns the deleted row(s)
		if (result.length === 0) {
            // This indicates the product was deleted between the check and the delete operation, or another issue occurred.
			throw error(404, 'Product not found or could not be deleted');
		}

		return new Response(null, { status: 204 }); // No Content
	} catch (err: any) {
        // Catch specific 404 error from try block
		if (err.status === 404) {
			throw err;
		}
		console.error(`Error deleting product ${productId}:`, err);
		throw error(500, 'Internal Server Error');
	}
};
