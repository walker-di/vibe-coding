import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parsePlaceholder } from '$lib/utils/placeholder-parser';

export const GET: RequestHandler = async () => {
  try {
    // Test various placeholder formats
    const testCases = [
      'placeholder?name=main_image&ratio=16:9',
      'placeholder?name=background&ratio=1:1',
      'placeholder?name=person&ratio=9:16',
      'placeholder?ratio=16:9',
      'placeholder?name=product',
      'placeholder',
      'not-a-placeholder'
    ];

    const results = testCases.map(testCase => {
      const parsed = parsePlaceholder(testCase);
      return {
        original: testCase,
        parsed,
        isValid: !!parsed
      };
    });

    return json({
      success: true,
      results
    });
  } catch (error: any) {
    console.error('Error testing placeholder parser:', error);
    return json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
};
