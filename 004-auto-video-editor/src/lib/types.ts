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

// Types for Timeline Editor, based on README schema

export interface Clip {
	id: string; // Unique clip identifier (UUID)
	mediaId: string; // Foreign key to MediaItem (UUID)
	trackId: string; // Foreign key to Track (UUID)
	startTime: number; // Start time on the timeline (seconds)
	endTime: number; // End time on the timeline (seconds)
	sourceStartTime: number; // Start time within the original media (seconds)
	sourceEndTime: number; // End time within the original media (seconds)
}

export interface Track {
	id: string; // Unique track identifier (UUID)
	type: 'video' | 'audio';
	clips: Clip[];
}

export interface Timeline {
	projectId: string; // Foreign key to Project (UUID)
	tracks: Track[];
	totalDuration: number; // Calculated total duration of the timeline (seconds)
}
