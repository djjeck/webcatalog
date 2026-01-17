import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/index.js';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  stat: vi.fn(),
}));

// Mock the database module
vi.mock('../../src/db/database.js', () => ({
  getDatabase: vi.fn(),
}));

// Mock the refresh service
vi.mock('../../src/services/refresh.js', () => ({
  checkAndReloadIfChanged: vi.fn().mockResolvedValue(false),
  getLastReloadTime: vi.fn(),
}));

import { stat } from 'fs/promises';
import { getDatabase } from '../../src/db/database.js';
import { getLastReloadTime } from '../../src/services/refresh.js';

describe('GET /api/db-status', () => {
  let mockDb: {
    prepare: ReturnType<typeof vi.fn>;
  };
  let mockDbManager: {
    getDb: ReturnType<typeof vi.fn>;
    getPath: ReturnType<typeof vi.fn>;
    getLastModified: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    const createMockStatement = (returnValue: object) => ({
      get: vi.fn().mockReturnValue(returnValue),
    });

    mockDb = {
      prepare: vi.fn((sql: string) => {
        if (sql.includes('COUNT(*)') && sql.includes('w3_items')) {
          if (sql.includes('NOT IN')) {
            return createMockStatement({ count: 1000 }); // files
          } else if (sql.includes('IN (1, 2, 3)')) {
            return createMockStatement({ count: 200 }); // folders
          } else if (sql.includes('= 172')) {
            return createMockStatement({ count: 5 }); // volumes
          } else {
            return createMockStatement({ count: 1205 }); // total items
          }
        }
        if (sql.includes('SUM(size)')) {
          return createMockStatement({ total: 1073741824 }); // 1GB
        }
        return createMockStatement({ count: 0 });
      }),
    };

    mockDbManager = {
      getDb: vi.fn().mockReturnValue(mockDb),
      getPath: vi.fn().mockReturnValue('/data/catalog.db'),
      getLastModified: vi.fn().mockReturnValue(1704067200000), // 2024-01-01
    };

    vi.mocked(getDatabase).mockReturnValue(mockDbManager as any);
    vi.mocked(stat).mockResolvedValue({
      size: 52428800, // 50MB
      mtimeMs: 1704067200000, // 2024-01-01
    } as any);
    vi.mocked(getLastReloadTime).mockReturnValue(null);
  });

  it('should return database status', async () => {
    const response = await request(app).get('/api/db-status');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('connected', true);
    expect(response.body).toHaveProperty('path', '/data/catalog.db');
    expect(response.body).toHaveProperty('fileSize', 52428800);
    expect(response.body).toHaveProperty('lastModified');
    expect(response.body).toHaveProperty('lastLoaded');
    expect(response.body).toHaveProperty('statistics');
  });

  it('should return correct statistics', async () => {
    const response = await request(app).get('/api/db-status');

    expect(response.status).toBe(200);
    expect(response.body.statistics).toEqual({
      totalItems: 1205,
      totalFiles: 1000,
      totalFolders: 200,
      totalVolumes: 5,
      totalSize: 1073741824,
    });
  });

  it('should use lastReloadTime when available', async () => {
    const reloadTime = new Date('2024-06-15T10:00:00.000Z');
    vi.mocked(getLastReloadTime).mockReturnValue(reloadTime);

    const response = await request(app).get('/api/db-status');

    expect(response.status).toBe(200);
    expect(response.body.lastLoaded).toBe('2024-06-15T10:00:00.000Z');
  });

  it('should use file modification time when lastReloadTime is null', async () => {
    vi.mocked(getLastReloadTime).mockReturnValue(null);
    mockDbManager.getLastModified.mockReturnValue(1704067200000);

    const response = await request(app).get('/api/db-status');

    expect(response.status).toBe(200);
    expect(response.body.lastLoaded).toBe('2024-01-01T00:00:00.000Z');
  });

  it('should return 500 when database is not initialized', async () => {
    vi.mocked(getDatabase).mockImplementation(() => {
      throw new Error('Database not initialized. Call initDatabase() first.');
    });

    const response = await request(app).get('/api/db-status');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error', 'Internal Server Error');
    expect(response.body.message).toContain('Database not initialized');
  });

  it('should return 500 when file stat fails', async () => {
    vi.mocked(stat).mockRejectedValue(new Error('File not found'));

    const response = await request(app).get('/api/db-status');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error', 'Internal Server Error');
    expect(response.body.message).toContain('File not found');
  });

  it('should return 500 when database query fails', async () => {
    mockDb.prepare.mockImplementation(() => {
      throw new Error('Database query failed');
    });

    const response = await request(app).get('/api/db-status');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error', 'Internal Server Error');
    expect(response.body.message).toContain('Database query failed');
  });

  it('should handle non-Error exceptions', async () => {
    vi.mocked(getDatabase).mockImplementation(() => {
      throw 'Unknown error';
    });

    const response = await request(app).get('/api/db-status');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error', 'Internal Server Error');
    expect(response.body.message).toContain('Failed to retrieve database status');
  });
});
