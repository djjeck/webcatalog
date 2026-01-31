/**
 * TypeScript types for API requests and responses
 * These types mirror the server API types for type safety
 */

/**
 * Search result item representing a file or folder
 */
export interface SearchResultItem {
  id: number;
  name: string;
  path: string;
  size: number | null;
  dateModified: string | null;
  dateCreated: string | null;
  type: 'file' | 'folder' | 'volume';
  volumeName: string | null;
}

/**
 * Search API response
 */
export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
  totalResults: number;
  executionTime: number; // in milliseconds
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  database?: {
    connected: boolean;
    path: string;
  };
}

/**
 * Database status response
 */
export interface DbStatusResponse {
  connected: boolean;
  path: string;
  fileSize: number; // in bytes
  lastModified: string;
  lastLoaded: string;
  statistics: {
    totalItems: number;
    totalFiles: number;
    totalFolders: number;
    totalVolumes: number;
    totalSize: number; // in bytes
  };
}

/**
 * Error response from API
 */
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

/**
 * Search query parameters
 */
export interface SearchParams {
  query: string;
  limit?: number;
  offset?: number;
}
