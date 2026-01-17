/**
 * API Routes
 */

import { Router } from 'express';
import healthRouter from './health.js';
import searchRouter from './search.js';
import dbStatusRouter from './db-status.js';

const router = Router();

router.use('/health', healthRouter);
router.use('/search', searchRouter);
router.use('/db-status', dbStatusRouter);

export default router;
