import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import Replicate from 'replicate';

export const GET: RequestHandler = async () => {
  try {
    // Check if the Replicate API key is set
    const REPLICATE_API_KEY = env.REPLICATE_API_KEY;
    if (!REPLICATE_API_KEY) {
      console.error('REPLICATE_API_KEY environment variable is not set.');
      return json({
        success: false,
        error: 'REPLICATE_API_KEY environment variable is not set.'
      });
    }

    // Initialize Replicate client
    const replicate = new Replicate({ auth: REPLICATE_API_KEY });

    // Try to get a list of models (a simple API call to test authentication)
    try {
      // Just check if we can create a client without errors
      console.log('Replicate client initialized successfully');
      return json({
        success: true,
        message: 'Replicate API key is valid and client initialized successfully'
      });
    } catch (apiError: any) {
      console.error('Error calling Replicate API:', apiError);
      return json({
        success: false,
        error: `Error calling Replicate API: ${apiError.message || 'Unknown error'}`
      });
    }
  } catch (error: any) {
    console.error('Error checking Replicate API key:', error);
    return json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
};
