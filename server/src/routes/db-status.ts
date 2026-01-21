/**
 * Database status route
 *
 * Queries the in-memory search_index table for statistics.
 */

import { Router } from 'express';
import type { Response } from 'express';
import { stat } from 'fs/promises';
import { getDatabase } from '../db/database.js';
import { getLastReloadTime } from '../services/refresh.js';
import type { DbStatusResponse } from '../types/api.js';
import { asyncHandler } from '../middleware/errors.js';
import { ItemType } from '../types/database.js';

const router = Router();

/**
 * GET /api/db-status
 * Returns database status and statistics
 */
router.get(
  '/',
  asyncHandler(async (_req, res: Response<DbStatusResponse>) => {
    const dbManager = getDatabase();
    const db = dbManager.getDb();
    const dbPath = dbManager.getPath();

    // Get file stats
    const fileStats = await stat(dbPath);

    // Get database statistics from the in-memory search_index table
    const itemsCount = db
      .prepare('SELECT COUNT(*) as count FROM search_index')
      .get() as { count: number };

    const filesCount = db
      .prepare(`SELECT COUNT(*) as count FROM search_index WHERE itype = ${ItemType.FILE}`)
      .get() as { count: number };

    const foldersCount = db
      .prepare(`SELECT COUNT(*) as count FROM search_index WHERE itype = ${ItemType.FOLDER}`)
      .get() as { count: number };

    const volumesCount = db
      .prepare(`SELECT COUNT(*) as count FROM search_index WHERE itype = ${ItemType.VOLUME}`)
      .get() as { count: number };

    const totalSize = db
      .prepare('SELECT COALESCE(SUM(size), 0) as total FROM search_index')
      .get() as { total: number };

    const lastReloadTime = getLastReloadTime();

    const response: DbStatusResponse = {
      connected: true,
      path: dbPath,
      fileSize: fileStats.size,
      lastModified: new Date(fileStats.mtimeMs).toISOString(),
      lastLoaded: lastReloadTime
        ? lastReloadTime.toISOString()
        : new Date(dbManager.getLastModified()).toISOString(),
      statistics: {
        totalItems: itemsCount.count,
        totalFiles: filesCount.count,
        totalFolders: foldersCount.count,
        totalVolumes: volumesCount.count,
        totalSize: totalSize.total,
      },
    };

    res.json(response);
  })
);

export default router;
