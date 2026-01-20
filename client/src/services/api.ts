/**
 * API client for WebCatalog backend
 * Provides typed methods for all API endpoints
 */

import type {
  SearchResponse,
  DbStatusResponse,
  HealthResponse,
  ErrorResponse,
} from '../types/api';

/**
 * Search parameters for the client API
 * (Client-specific type with friendlier field names)
 */
export interface SearchParams {
  query: string;
  limit?: number;
  offset?: number;
}

/**
 * API error class for handling error responses
 */
export class ApiError extends Error {
  statusCode: number;
  errorType: string;

  constructor(statusCode: number, errorType: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorType = errorType;
  }
}

/**
 * Get the base URL for API requests
 * In development, this will be the Vite proxy target
 * In production, this will be the same origin
 */
function getBaseUrl(): string {
  // Use relative URLs - works with both dev proxy and production
  return '/api';
}

/**
 * Parse error response from API
 */
async function parseErrorResponse(response: Response): Promise<ApiError> {
  try {
    const errorData: ErrorResponse = await response.json();
    return new ApiError(
      errorData.statusCode || response.status,
      errorData.error || 'Unknown Error',
      errorData.message || response.statusText
    );
  } catch {
    // If we can't parse the error response, create a generic error
    return new ApiError(
      response.status,
      'Network Error',
      response.statusText || 'An unexpected error occurred'
    );
  }
}

/**
 * Make a fetch request with error handling
 */
async function fetchWithErrorHandling<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return response.json() as Promise<T>;
}

/**
 * Search for files and folders in the catalog
 * @param params - Search parameters including query string and optional pagination
 * @returns Search response with results
 * @throws ApiError if the request fails
 */
export async function search(params: SearchParams): Promise<SearchResponse> {
  const { query, limit, offset } = params;
  const searchParams = new URLSearchParams({ q: query });

  if (limit !== undefined) {
    searchParams.set('limit', String(limit));
  }
  if (offset !== undefined) {
    searchParams.set('offset', String(offset));
  }

  const url = `${getBaseUrl()}/search?${searchParams.toString()}`;
  return fetchWithErrorHandling<SearchResponse>(url);
}

/**
 * Get database status information
 * @returns Database status including statistics
 * @throws ApiError if the request fails
 */
export async function getDbStatus(): Promise<DbStatusResponse> {
  const url = `${getBaseUrl()}/db-status`;
  return fetchWithErrorHandling<DbStatusResponse>(url);
}

/**
 * Check API health status
 * @returns Health check response
 * @throws ApiError if the request fails
 */
export async function healthCheck(): Promise<HealthResponse> {
  const url = `${getBaseUrl()}/health`;
  return fetchWithErrorHandling<HealthResponse>(url);
}

/**
 * Check if the API is reachable and healthy
 * @returns true if the API is healthy, false otherwise
 */
export async function isHealthy(): Promise<boolean> {
  try {
    const response = await healthCheck();
    return response.status === 'ok';
  } catch {
    return false;
  }
}
