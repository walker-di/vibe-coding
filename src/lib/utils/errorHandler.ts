import { error } from '@sveltejs/kit';
import { errorResponse } from './apiResponse';
import { HttpStatus } from './apiResponse';

/**
 * Centralized error handling utility
 * Converts various error types to standardized SvelteKit error responses
 */

/**
 * Handle validation errors
 * @param message Error message
 * @param details Validation error details
 */
export function handleValidationError(message: string, details?: any) {
  throw error(HttpStatus.BAD_REQUEST, errorResponse(message, details));
}

/**
 * Handle not found errors
 * @param message Error message
 */
export function handleNotFoundError(message: string) {
  throw error(HttpStatus.NOT_FOUND, errorResponse(message));
}

/**
 * Handle database errors
 * @param err The caught error
 * @param customMessage Optional custom error message
 */
export function handleDatabaseError(err: any, customMessage?: string) {
  console.error('Database error:', err);
  
  // Determine if this is a Prisma error with a code
  const isPrismaError = err?.code !== undefined;
  
  // Handle specific database error codes
  if (isPrismaError) {
    // P2025 is Prisma's "Record not found" error
    if (err.code === 'P2025') {
      throw error(HttpStatus.NOT_FOUND, errorResponse(
        customMessage || 'Resource not found',
        { originalError: err.message }
      ));
    }
    
    // P2002 is Prisma's "Unique constraint failed" error
    if (err.code === 'P2002') {
      throw error(HttpStatus.BAD_REQUEST, errorResponse(
        customMessage || 'Duplicate entry',
        { fields: err.meta?.target || [], originalError: err.message }
      ));
    }
  }
  
  // Default to internal server error for unhandled database errors
  throw error(HttpStatus.INTERNAL_SERVER_ERROR, errorResponse(
    customMessage || 'Database operation failed',
    { originalError: err.message }
  ));
}

/**
 * Handle general server errors
 * @param err The caught error
 * @param customMessage Optional custom error message
 */
export function handleServerError(err: any, customMessage?: string) {
  console.error('Server error:', err);
  
  throw error(HttpStatus.INTERNAL_SERVER_ERROR, errorResponse(
    customMessage || 'An unexpected error occurred',
    { originalError: err.message }
  ));
}

/**
 * Generic try-catch wrapper for API handlers
 * @param fn The function to execute
 * @returns A function that handles errors
 */
export function withErrorHandling<T extends (...args: any[]) => any>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (err: any) {
      // If it's already a SvelteKit error, just rethrow it
      if (err.status && err.body) {
        throw err;
      }
      
      // Otherwise, handle it as a server error
      handleServerError(err);
    }
  }) as T;
}
