/**
 * Search route
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { executeSearch } from '../services/search.js';
import type { SearchResponse, ErrorResponse } from '../types/api.js';

const router = Router();

/**
 * GET /api/search
 * Search the catalog database
 *
 * Query parameters:
 * - q: Search query string (required)
 * - limit: Maximum number of results (optional, default 100, max 1000)
 * - offset: Pagination offset (optional, default 0)
 */
router.get(
  '/',
  async (
    req: Request<
      object,
      SearchResponse | ErrorResponse,
      object,
      { q?: string; limit?: string; offset?: string }
    >,
    res: Response<SearchResponse | ErrorResponse>
  ) => {
    const { q, limit, offset } = req.query;

    // Validate required query parameter
    if (!q || typeof q !== 'string' || q.trim() === '') {
      const errorResponse: ErrorResponse = {
        error: 'Bad Request',
        message:
          'Query parameter "q" is required and must be a non-empty string',
        statusCode: 400,
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Parse optional parameters
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const parsedOffset = offset ? parseInt(offset, 10) : undefined;

    // Validate numeric parameters
    if (limit !== undefined && (isNaN(parsedLimit!) || parsedLimit! < 0)) {
      const errorResponse: ErrorResponse = {
        error: 'Bad Request',
        message: 'Query parameter "limit" must be a positive number',
        statusCode: 400,
      };
      res.status(400).json(errorResponse);
      return;
    }

    if (offset !== undefined && (isNaN(parsedOffset!) || parsedOffset! < 0)) {
      const errorResponse: ErrorResponse = {
        error: 'Bad Request',
        message: 'Query parameter "offset" must be a positive number',
        statusCode: 400,
      };
      res.status(400).json(errorResponse);
      return;
    }

    try {
      const result = await executeSearch(q.trim(), parsedLimit, parsedOffset);
      res.json(result);
    } catch (error) {
      console.error('Search error:', error);
      const errorResponse: ErrorResponse = {
        error: 'Internal Server Error',
        message:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
        statusCode: 500,
      };
      res.status(500).json(errorResponse);
    }
  }
);

export default router;
