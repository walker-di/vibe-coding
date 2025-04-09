// src/lib/types/canvasTemplate.types.ts

import type { CanvasAspectRatio } from '$lib/constants';

export interface CanvasTemplate {
	id: number;
	name: string;
	description: string | null;
	aspectRatio: CanvasAspectRatio | null; // Added
	resolution: string | null; // Added
	canvasData: string; // JSON string of fabric.js canvas data
	previewImageUrl: string | null;
	createdAt: number | Date; // Allow both timestamp and Date object
	updatedAt: number | Date | null; // Allow both timestamp and Date object, or null
}

// Type for the list view (excluding large canvasData)
export interface CanvasTemplateListItem {
	id: number;
	name: string;
	description: string | null;
	aspectRatio: CanvasAspectRatio | null; // Added
	resolution: string | null; // Added
	previewImageUrl: string | null;
	createdAt: number | Date;
	updatedAt: number | Date | null;
}
