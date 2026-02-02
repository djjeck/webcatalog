/**
 * Static file serving middleware for SPA support
 * Serves built React app and handles client-side routing
 */

import path from 'path';
import { existsSync } from 'fs';
import express, { type Router, type Request, type Response } from 'express';

/**
 * Create static file serving middleware
 * @param staticPath - Path to the static files directory
 * @returns Express router with static file handling
 */
export function createStaticMiddleware(staticPath: string): Router {
  const router = express.Router();
  const absolutePath = path.resolve(staticPath);

  // Check if the static directory exists
  if (!existsSync(absolutePath)) {
    console.warn(`Static files directory not found: ${absolutePath}`);
    return router;
  }

  const indexPath = path.join(absolutePath, 'index.html');
  const hasIndex = existsSync(indexPath);

  if (!hasIndex) {
    console.warn(`index.html not found in static directory: ${absolutePath}`);
  }

  // Serve static files with caching headers
  router.use(
    express.static(absolutePath, {
      maxAge: '1d',
      etag: true,
      index: false, // We handle index.html manually for SPA routing
    })
  );

  // SPA fallback: serve index.html for all non-file requests
  // This allows client-side routing to work
  if (hasIndex) {
    router.use((_req: Request, res: Response) => {
      res.sendFile(indexPath);
    });
  }

  return router;
}
