import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  search,
  getDbStatus,
  healthCheck,
  isHealthy,
  ApiError,
} from '../../src/services/api';
import type {
  SearchResponse,
  DbStatusResponse,
  HealthResponse,
} from '../../src/types/api';

// Mock fetch globally
const mockFetch = vi.fn();
(globalThis as { fetch: typeof fetch }).fetch = mockFetch;

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('search', () => {
    it('should make a search request with query parameter', async () => {
      const mockResponse: SearchResponse = {
        query: 'test',
        results: [
          {
            id: 1,
            name: 'test.txt',
            path: '/files/test.txt',
            size: 1024,
            dateModified: '2024-01-15T10:00:00.000Z',
            dateCreated: '2024-01-10T08:00:00.000Z',
            type: 'file',
            volumeName: 'Drive1',
          },
        ],
        totalResults: 1,
        executionTime: 50,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await search({ query: 'test' });

      expect(mockFetch).toHaveBeenCalledWith('/api/search?q=test', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should include limit and offset in query params', async () => {
      const mockResponse: SearchResponse = {
        query: 'vacation',
        results: [],
        totalResults: 0,
        executionTime: 10,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await search({ query: 'vacation', limit: 50, offset: 100 });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/search?q=vacation&limit=50&offset=100',
        expect.any(Object)
      );
    });

    it('should encode special characters in query', async () => {
      const mockResponse: SearchResponse = {
        query: 'test file.txt',
        results: [],
        totalResults: 0,
        executionTime: 10,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await search({ query: 'test file.txt' });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/search?q=test+file.txt',
        expect.any(Object)
      );
    });

    it('should throw ApiError on error response', async () => {
      const errorResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () =>
          Promise.resolve({
            error: 'Bad Request',
            message: 'Query parameter q is required',
            statusCode: 400,
          }),
      };

      mockFetch.mockResolvedValueOnce(errorResponse);
      await expect(search({ query: '' })).rejects.toThrow(ApiError);

      mockFetch.mockResolvedValueOnce(errorResponse);
      await expect(search({ query: '' })).rejects.toMatchObject({
        statusCode: 400,
        errorType: 'Bad Request',
        message: 'Query parameter q is required',
      });
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(search({ query: 'test' })).rejects.toThrow('Network error');
    });

    it('should handle non-JSON error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(search({ query: 'test' })).rejects.toMatchObject({
        statusCode: 500,
        errorType: 'Network Error',
        message: 'Internal Server Error',
      });
    });

    it('should handle non-JSON error with empty statusText', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: '',
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(search({ query: 'test' })).rejects.toMatchObject({
        statusCode: 500,
        errorType: 'Network Error',
        message: 'An unexpected error occurred',
      });
    });

    it('should use fallback values for missing error response fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () =>
          Promise.resolve({
            // Missing all fields - should use fallbacks
          }),
      });

      await expect(search({ query: 'test' })).rejects.toMatchObject({
        statusCode: 404,
        errorType: 'Unknown Error',
        message: 'Not Found',
      });
    });

    it('should use partial error response fields with fallbacks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: () =>
          Promise.resolve({
            // Only error field present
            error: 'Custom Error',
          }),
      });

      await expect(search({ query: 'test' })).rejects.toMatchObject({
        statusCode: 500,
        errorType: 'Custom Error',
        message: 'Server Error',
      });
    });
  });

  describe('getDbStatus', () => {
    it('should fetch database status', async () => {
      const mockResponse: DbStatusResponse = {
        connected: true,
        path: '/data/catalog.w3cat',
        fileSize: 1048576,
        lastModified: '2024-01-15T10:00:00.000Z',
        lastLoaded: '2024-01-15T12:00:00.000Z',
        statistics: {
          totalItems: 1000,
          totalFiles: 800,
          totalFolders: 180,
          totalVolumes: 20,
          totalSize: 5368709120,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getDbStatus();

      expect(mockFetch).toHaveBeenCalledWith('/api/db-status', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw ApiError on error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () =>
          Promise.resolve({
            error: 'Internal Server Error',
            message: 'Database not initialized',
            statusCode: 500,
          }),
      });

      await expect(getDbStatus()).rejects.toThrow(ApiError);
    });
  });

  describe('healthCheck', () => {
    it('should fetch health status', async () => {
      const mockResponse: HealthResponse = {
        status: 'ok',
        timestamp: '2024-01-15T12:00:00.000Z',
        database: {
          connected: true,
          path: '/data/catalog.w3cat',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await healthCheck();

      expect(mockFetch).toHaveBeenCalledWith('/api/health', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw ApiError on error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: () =>
          Promise.resolve({
            error: 'Service Unavailable',
            message: 'Database connection failed',
            statusCode: 503,
          }),
      });

      await expect(healthCheck()).rejects.toThrow(ApiError);
    });
  });

  describe('isHealthy', () => {
    it('should return true when API is healthy', async () => {
      const mockResponse: HealthResponse = {
        status: 'ok',
        timestamp: '2024-01-15T12:00:00.000Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await isHealthy();

      expect(result).toBe(true);
    });

    it('should return false when health check returns error status', async () => {
      const mockResponse: HealthResponse = {
        status: 'error',
        timestamp: '2024-01-15T12:00:00.000Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await isHealthy();

      expect(result).toBe(false);
    });

    it('should return false when API request fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const result = await isHealthy();

      expect(result).toBe(false);
    });

    it('should return false when network error occurs', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await isHealthy();

      expect(result).toBe(false);
    });
  });

  describe('ApiError', () => {
    it('should create an error with correct properties', () => {
      const error = new ApiError(404, 'Not Found', 'Resource not found');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.name).toBe('ApiError');
      expect(error.statusCode).toBe(404);
      expect(error.errorType).toBe('Not Found');
      expect(error.message).toBe('Resource not found');
    });
  });
});
