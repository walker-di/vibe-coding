// Define shared types here

export interface Project {
	id: string; // UUID
	name: string;
	createdAt: number; // Unix timestamp (milliseconds)
	updatedAt: number; // Unix timestamp (milliseconds)
	// userId?: string; // Optional
}

// Type for media items, matching the structure used in MediaLibrary and the API response
export interface MediaItem {
	id: string; // UUID
	projectId: string; // Foreign key
	name: string;
	type: 'video' | 'audio';
	sourcePath: string; // Path relative to static dir (e.g., /uploads/projectId/...)
	duration?: number | null; // Duration in seconds
	uploadedAt: number; // Unix timestamp (milliseconds)
	// thumbnailUrl?: string; // Optional: Could be generated/added later
	// metadata?: any; // Optional
}
