import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/index.js';
import { getConfig, validateConfig } from './config.js';
import { initDatabase } from './db/database.js';
import { scheduleNightlyRefresh } from './services/refresh.js';

const app = express();
const config = getConfig();

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api', apiRoutes);

/**
 * Initialize the application
 * - Validates configuration
 * - Connects to database
 * - Schedules nightly refresh
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
  await initDatabase(config.dbPath);
  console.log('Database initialized successfully');

  // Schedule nightly refresh
  scheduleNightlyRefresh(config.nightlyRefreshHour);
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
