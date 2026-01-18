import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadConfig,
  validateConfig,
  getConfig,
  resetConfig,
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

      const config = loadConfig();

      expect(config.dbPath).toBe('/data/catalog.db');
      expect(config.port).toBe(3000);
      expect(config.nightlyRefreshHour).toBe(0);
      expect(config.nodeEnv).toBe('development');
    });

    it('should read DB_PATH from environment', () => {
      process.env.DB_PATH = '/custom/path/catalog.db';

      const config = loadConfig();

      expect(config.dbPath).toBe('/custom/path/catalog.db');
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
  });

  describe('validateConfig', () => {
    it('should return empty array for valid development config', () => {
      const config: Config = {
        dbPath: '/custom/path.db',
        port: 3000,
        nightlyRefreshHour: 0,
        nodeEnv: 'development',
        isProduction: false,
        isDevelopment: true,
        isTest: false,
      };

      const errors = validateConfig(config);

      expect(errors).toEqual([]);
    });

    it('should warn when using default DB_PATH in production', () => {
      const config: Config = {
        dbPath: '/data/catalog.db',
        port: 3000,
        nightlyRefreshHour: 0,
        nodeEnv: 'production',
        isProduction: true,
        isDevelopment: false,
        isTest: false,
      };

      const errors = validateConfig(config);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('DB_PATH should be explicitly set');
    });

    it('should not warn about default DB_PATH in development', () => {
      const config: Config = {
        dbPath: '/data/catalog.db',
        port: 3000,
        nightlyRefreshHour: 0,
        nodeEnv: 'development',
        isProduction: false,
        isDevelopment: true,
        isTest: false,
      };

      const errors = validateConfig(config);

      expect(errors).toEqual([]);
    });

    it('should error on invalid port (too low)', () => {
      const config: Config = {
        dbPath: '/path.db',
        port: 0,
        nightlyRefreshHour: 0,
        nodeEnv: 'development',
        isProduction: false,
        isDevelopment: true,
        isTest: false,
      };

      const errors = validateConfig(config);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Invalid port number');
    });

    it('should error on invalid port (too high)', () => {
      const config: Config = {
        dbPath: '/path.db',
        port: 70000,
        nightlyRefreshHour: 0,
        nodeEnv: 'development',
        isProduction: false,
        isDevelopment: true,
        isTest: false,
      };

      const errors = validateConfig(config);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Invalid port number');
    });

    it('should accept valid port at boundaries', () => {
      const configLow: Config = {
        dbPath: '/path.db',
        port: 1,
        nightlyRefreshHour: 0,
        nodeEnv: 'development',
        isProduction: false,
        isDevelopment: true,
        isTest: false,
      };

      const configHigh: Config = {
        dbPath: '/path.db',
        port: 65535,
        nightlyRefreshHour: 0,
        nodeEnv: 'development',
        isProduction: false,
        isDevelopment: true,
        isTest: false,
      };

      expect(validateConfig(configLow)).toEqual([]);
      expect(validateConfig(configHigh)).toEqual([]);
    });

    it('should return multiple errors when multiple issues exist', () => {
      const config: Config = {
        dbPath: '/data/catalog.db',
        port: 0,
        nightlyRefreshHour: 0,
        nodeEnv: 'production',
        isProduction: true,
        isDevelopment: false,
        isTest: false,
      };

      const errors = validateConfig(config);

      expect(errors).toHaveLength(2);
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
