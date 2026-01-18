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

// Mock better-sqlite3
vi.mock('better-sqlite3', () => {
  const mockDb = {
    close: vi.fn(),
    pragma: vi.fn(),
  };

  return {
    default: vi.fn(() => mockDb),
  };
});

describe('Database Manager', () => {
  const mockDbPath = '/test/path/catalog.w3cat';
  const mockStats = {
    mtimeMs: 1000000,
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
    it('should initialize database connection', async () => {
      await initDatabase(mockDbPath);

      expect(stat).toHaveBeenCalledWith(mockDbPath);
      expect(Database).toHaveBeenCalledWith(mockDbPath, {
        readonly: true,
        fileMustExist: true,
      });
    });

    it('should enable foreign keys', async () => {
      await initDatabase(mockDbPath);

      const db = getDatabase().getDb();
      expect(db.pragma).toHaveBeenCalledWith('foreign_keys = ON');
    });

    it('should close existing connection before reinitializing', async () => {
      await initDatabase(mockDbPath);
      const firstDb = getDatabase().getDb();

      await initDatabase(mockDbPath);

      expect(firstDb.close).toHaveBeenCalled();
    });
  });

  describe('getDatabase', () => {
    it('should return database manager instance', async () => {
      await initDatabase(mockDbPath);

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
      await initDatabase(mockDbPath);

      const db = getDatabase().getDb();
      expect(db).toBeDefined();
    });

    it('should throw error if database not initialized', async () => {
      await initDatabase(mockDbPath);
      closeDatabase();

      expect(() => getDatabase()).toThrow(
        'Database not initialized. Call initDatabase() first.'
      );
    });
  });

  describe('hasFileChanged', () => {
    it('should return false if file has not changed', async () => {
      await initDatabase(mockDbPath);

      const changed = await getDatabase().hasFileChanged();
      expect(changed).toBe(false);
    });

    it('should return true if file has been modified', async () => {
      await initDatabase(mockDbPath);

      // Simulate file modification
      vi.mocked(stat).mockResolvedValue({
        mtimeMs: 2000000, // Later timestamp
      } as any);

      const changed = await getDatabase().hasFileChanged();
      expect(changed).toBe(true);
    });

    it('should return false on error checking file stats', async () => {
      await initDatabase(mockDbPath);

      vi.mocked(stat).mockRejectedValue(new Error('File not found'));

      const changed = await getDatabase().hasFileChanged();
      expect(changed).toBe(false);
    });
  });

  describe('reloadIfChanged', () => {
    it('should reload database if file has changed', async () => {
      await initDatabase(mockDbPath);
      const originalDb = getDatabase().getDb();

      // Simulate file modification
      vi.mocked(stat).mockResolvedValue({
        mtimeMs: 2000000,
      } as any);

      const reloaded = await getDatabase().reloadIfChanged();

      expect(reloaded).toBe(true);
      expect(originalDb.close).toHaveBeenCalled();
    });

    it('should not reload database if file has not changed', async () => {
      await initDatabase(mockDbPath);
      const originalDb = getDatabase().getDb();

      const reloaded = await getDatabase().reloadIfChanged();

      expect(reloaded).toBe(false);
      expect(originalDb.close).not.toHaveBeenCalled();
    });
  });

  describe('reload', () => {
    it('should force reload database', async () => {
      await initDatabase(mockDbPath);
      const originalDb = getDatabase().getDb();

      await getDatabase().reload();

      expect(originalDb.close).toHaveBeenCalled();
      expect(Database).toHaveBeenCalledTimes(2); // Initial + reload
    });
  });

  describe('close', () => {
    it('should close database connection', async () => {
      await initDatabase(mockDbPath);
      const db = getDatabase().getDb();

      getDatabase().close();

      expect(db.close).toHaveBeenCalled();
    });

    it('should handle close when no database is open', async () => {
      await initDatabase(mockDbPath);
      getDatabase().close();

      // Should not throw
      expect(() => getDatabase().close()).not.toThrow();
    });
  });

  describe('closeDatabase', () => {
    it('should close database and reset singleton', async () => {
      await initDatabase(mockDbPath);

      closeDatabase();

      expect(() => getDatabase()).toThrow(
        'Database not initialized. Call initDatabase() first.'
      );
    });
  });

  describe('getPath', () => {
    it('should return database file path', async () => {
      await initDatabase(mockDbPath);

      const path = getDatabase().getPath();
      expect(path).toBe(mockDbPath);
    });
  });

  describe('getLastModified', () => {
    it('should return last modified timestamp', async () => {
      await initDatabase(mockDbPath);

      const lastModified = getDatabase().getLastModified();
      expect(lastModified).toBe(mockStats.mtimeMs);
    });

    it('should update last modified after reload', async () => {
      await initDatabase(mockDbPath);

      vi.mocked(stat).mockResolvedValue({
        mtimeMs: 3000000,
      } as any);

      await getDatabase().reload();

      const lastModified = getDatabase().getLastModified();
      expect(lastModified).toBe(3000000);
    });
  });
});
