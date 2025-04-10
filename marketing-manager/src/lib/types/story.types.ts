import type { CanvasAspectRatio } from '$lib/constants';

// Story Types
export interface Story {
  id: number;
  creativeId: number;
  title: string;
  description: string | null;
  aspectRatio: CanvasAspectRatio; // Added
  resolution: string | null; // Added
  createdAt: number;
  updatedAt: number | null;
}

export interface Scene {
  id: number;
  storyId: number;
  bgmUrl: string | null;
  bgmName: string | null;
  description: string | null;
  orderIndex: number;
  createdAt: number;
  updatedAt: number | null;
}

export interface Clip {
  id: number;
  sceneId: number;
  canvas: string; // JSON string of fabric.js canvas data
  imageUrl: string | null; // URL for the generated preview image (can be null)
  narration: string | null;
  description: string | null;
  duration: number | null; // Duration in milliseconds
  orderIndex: number;
  createdAt: Date; // Expect Date object
  updatedAt: Date | null; // Expect Date object or null
}

// Relation Types
export interface StoryWithRelations extends Story {
  scenes?: SceneWithRelations[];
}

export interface SceneWithRelations extends Scene {
  clips?: Clip[];
}
