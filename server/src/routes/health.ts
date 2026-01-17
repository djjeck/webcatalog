/**
 * Health check route
 */

import { Router } from 'express';
import type { HealthResponse } from '../types/api.js';

const router = Router();

/**
 * GET /api/health
 * Returns server health status
 */
router.get('/', (_req, res) => {
  const response: HealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

export default router;
