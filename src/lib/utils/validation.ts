import { handleValidationError } from './errorHandler';

/**
 * Utility functions for parameter validation
 */

/**
 * Validates and parses an ID parameter
 * @param id The ID to validate
 * @param paramName Optional parameter name for error messages
 * @returns The validated ID as a number
 * @throws Error if ID is invalid
 */
export function validateId(id: string | undefined, paramName = 'id'): number {
  if (!id) {
    handleValidationError(`${paramName} is required`);
  }
  
  const parsedId = parseInt(id as string, 10);
  
  if (isNaN(parsedId) || parsedId <= 0) {
    handleValidationError(`Invalid ${paramName}: must be a positive integer`);
  }
  
  return parsedId;
}

/**
 * Validates required fields in an object
 * @param obj The object to validate
 * @param requiredFields Array of required field names
 * @throws Error if any required field is missing
 */
export function validateRequiredFields(obj: Record<string, any>, requiredFields: string[]): void {
  const missingFields = requiredFields.filter(field => {
    return obj[field] === undefined || obj[field] === null || obj[field] === '';
  });
  
  if (missingFields.length > 0) {
    handleValidationError(
      'Missing required fields',
      { missingFields }
    );
  }
}

/**
 * Validates that an object has at least one of the specified fields
 * @param obj The object to validate
 * @param fields Array of field names, at least one of which must be present
 * @throws Error if none of the fields are present
 */
export function validateAtLeastOneField(obj: Record<string, any>, fields: string[]): void {
  const hasAtLeastOneField = fields.some(field => {
    return obj[field] !== undefined && obj[field] !== null && obj[field] !== '';
  });
  
  if (!hasAtLeastOneField) {
    handleValidationError(
      'At least one field is required',
      { requiredFields: fields }
    );
  }
}

/**
 * Validates that a string is not empty
 * @param value The string to validate
 * @param fieldName Field name for error messages
 * @throws Error if the string is empty
 */
export function validateNonEmptyString(value: any, fieldName: string): void {
  if (typeof value !== 'string' || value.trim() === '') {
    handleValidationError(`${fieldName} must be a non-empty string`);
  }
}

/**
 * Validates that a value is a positive number
 * @param value The value to validate
 * @param fieldName Field name for error messages
 * @throws Error if the value is not a positive number
 */
export function validatePositiveNumber(value: any, fieldName: string): void {
  const num = Number(value);
  if (isNaN(num) || num <= 0) {
    handleValidationError(`${fieldName} must be a positive number`);
  }
}
