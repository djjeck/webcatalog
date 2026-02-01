import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { stat } from 'fs/promises';
import Database from 'better-sqlite3';
import {
  initDatabase,
  getDatabase,
  closeDatabase,
} from '../../src/db/database.js';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  stat: vi.fn(),
}));

// Mock better-sqlite3 with support for the iterative JS architecture
vi.mock('better-sqlite3', () => {
  const createMockDb = () => ({
    close: vi.fn(),
    exec: vi.fn(),
    prepare: vi.fn(() => ({
      all: vi.fn(() => []),
      get: vi.fn(() => ({ count: 0 })),
      run: vi.fn(),
    })),
    transaction: vi.fn((fn: () => void) => fn),
  });

  return {
    default: vi.fn(createMockDb),
  };
});

describe('Database Manager', () => {
  const mockDbPath = '/test/path/catalog.w3cat';
  const mockStats = {
    mtimeMs: 1000000,
    size: 5000000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    closeDatabase();
    vi.mocked(stat).mockResolvedValue(mockStats as any);
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('initDatabase', () => {
    it('should initialize in-memory database', async () => {
      await initDatabase(mockDbPath, []);

      expect(stat).toHaveBeenCalledWith(mockDbPath);
      // Opens source DB read-only, then creates in-memory DB
      expect(Database).toHaveBeenCalledWith(mockDbPath, { readonly: true });
      expect(Database).toHaveBeenCalledWith(':memory:');
    });

    it('should create search_index table in memory', async () => {
      await initDatabase(mockDbPath, []);

      const db = getDatabase().getDb();
      expect(db.exec).toHaveBeenCalled();
      const execCalls = vi.mocked(db.exec).mock.calls;

      // First exec call creates the search_index table
      expect(execCalls[0][0]).toContain('CREATE TABLE search_index');
    });

    it('should close existing connection before reinitializing', async () => {
      await initDatabase(mockDbPath, []);
      const firstDb = getDatabase().getDb();

      await initDatabase(mockDbPath, []);

      expect(firstDb.close).toHaveBeenCalled();
    });
  });

  describe('getDatabase', () => {
    it('should return database manager instance', async () => {
      await initDatabase(mockDbPath, []);

      const manager = getDatabase();
      expect(manager).toBeDefined();
      expect(manager.getPath()).toBe(mockDbPath);
    });

    it('should throw error if database not initialized', () => {
      expect(() => getDatabase()).toThrow(
        'Database not initialized. Call initDatabase() first.'
      );
    });
  });

  describe('getDb', () => {
    it('should return database instance', async () => {
      await initDatabase(mockDbPath, []);

      const db = getDatabase().getDb();
      expect(db).toBeDefined();
    });

    it('should throw error if database not initialized', async () => {
      await initDatabase(mockDbPath, []);
      closeDatabase();

      expect(() => getDatabase()).toThrow(
        'Database not initialized. Call initDatabase() first.'
      );
    });
  });

  describe('hasFileChanged', () => {
    it('should return false if file has not changed', async () => {
      await initDatabase(mockDbPath, []);

      const changed = await getDatabase().hasFileChanged();
      expect(changed).toBe(false);
    });

    it('should return true if file modification time has changed', async () => {
      await initDatabase(mockDbPath, []);

      // Simulate file modification time change
      vi.mocked(stat).mockResolvedValue({
        mtimeMs: 2000000, // Later timestamp
        size: 5000000, // Same size
      } as any);

      const changed = await getDatabase().hasFileChanged();
      expect(changed).toBe(true);
    });

    it('should return true if file size has changed', async () => {
      await initDatabase(mockDbPath, []);

      // Simulate file size change without modification time change
      vi.mocked(stat).mockResolvedValue({
        mtimeMs: 1000000, // Same timestamp
        size: 6000000, // Different size
      } as any);

      const changed = await getDatabase().hasFileChanged();
      expect(changed).toBe(true);
    });

    it('should return true if both modification time and size have changed', async () => {
      await initDatabase(mockDbPath, []);

      // Simulate both changes
      vi.mocked(stat).mockResolvedValue({
        mtimeMs: 2000000, // Later timestamp
        size: 6000000, // Different size
      } as any);

      const changed = await getDatabase().hasFileChanged();
      expect(changed).toBe(true);
    });

    it('should return false on error checking file stats', async () => {
      await initDatabase(mockDbPath, []);

      vi.mocked(stat).mockRejectedValue(new Error('File not found'));

      const changed = await getDatabase().hasFileChanged();
      expect(changed).toBe(false);
    });
  });

  describe('reloadIfChanged', () => {
    it('should reload database if file has changed', async () => {
      await initDatabase(mockDbPath, []);
      const originalDb = getDatabase().getDb();

      // Simulate file modification
      vi.mocked(stat).mockResolvedValue({
        mtimeMs: 2000000,
        size: 6000000,
      } as any);

      const reloaded = await getDatabase().reloadIfChanged();

      expect(reloaded).toBe(true);
      expect(originalDb.close).toHaveBeenCalled();
    });

    it('should not reload database if file has not changed', async () => {
      await initDatabase(mockDbPath, []);
      const originalDb = getDatabase().getDb();

      const reloaded = await getDatabase().reloadIfChanged();

      expect(reloaded).toBe(false);
      expect(originalDb.close).not.toHaveBeenCalled();
    });
  });

  describe('reload', () => {
    it('should force reload database', async () => {
      await initDatabase(mockDbPath, []);
      const originalDb = getDatabase().getDb();

      await getDatabase().reload();

      expect(originalDb.close).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should close database connection', async () => {
      await initDatabase(mockDbPath, []);
      const db = getDatabase().getDb();

      getDatabase().close();

      expect(db.close).toHaveBeenCalled();
    });

    it('should handle close when no database is open', async () => {
      await initDatabase(mockDbPath, []);
      getDatabase().close();

      // Should not throw
      expect(() => getDatabase().close()).not.toThrow();
    });
  });

  describe('closeDatabase', () => {
    it('should close database and reset singleton', async () => {
      await initDatabase(mockDbPath, []);

      closeDatabase();

      expect(() => getDatabase()).toThrow(
        'Database not initialized. Call initDatabase() first.'
      );
    });
  });

  describe('getPath', () => {
    it('should return database file path', async () => {
      await initDatabase(mockDbPath, []);

      const path = getDatabase().getPath();
      expect(path).toBe(mockDbPath);
    });
  });

  describe('getLastModified', () => {
    it('should return last modified timestamp', async () => {
      await initDatabase(mockDbPath, []);

      const lastModified = getDatabase().getLastModified();
      expect(lastModified).toBe(mockStats.mtimeMs);
    });

    it('should update last modified after reload', async () => {
      await initDatabase(mockDbPath, []);

      vi.mocked(stat).mockResolvedValue({
        mtimeMs: 3000000,
        size: 7000000,
      } as any);

      await getDatabase().reload();

      const lastModified = getDatabase().getLastModified();
      expect(lastModified).toBe(3000000);
    });
  });

  describe('getLastSize', () => {
    it('should return last file size', async () => {
      await initDatabase(mockDbPath, []);

      const lastSize = getDatabase().getLastSize();
      expect(lastSize).toBe(mockStats.size);
    });

    it('should update last size after reload', async () => {
      await initDatabase(mockDbPath, []);

      vi.mocked(stat).mockResolvedValue({
        mtimeMs: 3000000,
        size: 7000000,
      } as any);

      await getDatabase().reload();

      const lastSize = getDatabase().getLastSize();
      expect(lastSize).toBe(7000000);
    });
  });

  describe('exclude pattern validation', () => {
    it('should log error for invalid pattern with slash in middle', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Pattern with slash in the middle is invalid
      await initDatabase(mockDbPath, ['foo/bar/baz']);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid exclude pattern')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('foo/bar/baz')
      );

      consoleSpy.mockRestore();
    });

    it('should not log error for valid filename pattern', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await initDatabase(mockDbPath, ['*.txt']);

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should not log error for valid directory pattern with trailing slash', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await initDatabase(mockDbPath, ['@eaDir/']);

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should not log error for valid directory pattern with trailing /*', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await initDatabase(mockDbPath, ['node_modules/*']);

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
