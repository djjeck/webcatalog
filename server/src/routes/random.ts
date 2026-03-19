/**
 * Random result route
 */

import { type Request, type Response, Router } from 'express';
import { asyncHandler } from '../middleware/errors.js';
import { executeRandom } from '../services/search.js';
import { type SearchResultItem } from '../types/api.js';

const router = Router();

/**
 * GET /api/random
 * Return a single random item from the catalog
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response<SearchResultItem>) => {
    const result = await executeRandom();
    res.json(result);
  })
);

export default router;
