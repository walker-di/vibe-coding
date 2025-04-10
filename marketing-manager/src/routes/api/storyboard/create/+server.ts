import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { randomUUID } from 'crypto';

// This endpoint forwards the request to the AI storyboard creator service
export const POST: RequestHandler = async ({ request, fetch }) => {
  let requestData;
  try {
    requestData = await request.json();
    console.log('Received data at /api/storyboard/create:', requestData);

    // Use a different URL for the AI storyboard creator service
    // If the service is running on a different port or host, update this URL
    // For now, we'll generate a mock response to avoid the infinite loop

    // Generate a mock response instead of calling the same endpoint
    const storyboardId = randomUUID();
    const mockResult = {
      success: true,
      storyboardId: storyboardId,
      message: 'Storyboard created successfully'
    };

    console.log('Generated mock storyboard with ID:', storyboardId);

    // Uncomment this when you have a proper external service
    /*
    const response = await fetch('http://localhost:8000/api/storyboard/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });
    */

    // When using the external service, uncomment this
    /*
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `API Error: ${response.statusText}`);
    }

    const result = await response.json();
    */

    // Use our mock result
    console.log('AI Storyboard Creator API Response (Mock):', mockResult);

    return json(mockResult, { status: 201 });
  } catch (err) {
    console.error('Error in /api/storyboard/create:', err);

    // Handle potential JSON parsing errors from request
    if (err instanceof SyntaxError) {
      throw error(400, 'Invalid JSON in request body');
    }
    // Handle errors thrown during API call
    if (err.status) {
      throw error(err.status, err.body?.message || 'API Error');
    }
    // Generic internal server error
    throw error(500, `Internal Server Error creating storyboard: ${err.message}`);
  }
};
