// Export all utility functions from a single file for easier imports

// API Response utilities
export { successResponse, errorResponse, HttpStatus } from './apiResponse';

// Error handling utilities
export {
  handleValidationError,
  handleNotFoundError,
  handleDatabaseError,
  handleServerError,
  withErrorHandling
} from './errorHandler';

// Validation utilities
export {
  validateId,
  validateRequiredFields,
  validateAtLeastOneField,
  validateNonEmptyString,
  validatePositiveNumber
} from './validation';

// Database utilities
export {
  safeDbOperation,
  findById,
  createRecord,
  updateRecord,
  deleteRecord,
  prisma
} from './dbUtils';
