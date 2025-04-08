// Story Types
export interface Story {
  id: number;
  creativeId: number;
  title: string;
  description: string | null;
  createdAt: number;
  updatedAt: number | null;
}

export interface Scene {
  id: number;
  storyId: number;
  bgmUrl: string | null;
  bgmName: string | null;
  orderIndex: number;
  createdAt: number;
  updatedAt: number | null;
}

export interface Clip {
  id: number;
  sceneId: number;
  canvas: string; // JSON string of fabric.js canvas data
  narration: string | null;
  orderIndex: number;
  createdAt: number;
  updatedAt: number | null;
}

// Relation Types
export interface StoryWithRelations extends Story {
  scenes?: SceneWithRelations[];
}

export interface SceneWithRelations extends Scene {
  clips?: Clip[];
}
