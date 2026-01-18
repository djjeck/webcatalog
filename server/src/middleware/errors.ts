/**
 * Error handling middleware and custom error classes
 */

import type { Request, Response, NextFunction } from 'express';
import type { ErrorResponse } from '../types/api.js';

/**
 * Base class for application errors with HTTP status code
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request error
 */
export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

/**
 * 404 Not Found error
 */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends AppError {
  constructor(message: string) {
    super(message, 500, false);
  }
}

/**
 * Database-specific error
 */
export class DatabaseError extends AppError {
  constructor(message: string) {
    super(message, 500, false);
  }
}

/**
 * Convert an error to a standardized ErrorResponse
 */
export function toErrorResponse(error: unknown): ErrorResponse {
  if (error instanceof AppError) {
    return {
      error: getErrorTitle(error.statusCode),
      message: error.message,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      error: 'Internal Server Error',
      message: error.message,
      statusCode: 500,
    };
  }

  return {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    statusCode: 500,
  };
}

/**
 * Get HTTP error title from status code
 */
function getErrorTitle(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Bad Request';
    case 404:
      return 'Not Found';
    case 500:
      return 'Internal Server Error';
    default:
      return 'Error';
  }
}

/**
 * Express error handling middleware
 * This should be the last middleware in the chain
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response<ErrorResponse>,
  _next: NextFunction
): void {
  // Log the error
  if (error instanceof AppError) {
    if (!error.isOperational) {
      console.error('Non-operational error:', error);
    }
  } else {
    console.error('Unexpected error:', error);
  }

  const errorResponse = toErrorResponse(error);
  res.status(errorResponse.statusCode).json(errorResponse);
}

/**
 * Async route wrapper to catch errors and pass them to the error handler
 * Use this to wrap async route handlers so errors are properly caught
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 handler for routes that don't exist
 */
export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
}
