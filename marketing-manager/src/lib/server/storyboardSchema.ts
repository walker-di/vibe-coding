// Schema definition for storyboard frames generation
import { SchemaType } from '@google/generative-ai';

// Define the schema for a single frame
export const frameSchema = {
  type: SchemaType.OBJECT,
  properties: {
    narration: {
      type: SchemaType.STRING,
      description: 'Professional voice-over script for this frame in Brazilian Portuguese Should be concise, impactful, and align with the visual.',
      nullable: false
    },
    visualDescription: {
      type: SchemaType.STRING,
      description: 'Detailed visual description in English of what appears in this frame. Include composition, lighting, subjects, and mood. this message will be used to send to AI to generate image',
      nullable: false
    }
  },
  required: ['narration', 'visualDescription']
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
    frames: {
      type: SchemaType.ARRAY,
      description: 'An array of exactly 3 frames that tell a cohesive story with beginning, middle, and end.',
      items: frameSchema
    }
  },
  required: ['title', 'description', 'frames']
};
