/**
 * Utility functions for standardized API responses
 */

/**
 * Standard success response format
 * @param data The data to include in the response
 * @param message Optional success message
 * @returns Formatted success response object
 */
export function successResponse<T>(data: T, message?: string) {
  return {
    data,
    message: message || 'Operation successful'
  };
}

/**
 * Standard error response format
 * @param error The error message
 * @param details Optional error details
 * @returns Formatted error response object
 */
export function errorResponse(error: string, details?: any) {
  return {
    error,
    details: details || null
  };
}

/**
 * HTTP status codes for consistent API responses
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};
