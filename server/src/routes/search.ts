/**
 * Search route
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { executeSearch } from '../services/search.js';
import type { SearchResponse } from '../types/api.js';
import { asyncHandler, BadRequestError } from '../middleware/errors.js';

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
  asyncHandler(
    async (
      req: Request<
        object,
        SearchResponse,
        object,
        { q?: string; limit?: string; offset?: string }
      >,
      res: Response<SearchResponse>
    ) => {
      const { q, limit, offset } = req.query;

      // Validate required query parameter
      if (!q || typeof q !== 'string' || q.trim() === '') {
        throw new BadRequestError(
          'Query parameter "q" is required and must be a non-empty string'
        );
      }

      // Parse optional parameters
      const parsedLimit = limit ? parseInt(limit, 10) : undefined;
      const parsedOffset = offset ? parseInt(offset, 10) : undefined;

      // Validate numeric parameters
      if (limit !== undefined && (isNaN(parsedLimit!) || parsedLimit! < 0)) {
        throw new BadRequestError(
          'Query parameter "limit" must be a positive number'
        );
      }

      if (offset !== undefined && (isNaN(parsedOffset!) || parsedOffset! < 0)) {
        throw new BadRequestError(
          'Query parameter "offset" must be a positive number'
        );
      }

      const result = await executeSearch(q.trim(), parsedLimit, parsedOffset);
      res.json(result);
    }
  )
);

export default router;
