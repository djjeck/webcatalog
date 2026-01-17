/**
 * Database status route
 */

import { Router } from 'express';
import type { Response } from 'express';
import { stat } from 'fs/promises';
import { getDatabase } from '../db/database.js';
import { getLastReloadTime } from '../services/refresh.js';
import type { DbStatusResponse, ErrorResponse } from '../types/api.js';

const router = Router();

/**
 * GET /api/db-status
 * Returns database status and statistics
 */
router.get(
  '/',
  async (_req, res: Response<DbStatusResponse | ErrorResponse>) => {
    try {
      const dbManager = getDatabase();
      const db = dbManager.getDb();
      const dbPath = dbManager.getPath();

      // Get file stats
      const fileStats = await stat(dbPath);

      // Get database statistics
      const itemsCount = db
        .prepare('SELECT COUNT(*) as count FROM w3_items')
        .get() as { count: number };

      const filesCount = db
        .prepare(
          'SELECT COUNT(*) as count FROM w3_items WHERE itype NOT IN (1, 2, 3, 150, 172)'
        )
        .get() as { count: number };

      const foldersCount = db
        .prepare(
          'SELECT COUNT(*) as count FROM w3_items WHERE itype IN (1, 2, 3)'
        )
        .get() as { count: number };

      const volumesCount = db
        .prepare('SELECT COUNT(*) as count FROM w3_items WHERE itype = 172')
        .get() as { count: number };

      const totalSize = db
        .prepare('SELECT COALESCE(SUM(size), 0) as total FROM w3_fileInfo')
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
    } catch (error) {
      console.error('Database status error:', error);
      const errorResponse: ErrorResponse = {
        error: 'Internal Server Error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to retrieve database status',
        statusCode: 500,
      };
      res.status(500).json(errorResponse);
    }
  }
);

export default router;
