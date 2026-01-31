/**
 * API Routes
 */

import { Router } from 'express';
import healthRouter from './health.js';
import searchRouter from './search.js';
import dbStatusRouter from './db-status.js';
import randomRouter from './random.js';

const router = Router();

router.use('/health', healthRouter);
router.use('/search', searchRouter);
router.use('/db-status', dbStatusRouter);
router.use('/random', randomRouter);

export default router;
