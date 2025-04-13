import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { canvasTemplates } from '$lib/server/db/schema';

export const GET: RequestHandler = async () => {
  try {
    // Create a sample template with placeholder objects
    const sampleTemplate = {
      version: '5.3.0',
      objects: [
        {
          type: 'rect',
          version: '5.3.0',
          originX: 'left',
          originY: 'top',
          left: 0,
          top: 0,
          width: 1920,
          height: 1080,
          fill: '#f0f0f0',
          stroke: null,
          strokeWidth: 0,
          name: 'background'
        },
        {
          type: 'rect',
          version: '5.3.0',
          originX: 'left',
          originY: 'top',
          left: 100,
          top: 100,
          width: 800,
          height: 600,
          fill: '#cccccc',
          stroke: null,
          strokeWidth: 0,
          name: 'placeholder?name=main_image&ratio=16:9'
        },
        {
          type: 'rect',
          version: '5.3.0',
          originX: 'left',
          originY: 'top',
          left: 1000,
          top: 100,
          width: 400,
          height: 400,
          fill: '#dddddd',
          stroke: null,
          strokeWidth: 0,
          name: 'placeholder?name=product&ratio=1:1'
        }
      ],
      background: '#f0f0f0',
      width: 1920,
      height: 1080
    };

    // Insert the template into the database
    const [template] = await db
      .insert(canvasTemplates)
      .values({
        name: 'Test Template with Placeholders',
        description: 'A test template with placeholder objects for AI Fill testing',
        canvasData: JSON.stringify(sampleTemplate),
        aspectRatio: '16:9',
        resolution: '1920x1080 (16:9 HD)',
        category: 'test',
        tags: ['test', 'placeholder', 'ai-fill'],
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return json({
      success: true,
      message: 'Test template created successfully',
      template
    });
  } catch (error: any) {
    console.error('Error creating test template:', error);
    return json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
};
