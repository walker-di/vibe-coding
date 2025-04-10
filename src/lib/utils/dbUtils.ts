import { handleDatabaseError } from './errorHandler';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Utility functions for database operations
 */

/**
 * Safely execute a database operation with error handling
 * @param operation Function that performs a database operation
 * @param errorMessage Custom error message if operation fails
 * @returns Result of the database operation
 */
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  errorMessage = 'Database operation failed'
): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    handleDatabaseError(err, errorMessage);
    // This line will never execute due to the error being thrown,
    // but TypeScript requires a return statement
    throw err;
  }
}

/**
 * Safely find a record by ID with error handling
 * @param model The Prisma model to query
 * @param id The ID of the record to find
 * @param errorMessage Custom error message if operation fails
 * @returns The found record
 */
export async function findById<T>(
  model: any,
  id: number,
  errorMessage = 'Record not found'
): Promise<T> {
  return safeDbOperation(
    () => model.findUniqueOrThrow({
      where: { id }
    }),
    errorMessage
  );
}

/**
 * Safely create a record with error handling
 * @param model The Prisma model to use
 * @param data The data for the new record
 * @param errorMessage Custom error message if operation fails
 * @returns The created record
 */
export async function createRecord<T>(
  model: any,
  data: any,
  errorMessage = 'Failed to create record'
): Promise<T> {
  return safeDbOperation(
    () => model.create({ data }),
    errorMessage
  );
}

/**
 * Safely update a record with error handling
 * @param model The Prisma model to use
 * @param id The ID of the record to update
 * @param data The update data
 * @param errorMessage Custom error message if operation fails
 * @returns The updated record
 */
export async function updateRecord<T>(
  model: any,
  id: number,
  data: any,
  errorMessage = 'Failed to update record'
): Promise<T> {
  return safeDbOperation(
    () => model.update({
      where: { id },
      data
    }),
    errorMessage
  );
}

/**
 * Safely delete a record with error handling
 * @param model The Prisma model to use
 * @param id The ID of the record to delete
 * @param errorMessage Custom error message if operation fails
 * @returns The deleted record
 */
export async function deleteRecord<T>(
  model: any,
  id: number,
  errorMessage = 'Failed to delete record'
): Promise<T> {
  return safeDbOperation(
    () => model.delete({
      where: { id }
    }),
    errorMessage
  );
}

// Export Prisma client for direct use when needed
export { prisma };
