import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFrames, getDefaultFrames, setFrames, getMetadata, getDefaultMetadata } from '$lib/server/storyboardStore';

// This endpoint forwards the request to the AI storyboard creator service
export const GET: RequestHandler = async ({ params }) => {
  const storyboardId = params.storyboardId;
  if (!storyboardId) {
    throw error(400, 'Missing storyboardId parameter');
  }

  try {
    // Get frames from our store
    let frames = getFrames(storyboardId);

    // If no frames exist yet, create default ones
    if (!frames) {
      frames = getDefaultFrames();

      // Store these default frames
      setFrames(storyboardId, frames);
    }

    // Get the storyboard metadata if available
    let metadata = getMetadata(storyboardId);

    // If no metadata exists, use default
    if (!metadata) {
      metadata = getDefaultMetadata();
    }

    const result = {
      storyboardId: storyboardId,
      name: metadata.title,
      description: metadata.description,
      frames: frames
    };

    console.log(`Retrieved frames for storyboard ${storyboardId}:`, result);

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

    return json(result);
  } catch (err) {
    console.error(`Error in /api/storyboard/${storyboardId}:`, err);

    const error_obj = err as any;

    // Handle errors thrown during API call
    if (error_obj.status) {
      throw error(error_obj.status, error_obj.body?.message || 'API Error');
    }
    // Generic internal server error
    throw error(500, `Internal Server Error fetching storyboard: ${error_obj.message || 'Unknown error'}`);
  }
};
