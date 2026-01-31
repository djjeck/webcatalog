import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadConfig,
  validateConfig,
  getConfig,
  resetConfig,
  parseFileSize,
  type Config,
} from '../../src/config.js';

describe('Config Module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
    resetConfig();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    resetConfig();
    vi.restoreAllMocks();
  });

  describe('loadConfig', () => {
    it('should return default values when no env vars set', () => {
      delete process.env.DB_PATH;
      delete process.env.PORT;
      delete process.env.NIGHTLY_REFRESH_HOUR;
      delete process.env.NODE_ENV;
      delete process.env.STATIC_PATH;
      delete process.env.SERVE_STATIC;
      delete process.env.EXCLUDE_PATTERNS;

      const config = loadConfig();

      expect(config.dbPath).toBe('/data/My WinCatalog File.w3cat');
      expect(config.port).toBe(3000);
      expect(config.nightlyRefreshHour).toBe(0);
      expect(config.nodeEnv).toBe('development');
      expect(config.staticPath).toBe('./public');
      expect(config.serveStatic).toBe(false); // false in development by default
      expect(config.excludePatterns).toEqual([]);
      expect(config.minFileSize).toBe(0);
    });

    it('should read MIN_FILE_SIZE from environment', () => {
      process.env.MIN_FILE_SIZE = '100kb';

      const config = loadConfig();

      expect(config.minFileSize).toBe(102400);
    });

    it('should read DB_PATH from environment', () => {
      process.env.DB_PATH = '/custom/path/catalog.w3cat';

      const config = loadConfig();

      expect(config.dbPath).toBe('/custom/path/catalog.w3cat');
    });

    it('should read PORT from environment', () => {
      process.env.PORT = '8080';

      const config = loadConfig();

      expect(config.port).toBe(8080);
    });

    it('should read NIGHTLY_REFRESH_HOUR from environment', () => {
      process.env.NIGHTLY_REFRESH_HOUR = '3';

      const config = loadConfig();

      expect(config.nightlyRefreshHour).toBe(3);
    });

    it('should read NODE_ENV from environment', () => {
      process.env.NODE_ENV = 'production';

      const config = loadConfig();

      expect(config.nodeEnv).toBe('production');
      expect(config.isProduction).toBe(true);
      expect(config.isDevelopment).toBe(false);
      expect(config.isTest).toBe(false);
      expect(config.serveStatic).toBe(true); // true by default in production
    });

    it('should read STATIC_PATH from environment', () => {
      process.env.STATIC_PATH = '/custom/static';

      const config = loadConfig();

      expect(config.staticPath).toBe('/custom/static');
    });

    it('should read SERVE_STATIC from environment', () => {
      process.env.SERVE_STATIC = 'true';

      const config = loadConfig();

      expect(config.serveStatic).toBe(true);
    });

    it('should disable static serving when SERVE_STATIC is false', () => {
      process.env.NODE_ENV = 'production';
      process.env.SERVE_STATIC = 'false';

      const config = loadConfig();

      expect(config.serveStatic).toBe(false);
    });

    it('should set isTest correctly', () => {
      process.env.NODE_ENV = 'test';

      const config = loadConfig();

      expect(config.isTest).toBe(true);
      expect(config.isProduction).toBe(false);
      expect(config.isDevelopment).toBe(false);
    });

    it('should set isDevelopment correctly', () => {
      process.env.NODE_ENV = 'development';

      const config = loadConfig();

      expect(config.isDevelopment).toBe(true);
      expect(config.isProduction).toBe(false);
      expect(config.isTest).toBe(false);
    });

    it('should use default for invalid PORT', () => {
      process.env.PORT = 'invalid';

      const config = loadConfig();

      expect(config.port).toBe(3000);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid integer value')
      );
    });

    it('should use default for empty PORT', () => {
      process.env.PORT = '';

      const config = loadConfig();

      expect(config.port).toBe(3000);
    });

    it('should use default for NIGHTLY_REFRESH_HOUR outside range (too high)', () => {
      process.env.NIGHTLY_REFRESH_HOUR = '25';

      const config = loadConfig();

      expect(config.nightlyRefreshHour).toBe(0);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid refresh hour')
      );
    });

    it('should use default for NIGHTLY_REFRESH_HOUR outside range (negative)', () => {
      process.env.NIGHTLY_REFRESH_HOUR = '-5';

      const config = loadConfig();

      expect(config.nightlyRefreshHour).toBe(0);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid refresh hour')
      );
    });

    it('should accept valid NIGHTLY_REFRESH_HOUR at boundary (0)', () => {
      process.env.NIGHTLY_REFRESH_HOUR = '0';

      const config = loadConfig();

      expect(config.nightlyRefreshHour).toBe(0);
    });

    it('should accept valid NIGHTLY_REFRESH_HOUR at boundary (23)', () => {
      process.env.NIGHTLY_REFRESH_HOUR = '23';

      const config = loadConfig();

      expect(config.nightlyRefreshHour).toBe(23);
    });

    it('should use default for invalid NIGHTLY_REFRESH_HOUR', () => {
      process.env.NIGHTLY_REFRESH_HOUR = 'midnight';

      const config = loadConfig();

      expect(config.nightlyRefreshHour).toBe(0);
    });

    it('should parse EXCLUDE_PATTERNS as comma-separated list', () => {
      process.env.EXCLUDE_PATTERNS = '*.tmp,@eaDir/*,Thumbs.db';

      const config = loadConfig();

      expect(config.excludePatterns).toEqual(['*.tmp', '@eaDir/*', 'Thumbs.db']);
    });

    it('should handle single EXCLUDE_PATTERNS value', () => {
      process.env.EXCLUDE_PATTERNS = '*.tmp';

      const config = loadConfig();

      expect(config.excludePatterns).toEqual(['*.tmp']);
    });

    it('should return empty array for empty EXCLUDE_PATTERNS', () => {
      process.env.EXCLUDE_PATTERNS = '';

      const config = loadConfig();

      expect(config.excludePatterns).toEqual([]);
    });

    it('should trim whitespace from EXCLUDE_PATTERNS', () => {
      process.env.EXCLUDE_PATTERNS = ' *.tmp , @eaDir/* , Thumbs.db ';

      const config = loadConfig();

      expect(config.excludePatterns).toEqual(['*.tmp', '@eaDir/*', 'Thumbs.db']);
    });

    it('should filter out empty patterns from EXCLUDE_PATTERNS', () => {
      process.env.EXCLUDE_PATTERNS = '*.tmp,,@eaDir/*';

      const config = loadConfig();

      expect(config.excludePatterns).toEqual(['*.tmp', '@eaDir/*']);
    });
  });

  describe('validateConfig', () => {
    it('should return empty array for valid development config', () => {
      const config: Config = {
        dbPath: '/custom/path.w3cat',
        port: 3000,
        nightlyRefreshHour: 0,
        nodeEnv: 'development',
        isProduction: false,
        isDevelopment: true,
        isTest: false,
        staticPath: './public',
        serveStatic: false,
        excludePatterns: [],
        minFileSize: 0,
      };

      const errors = validateConfig(config);

      expect(errors).toEqual([]);
    });

    it('should error on invalid port (too low)', () => {
      const config: Config = {
        dbPath: '/path.w3cat',
        port: 0,
        nightlyRefreshHour: 0,
        nodeEnv: 'development',
        isProduction: false,
        isDevelopment: true,
        isTest: false,
        staticPath: './public',
        serveStatic: false,
        excludePatterns: [],
        minFileSize: 0,
      };

      const errors = validateConfig(config);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Invalid port number');
    });

    it('should error on invalid port (too high)', () => {
      const config: Config = {
        dbPath: '/path.w3cat',
        port: 70000,
        nightlyRefreshHour: 0,
        nodeEnv: 'development',
        isProduction: false,
        isDevelopment: true,
        isTest: false,
        staticPath: './public',
        serveStatic: false,
        excludePatterns: [],
        minFileSize: 0,
      };

      const errors = validateConfig(config);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Invalid port number');
    });

    it('should accept valid port at boundaries', () => {
      const configLow: Config = {
        dbPath: '/path.w3cat',
        port: 1,
        nightlyRefreshHour: 0,
        nodeEnv: 'development',
        isProduction: false,
        isDevelopment: true,
        isTest: false,
        staticPath: './public',
        serveStatic: false,
        excludePatterns: [],
        minFileSize: 0,
      };

      const configHigh: Config = {
        dbPath: '/path.w3cat',
        port: 65535,
        nightlyRefreshHour: 0,
        nodeEnv: 'development',
        isProduction: false,
        isDevelopment: true,
        isTest: false,
        staticPath: './public',
        serveStatic: false,
        excludePatterns: [],
        minFileSize: 0,
      };

      expect(validateConfig(configLow)).toEqual([]);
      expect(validateConfig(configHigh)).toEqual([]);
    });

    it('should return error for invalid port in production', () => {
      const config: Config = {
        dbPath: '/data/catalog.w3cat',
        port: 0,
        nightlyRefreshHour: 0,
        nodeEnv: 'production',
        isProduction: true,
        isDevelopment: false,
        isTest: false,
        staticPath: './public',
        serveStatic: true,
        excludePatterns: [],
        minFileSize: 0,
      };

      const errors = validateConfig(config);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Invalid port');
    });
  });

  describe('getConfig', () => {
    it('should return config instance', () => {
      const config = getConfig();

      expect(config).toBeDefined();
      expect(config).toHaveProperty('dbPath');
      expect(config).toHaveProperty('port');
    });

    it('should return same instance on multiple calls', () => {
      const config1 = getConfig();
      const config2 = getConfig();

      expect(config1).toBe(config2);
    });

    it('should return new instance after reset', () => {
      process.env.PORT = '4000';
      const config1 = getConfig();

      resetConfig();
      process.env.PORT = '5000';
      const config2 = getConfig();

      expect(config1.port).toBe(4000);
      expect(config2.port).toBe(5000);
    });
  });

  describe('parseFileSize', () => {
    it('should parse bytes', () => {
      expect(parseFileSize('500b')).toBe(500);
    });

    it('should parse kilobytes', () => {
      expect(parseFileSize('100kb')).toBe(102400);
    });

    it('should parse megabytes', () => {
      expect(parseFileSize('5MB')).toBe(5242880);
    });

    it('should parse gigabytes', () => {
      expect(parseFileSize('1gb')).toBe(1073741824);
    });

    it('should be case insensitive', () => {
      expect(parseFileSize('100KB')).toBe(102400);
      expect(parseFileSize('100Kb')).toBe(102400);
      expect(parseFileSize('5Mb')).toBe(5242880);
    });

    it('should return 0 for undefined', () => {
      expect(parseFileSize(undefined)).toBe(0);
    });

    it('should return 0 for empty string', () => {
      expect(parseFileSize('')).toBe(0);
      expect(parseFileSize('  ')).toBe(0);
    });

    it('should return 0 and warn for invalid format', () => {
      expect(parseFileSize('invalid')).toBe(0);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid MIN_FILE_SIZE')
      );
    });

    it('should return 0 and warn for missing unit', () => {
      expect(parseFileSize('100')).toBe(0);
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('resetConfig', () => {
    it('should reset the config singleton', () => {
      const config1 = getConfig();
      resetConfig();
      const config2 = getConfig();

      // They should be different instances (though may have same values)
      expect(config1).not.toBe(config2);
    });
  });
});
