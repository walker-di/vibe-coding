import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// This endpoint forwards the request to the AI storyboard creator service
export const GET: RequestHandler = async ({ params, fetch }) => {
  const storyboardId = params.storyboardId;
  if (!storyboardId) {
    throw error(400, 'Missing storyboardId parameter');
  }

  try {
    // Generate a mock response instead of calling the same endpoint
    // This avoids the infinite loop
    const mockResult = {
      storyboardId: storyboardId,
      name: 'Mock Storyboard',
      frames: [
        {
          id: '1',
          narration: 'This is a mock narration for frame 1',
          mainImagePrompt: 'A beautiful landscape with mountains and a lake',
          imageUrl: null
        },
        {
          id: '2',
          narration: 'This is a mock narration for frame 2',
          mainImagePrompt: 'A city skyline at sunset with tall buildings',
          imageUrl: null
        },
        {
          id: '3',
          narration: 'This is a mock narration for frame 3',
          mainImagePrompt: 'A close-up of a flower with a bee collecting pollen',
          imageUrl: null
        }
      ]
    };

    console.log(`Generated mock data for storyboard ${storyboardId}:`, mockResult);

    // Uncomment this when you have a proper external service
    /*
    const response = await fetch(`http://localhost:8000/api/storyboard/${storyboardId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `API Error: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`Fetched storyboard ${storyboardId} from AI Storyboard Creator API:`, result);
    */

    return json(mockResult);
  } catch (err) {
    console.error(`Error in /api/storyboard/${storyboardId}:`, err);

    // Handle errors thrown during API call
    if (err.status) {
      throw error(err.status, err.body?.message || 'API Error');
    }
    // Generic internal server error
    throw error(500, `Internal Server Error fetching storyboard: ${err.message}`);
  }
};
