import type { themes } from '$lib/server/db/schema';
import type { InferSelectModel } from 'drizzle-orm';

// Base type derived from schema
export type Theme = InferSelectModel<typeof themes>;

// Type for the data passed into forms (optional initial data)
export type ThemeInputData = Partial<Omit<Theme, 'id' | 'createdAt' | 'updatedAt'>>;

// Type for the payload submitted by forms
export type ThemePayload = Omit<Theme, 'id' | 'createdAt' | 'updatedAt'>;
