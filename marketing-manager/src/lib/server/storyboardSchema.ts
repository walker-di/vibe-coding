// Schema definition for storyboard scenes and clips generation
import { SchemaType } from '@google/generative-ai';

// Define the schema for a single clip (previously frame)
export const clipSchema = {
  type: SchemaType.OBJECT,
  properties: {
    narration: {
      type: SchemaType.STRING,
      description: 'Professional voice-over script for this clip in Brazilian Portuguese. Should be concise, impactful, and align with the visual.',
      nullable: false
    },
    visualDescription: {
      type: SchemaType.STRING,
      description: 'Detailed visual description in English of what appears in this clip. Include composition, lighting, subjects, and mood. This message will be used to send to AI to generate image.',
      nullable: false
    },
    duration: {
      type: SchemaType.NUMBER,
      description: 'Suggested duration for this clip in seconds (typically between 5-10 seconds).',
      nullable: false
    }
  },
  required: ['narration', 'visualDescription', 'duration']
};

// Define the schema for a scene (collection of related clips)
export const sceneSchema = {
  type: SchemaType.OBJECT,
  properties: {
    description: {
      type: SchemaType.STRING,
      description: 'A descriptive title for this scene that captures its purpose in the overall narrative.',
      nullable: false
    },
    clips: {
      type: SchemaType.ARRAY,
      description: 'An array clips that form a coherent scene with a specific purpose in the story.',
      items: clipSchema
    }
  },
  required: ['description', 'clips']
};

// Define the schema for a complete storyboard
export const storyboardSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: {
      type: SchemaType.STRING,
      description: 'A concise, professional title for the storyboard that captures its essence.',
      nullable: false
    },
    description: {
      type: SchemaType.STRING,
      description: 'A brief overview of the storyboard\'s narrative and purpose.',
      nullable: false
    },
    scenes: {
      type: SchemaType.ARRAY,
      description: 'An array of scenes that tell a effective story with beginning, middle, and end. Each scene should have a clear purpose in the narrative.',
      items: sceneSchema
    }
  },
  required: ['title', 'description', 'scenes']
};

// For backward compatibility with existing code
export const frameSchema = clipSchema;
