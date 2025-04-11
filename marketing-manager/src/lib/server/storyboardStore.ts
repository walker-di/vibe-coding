// Simple in-memory store for storyboard frames and metadata
// In a real application, this would be replaced with a database

// Type definitions
interface Frame {
  id: string;
  narration: string;
  mainImagePrompt: string;
  imageUrl: string | null;
}

interface StoryboardMetadata {
  title: string;
  description: string;
}

interface StoryboardFrames {
  [storyboardId: string]: Frame[];
}

interface StoryboardMetadataStore {
  [storyboardId: string]: StoryboardMetadata;
}

// In-memory storage
let storyboardFrames: StoryboardFrames = {};
let storyboardMetadata: StoryboardMetadataStore = {};

// Store functions for frames
export function getFrames(storyboardId: string): Frame[] | null {
  return storyboardFrames[storyboardId] || null;
}

export function setFrames(storyboardId: string, frames: Frame[]): void {
  storyboardFrames[storyboardId] = frames;
}

// Store functions for metadata
export function getMetadata(storyboardId: string): StoryboardMetadata | null {
  return storyboardMetadata[storyboardId] || null;
}

export function setMetadata(storyboardId: string, metadata: StoryboardMetadata): void {
  storyboardMetadata[storyboardId] = metadata;
}

// Default professional frames for fallback
export function getDefaultFrames(): Frame[] {
  return [
    {
      id: '1',
      narration: 'Our product solves the key pain points that customers face every day.',
      mainImagePrompt: 'A professional showing the product in action, with a satisfied expression.',
      imageUrl: null
    },
    {
      id: '2',
      narration: 'With innovative features and intuitive design, it stands out from the competition.',
      mainImagePrompt: 'Close-up of the product highlighting its unique features with clean, professional lighting.',
      imageUrl: null
    },
    {
      id: '3',
      narration: 'Join thousands of satisfied customers and experience the difference today.',
      mainImagePrompt: 'A group of diverse, happy customers using the product in a modern setting.',
      imageUrl: null
    }
  ];
}

// Default metadata for fallback
export function getDefaultMetadata(): StoryboardMetadata {
  return {
    title: 'Professional Marketing Storyboard',
    description: 'A cohesive marketing narrative that effectively communicates value proposition.'
  };
}
