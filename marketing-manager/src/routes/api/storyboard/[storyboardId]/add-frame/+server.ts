import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// This endpoint forwards the request to the AI storyboard creator service
export const POST: RequestHandler = async ({ request, params, fetch }) => {
  const storyboardId = params.storyboardId;
  if (!storyboardId) {
    throw error(400, 'Missing storyboardId parameter');
  }

  let requestData;
  try {
    requestData = await request.json();
    console.log(`Received data at /api/storyboard/${storyboardId}/add-frame:`, requestData);

    // Generate a mock response instead of calling the same endpoint
    // This avoids the infinite loop
    const mockResult = {
      success: true,
      storyboardId: storyboardId,
      message: 'Frames added successfully',
      framesAdded: 3
    };

    console.log(`Generated mock response for adding frames to storyboard ${storyboardId}:`, mockResult);

    // Uncomment this when you have a proper external service
    /*
    const response = await fetch(`http://localhost:8000/api/storyboard/${storyboardId}/add-frame`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `API Error: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('AI Storyboard Creator API Response:', result);
    */

    return json(mockResult, { status: 201 });
  } catch (err) {
    console.error(`Error in /api/storyboard/${storyboardId}/add-frame:`, err);

    // Handle potential JSON parsing errors from request
    if (err instanceof SyntaxError) {
      throw error(400, 'Invalid JSON in request body');
    }
    // Handle errors thrown during API call
    if (err.status) {
      throw error(err.status, err.body?.message || 'API Error');
    }
    // Generic internal server error
    throw error(500, `Internal Server Error adding frames: ${err.message}`);
  }
};
