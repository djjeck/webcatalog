/**
 * Random result route
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { executeRandom } from '../services/search.js';
import type { SearchResultItem } from '../types/api.js';
import { asyncHandler } from '../middleware/errors.js';

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
