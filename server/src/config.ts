/**
 * Configuration module for environment variables
 * Provides typed access to configuration with sensible defaults
 */

/**
 * Application configuration interface
 */
export interface Config {
  /** Path to WinCatalog SQLite database file */
  dbPath: string;
  /** Server port */
  port: number;
  /** Hour (0-23) for nightly database refresh */
  nightlyRefreshHour: number;
  /** Node environment (development, production, test) */
  nodeEnv: string;
  /** Whether the app is running in production */
  isProduction: boolean;
  /** Whether the app is running in development */
  isDevelopment: boolean;
  /** Whether the app is running in test mode */
  isTest: boolean;
  /** Path to static files directory (built React app) */
  staticPath: string;
  /** Whether to serve static files */
  serveStatic: boolean;
}

/**
 * Default configuration values
 */
const defaults = {
  dbPath: '/data/catalog.w3cat',
  port: 3000,
  nightlyRefreshHour: 0,
  nodeEnv: 'development',
  staticPath: './public',
};

/**
 * Parse integer from environment variable with default
 */
function parseIntEnv(value: string | undefined, defaultValue: number): number {
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    console.warn(
      `Invalid integer value "${value}", using default: ${defaultValue}`
    );
    return defaultValue;
  }
  return parsed;
}

/**
 * Parse and validate nightly refresh hour (0-23)
 */
function parseRefreshHour(value: string | undefined): number {
  const hour = parseIntEnv(value, defaults.nightlyRefreshHour);
  if (hour < 0 || hour > 23) {
    console.warn(
      `Invalid refresh hour ${hour}, must be 0-23. Using default: ${defaults.nightlyRefreshHour}`
    );
    return defaults.nightlyRefreshHour;
  }
  return hour;
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): Config {
  const nodeEnv = process.env.NODE_ENV || defaults.nodeEnv;
  const staticPath = process.env.STATIC_PATH || defaults.staticPath;
  // Serve static files by default in production, or if SERVE_STATIC is explicitly set
  const serveStatic =
    process.env.SERVE_STATIC !== undefined
      ? process.env.SERVE_STATIC === 'true'
      : nodeEnv === 'production';

  return {
    dbPath: process.env.DB_PATH || defaults.dbPath,
    port: parseIntEnv(process.env.PORT, defaults.port),
    nightlyRefreshHour: parseRefreshHour(process.env.NIGHTLY_REFRESH_HOUR),
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isDevelopment: nodeEnv === 'development',
    isTest: nodeEnv === 'test',
    staticPath,
    serveStatic,
  };
}

/**
 * Validate configuration and check for required values
 * Returns array of validation errors (empty if valid)
 */
export function validateConfig(config: Config): string[] {
  const errors: string[] = [];

  // Port should be in valid range
  if (config.port < 1 || config.port > 65535) {
    errors.push(`Invalid port number: ${config.port}. Must be between 1-65535`);
  }

  return errors;
}

/**
 * Singleton config instance
 */
let configInstance: Config | null = null;

/**
 * Get the configuration (loads on first call)
 */
export function getConfig(): Config {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

/**
 * Reset configuration (useful for testing)
 */
export function resetConfig(): void {
  configInstance = null;
}
