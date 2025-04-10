import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * HTTP Status codes used in API responses
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500
}

/**
 * Standard success response format
 * @param data The data to include in the response
 * @param message Optional success message
 * @returns Formatted success response object
 */
export function successResponse<T>(data: T, message: string = 'Success'): { success: true; data: T; message: string } {
  return {
    success: true,
    data,
    message
  };
}

/**
 * Validates that an ID parameter is a valid number
 * @param id The ID parameter to validate
 * @param paramName Name of the parameter for error messages
 * @returns The parsed numeric ID
 * @throws 400 error if ID is invalid
 */
export function validateId(id: string | undefined, paramName: string = 'ID'): number {
  if (!id) {
    throw error(HttpStatus.BAD_REQUEST, `${paramName} parameter is missing`);
  }
  
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) {
    throw error(HttpStatus.BAD_REQUEST, `Invalid ${paramName} format`);
  }
  
  return numericId;
}

/**
 * Validates that required fields are present in the request data
 * @param data The request data to validate
 * @param requiredFields Array of field names that are required
 * @throws 400 error if any required fields are missing
 */
export function validateRequiredFields(data: any, requiredFields: string[]): void {
  const missingFields = requiredFields.filter(field => {
    return data[field] === undefined || data[field] === null || 
           (typeof data[field] === 'string' && data[field].trim() === '');
  });
  
  if (missingFields.length > 0) {
    throw error(
      HttpStatus.BAD_REQUEST, 
      `Missing required fields: ${missingFields.join(', ')}`
    );
  }
}

/**
 * Handles not found errors consistently
 * @param message Error message
 * @throws 404 error with the provided message
 */
export function handleNotFoundError(message: string = 'Resource not found'): never {
  throw error(HttpStatus.NOT_FOUND, message);
}

/**
 * Handles server errors consistently
 * @param err The error object
 * @param message Optional custom error message
 * @throws 500 error with appropriate message
 */
export function handleServerError(err: any, message: string = 'Internal server error'): never {
  console.error('Server error:', err);
  
  // If it's already a SvelteKit error, re-throw it
  if (err.status && err.body) {
    throw err;
  }
  
  throw error(
    HttpStatus.INTERNAL_SERVER_ERROR, 
    `${message}: ${err.message || 'Unknown error'}`
  );
}

/**
 * Higher-order function for consistent error handling in API endpoints
 * @param handler The request handler function
 * @returns A wrapped handler with error handling
 */
export function withErrorHandling(handler: (event: RequestEvent) => Promise<Response>): (event: RequestEvent) => Promise<Response> {
  return async (event: RequestEvent) => {
    try {
      return await handler(event);
    } catch (err: any) {
      // If it's already a SvelteKit error, re-throw it
      if (err.status && err.body) {
        throw err;
      }
      
      // Otherwise, handle as a server error
      return handleServerError(err);
    }
  };
}
