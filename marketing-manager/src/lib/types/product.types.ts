import type { products } from '$lib/server/db/schema';
import type { InferSelectModel } from 'drizzle-orm';

// Base type derived from schema
export type Product = InferSelectModel<typeof products>;

// Type for the data passed into forms (optional initial data)
export type ProductInputData = Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>;

// Type for the payload submitted by forms
export type ProductPayload = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
