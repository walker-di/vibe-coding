// Define shared types here

export interface Project {
	id: string; // UUID
	name: string;
	createdAt: number; // Unix timestamp (milliseconds)
	updatedAt: number; // Unix timestamp (milliseconds)
	// userId?: string; // Optional
}
