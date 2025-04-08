import type { videoTemplates } from '$lib/server/db/schema';
import type { InferSelectModel } from 'drizzle-orm';
import { videoFormats } from '$lib/components/constants'; // Import for aspectRatio type

// Base type derived from schema
export type VideoTemplate = InferSelectModel<typeof videoTemplates>;

// Type for the data passed into forms (optional initial data)
export type VideoTemplateInputData = Partial<Omit<VideoTemplate, 'id' | 'createdAt' | 'updatedAt' | 'recommendedPlatforms'>> & {
	recommendedPlatforms?: string[] | null; // Expect array for initial data
};

// Type for the payload submitted by forms
export type VideoTemplatePayload = Omit<VideoTemplate, 'id' | 'createdAt' | 'updatedAt' | 'aspectRatio'> & {
	aspectRatio: typeof videoFormats[number] | null; // Use type derived from constant
};
