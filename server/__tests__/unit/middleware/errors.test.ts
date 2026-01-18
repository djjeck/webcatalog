import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  AppError,
  BadRequestError,
  NotFoundError,
  InternalServerError,
  DatabaseError,
  toErrorResponse,
  errorHandler,
  asyncHandler,
  notFoundHandler,
} from '../../../src/middleware/errors.js';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create an error with status code', () => {
      const error = new AppError('Test error', 400);

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('AppError');
    });

    it('should allow setting isOperational to false', () => {
      const error = new AppError('Critical error', 500, false);

      expect(error.isOperational).toBe(false);
    });

    it('should have a stack trace', () => {
      const error = new AppError('Test error', 400);

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AppError');
    });
  });

  describe('BadRequestError', () => {
    it('should create a 400 error', () => {
      const error = new BadRequestError('Invalid input');

      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('BadRequestError');
    });
  });

  describe('NotFoundError', () => {
    it('should create a 404 error', () => {
      const error = new NotFoundError('Resource not found');

      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('NotFoundError');
    });
  });

  describe('InternalServerError', () => {
    it('should create a 500 error', () => {
      const error = new InternalServerError('Server crashed');

      expect(error.message).toBe('Server crashed');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(false);
      expect(error.name).toBe('InternalServerError');
    });
  });

  describe('DatabaseError', () => {
    it('should create a 500 error for database issues', () => {
      const error = new DatabaseError('Connection failed');

      expect(error.message).toBe('Connection failed');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(false);
      expect(error.name).toBe('DatabaseError');
    });
  });
});

describe('toErrorResponse', () => {
  it('should convert AppError to ErrorResponse', () => {
    const error = new BadRequestError('Invalid query');
    const response = toErrorResponse(error);

    expect(response).toEqual({
      error: 'Bad Request',
      message: 'Invalid query',
      statusCode: 400,
    });
  });

  it('should convert NotFoundError to ErrorResponse', () => {
    const error = new NotFoundError('Page not found');
    const response = toErrorResponse(error);

    expect(response).toEqual({
      error: 'Not Found',
      message: 'Page not found',
      statusCode: 404,
    });
  });

  it('should convert InternalServerError to ErrorResponse', () => {
    const error = new InternalServerError('Something went wrong');
    const response = toErrorResponse(error);

    expect(response).toEqual({
      error: 'Internal Server Error',
      message: 'Something went wrong',
      statusCode: 500,
    });
  });

  it('should convert unknown status code to generic error', () => {
    const error = new AppError('Teapot error', 418);
    const response = toErrorResponse(error);

    expect(response).toEqual({
      error: 'Error',
      message: 'Teapot error',
      statusCode: 418,
    });
  });

  it('should convert regular Error to 500 response', () => {
    const error = new Error('Regular error');
    const response = toErrorResponse(error);

    expect(response).toEqual({
      error: 'Internal Server Error',
      message: 'Regular error',
      statusCode: 500,
    });
  });

  it('should convert non-Error to generic response', () => {
    const response = toErrorResponse('string error');

    expect(response).toEqual({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      statusCode: 500,
    });
  });

  it('should handle null error', () => {
    const response = toErrorResponse(null);

    expect(response).toEqual({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      statusCode: 500,
    });
  });

  it('should handle undefined error', () => {
    const response = toErrorResponse(undefined);

    expect(response).toEqual({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      statusCode: 500,
    });
  });
});

describe('errorHandler middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should handle AppError and send response', () => {
    const error = new BadRequestError('Invalid input');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Bad Request',
      message: 'Invalid input',
      statusCode: 400,
    });
  });

  it('should log non-operational errors', () => {
    const error = new InternalServerError('Critical failure');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Non-operational error:',
      error
    );
  });

  it('should not log operational errors', () => {
    const error = new BadRequestError('User error');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should log unexpected errors', () => {
    const error = new Error('Unexpected');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(consoleErrorSpy).toHaveBeenCalledWith('Unexpected error:', error);
  });

  it('should handle non-Error objects', () => {
    errorHandler(
      'string error',
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      statusCode: 500,
    });
  });
});

describe('asyncHandler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      json: vi.fn(),
    };
    mockNext = vi.fn();
  });

  it('should call the wrapped function', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const wrapped = asyncHandler(handler);

    wrapped(mockReq as Request, mockRes as Response, mockNext);

    // Allow promise to resolve
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(handler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
  });

  it('should pass errors to next on rejection', async () => {
    const error = new Error('Async error');
    const handler = vi.fn().mockRejectedValue(error);
    const wrapped = asyncHandler(handler);

    wrapped(mockReq as Request, mockRes as Response, mockNext);

    // Allow promise to reject
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockNext).toHaveBeenCalledWith(error);
  });

  it('should handle errors thrown in async function', async () => {
    const error = new Error('Async throw error');
    const handler = vi.fn().mockImplementation(async () => {
      throw error;
    });
    const wrapped = asyncHandler(handler);

    wrapped(mockReq as Request, mockRes as Response, mockNext);

    // Allow promise to reject
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockNext).toHaveBeenCalledWith(error);
  });
});

describe('notFoundHandler', () => {
  it('should create NotFoundError and call next', () => {
    const mockReq = {
      method: 'GET',
      path: '/unknown/path',
    } as Request;
    const mockRes = {} as Response;
    const mockNext = vi.fn();

    notFoundHandler(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    const error = mockNext.mock.calls[0][0] as NotFoundError;
    expect(error.message).toBe('Route GET /unknown/path not found');
    expect(error.statusCode).toBe(404);
  });

  it('should handle POST requests', () => {
    const mockReq = {
      method: 'POST',
      path: '/api/invalid',
    } as Request;
    const mockRes = {} as Response;
    const mockNext = vi.fn();

    notFoundHandler(mockReq, mockRes, mockNext);

    const error = mockNext.mock.calls[0][0] as NotFoundError;
    expect(error.message).toBe('Route POST /api/invalid not found');
  });
});
