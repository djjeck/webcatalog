// Load environment variables from .env file (no-op if file doesn't exist)
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/index.js';
import { getConfig, validateConfig } from './config.js';
import { initDatabase } from './db/database.js';
import { scheduleHourlyRefresh, startWatching } from './services/refresh.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { createStaticMiddleware } from './middleware/static.js';

const app = express();
const config = getConfig();

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api', apiRoutes);

// Static file serving (in production or when explicitly enabled)
if (config.serveStatic) {
  app.use(createStaticMiddleware(config.staticPath));
}

// Error handling (must be after routes)
// Only use notFoundHandler when not serving static files (static middleware handles its own 404)
if (!config.serveStatic) {
  app.use(notFoundHandler);
}
app.use(errorHandler);

/**
 * Initialize the application
 * - Validates configuration
 * - Connects to database
 * - Schedules hourly refresh
 */
async function initialize(): Promise<void> {
  // Validate configuration
  const configErrors = validateConfig(config);
  if (configErrors.length > 0) {
    console.warn('Configuration warnings:');
    configErrors.forEach((error) => console.warn(`  - ${error}`));
  }

  // Initialize database
  console.log(`Initializing database from: ${config.dbPath}`);
  await initDatabase(config.dbPath, config.excludePatterns, config.minFileSize);
  console.log('Database initialized successfully');

  // Watch database file for changes (proactive reload)
  startWatching(config.dbPath);

  // Schedule hourly refresh check (safety net for missed fs.watch events)
  scheduleHourlyRefresh();
}

// Start server only if not in test environment
/* c8 ignore start */
if (!config.isTest) {
  initialize()
    .then(() => {
      app.listen(config.port, () => {
        console.log(`Server running on port ${config.port}`);
        console.log(`Environment: ${config.nodeEnv}`);
      });
    })
    .catch((error) => {
      console.error('Failed to initialize application:', error);
      process.exit(1);
    });
}
/* c8 ignore stop */

export default app;
export { initialize };
