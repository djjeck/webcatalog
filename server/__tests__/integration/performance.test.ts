/**
 * Performance tests for search operations against a large synthetic database.
 *
 * Generates a database with 50,000+ items to verify:
 * - Search completes within acceptable time (<1s)
 * - Large result sets are handled correctly with pagination
 * - Result limiting (MAX_LIMIT=1000) is enforced
 * - Database initialization scales reasonably
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import app from '../../src/index.js';
import { initDatabase, closeDatabase } from '../../src/db/database.js';
import { resetRefreshState } from '../../src/services/refresh.js';

const TOTAL_FILES = 500_000;
const TOTAL_FOLDERS = 50_000;
const TOTAL_VOLUMES = 5;

/**
 * Create a large synthetic WinCatalog database for performance testing.
 */
function createLargeTestDatabase(dbPath: string): void {
  const db = new Database(dbPath);

  // Use WAL mode and pragmas for fast inserts
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = OFF');

  db.exec(`
    CREATE TABLE w3_items (
      id INTEGER PRIMARY KEY,
      flags INTEGER,
      itype INTEGER NOT NULL,
      rating INTEGER,
      name TEXT NOT NULL,
      comments TEXT
    );
    CREATE TABLE w3_fileInfo (
      id_item INTEGER NOT NULL,
      name TEXT,
      date_change TEXT,
      date_create TEXT,
      size INTEGER,
      fileflags INTEGER,
      md5 TEXT,
      crc32 TEXT
    );
    CREATE TABLE w3_decent (
      id_item INTEGER NOT NULL,
      id_parent INTEGER,
      expanded TEXT DEFAULT '0'
    );
    CREATE TABLE w3_volumeInfo (
      id_item INTEGER NOT NULL,
      filesys TEXT,
      volume_label TEXT,
      root_path TEXT,
      vtype INTEGER,
      size_total INTEGER,
      size_free INTEGER,
      serial INTEGER,
      disk_number INTEGER,
      scan_preset_id INTEGER,
      date_added TEXT,
      date_updated TEXT
    );
  `);

  let nextId = 1;

  // Insert volumes
  const insertItem = db.prepare(
    'INSERT INTO w3_items (id, itype, name) VALUES (?, ?, ?)'
  );
  const insertFile = db.prepare(
    'INSERT INTO w3_fileInfo (id_item, name, date_change, date_create, size) VALUES (?, ?, ?, ?, ?)'
  );
  const insertDecent = db.prepare(
    'INSERT INTO w3_decent (id_item, id_parent) VALUES (?, ?)'
  );
  const insertVolume = db.prepare(
    'INSERT INTO w3_volumeInfo (id_item, root_path) VALUES (?, ?)'
  );

  const insertAll = db.transaction(() => {
    const volumeIds: number[] = [];
    for (let v = 0; v < TOTAL_VOLUMES; v++) {
      const id = nextId++;
      insertItem.run(id, 172, `Volume_${v}`);
      insertVolume.run(id, `E:\\Volume_${v}`);
      insertDecent.run(id, 0);
      volumeIds.push(id);
    }

    // Insert folders distributed across volumes
    const folderIds: number[] = [];
    for (let f = 0; f < TOTAL_FOLDERS; f++) {
      const id = nextId++;
      const parentVolume = volumeIds[f % TOTAL_VOLUMES];
      const folderName = `folder_${f}`;
      insertItem.run(id, 200, folderName);
      insertFile.run(id, folderName, null, null, null);
      insertDecent.run(id, parentVolume);
      folderIds.push(id);
    }

    // Insert files distributed across folders
    // Use a mix of common and unique names for search testing
    const extensions = [
      '.txt',
      '.pdf',
      '.jpg',
      '.mp4',
      '.doc',
      '.xlsx',
      '.png',
      '.zip',
    ];
    const prefixes = [
      'report',
      'photo',
      'document',
      'backup',
      'data',
      'image',
      'video',
      'archive',
    ];

    for (let i = 0; i < TOTAL_FILES; i++) {
      const id = nextId++;
      const parentFolder = folderIds[i % TOTAL_FOLDERS];
      const prefix = prefixes[i % prefixes.length];
      const ext = extensions[i % extensions.length];
      const fileName = `${prefix}_${i}${ext}`;
      const size = Math.floor(Math.random() * 100_000_000);

      insertItem.run(id, 1, fileName);
      insertFile.run(
        id,
        fileName,
        '2024-06-15 10:00:00',
        '2024-06-15 09:00:00',
        size
      );
      insertDecent.run(id, parentFolder);
    }
  });

  insertAll();
  db.close();
}

describe('Performance tests', () => {
  let tmpDir: string;
  let dbPath: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webcatalog-perf-'));
    dbPath = path.join(tmpDir, 'large-catalog.w3cat');
    createLargeTestDatabase(dbPath);
    await initDatabase(dbPath, [], 0);
  }, 60_000); // Allow up to 60s for DB init with 55K items

  afterAll(() => {
    closeDatabase();
    resetRefreshState();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('search latency', () => {
    it('should complete a single-term search in <1s', async () => {
      const start = performance.now();
      const response = await request(app).get('/api/search?q=report');
      const elapsed = performance.now() - start;

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(1000);
    });

    it('should complete a multi-term search in <1s', async () => {
      const start = performance.now();
      const response = await request(app).get(
        '/api/search?q=' + encodeURIComponent('report .txt')
      );
      const elapsed = performance.now() - start;

      expect(response.status).toBe(200);
      expect(elapsed).toBeLessThan(1000);
    });

    it('should complete a quoted phrase search in <1s', async () => {
      const start = performance.now();
      const response = await request(app).get(
        '/api/search?q=' + encodeURIComponent('"report_0"')
      );
      const elapsed = performance.now() - start;

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(1000);
    });

    it('should complete a no-results search in <1s', async () => {
      const start = performance.now();
      const response = await request(app).get(
        '/api/search?q=xyznonexistent123'
      );
      const elapsed = performance.now() - start;

      expect(response.status).toBe(200);
      expect(response.body.results).toEqual([]);
      expect(elapsed).toBeLessThan(1000);
    });
  });

  describe('large result sets and pagination', () => {
    it('should respect default limit (100) on broad searches', async () => {
      const response = await request(app).get('/api/search?q=report');

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBeLessThanOrEqual(100);
    });

    it('should respect explicit limit', async () => {
      const response = await request(app).get(
        '/api/search?q=report&limit=10'
      );

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBe(10);
    });

    it('should enforce MAX_LIMIT (1000)', async () => {
      const response = await request(app).get(
        '/api/search?q=report&limit=5000'
      );

      expect(response.status).toBe(200);
      // MAX_LIMIT is 1000, so we should get at most 1000
      expect(response.body.results.length).toBeLessThanOrEqual(1000);
    });

    it('should paginate correctly with offset', async () => {
      const page1 = await request(app).get(
        '/api/search?q=report&limit=10&offset=0'
      );
      const page2 = await request(app).get(
        '/api/search?q=report&limit=10&offset=10'
      );

      expect(page1.status).toBe(200);
      expect(page2.status).toBe(200);
      expect(page1.body.results.length).toBe(10);
      expect(page2.body.results.length).toBe(10);

      // Pages should not overlap
      const page1Ids = new Set(
        page1.body.results.map((r: { id: number }) => r.id)
      );
      const hasOverlap = page2.body.results.some((r: { id: number }) =>
        page1Ids.has(r.id)
      );
      expect(hasOverlap).toBe(false);
    });

    it('should return results sorted by size descending', async () => {
      const response = await request(app).get(
        '/api/search?q=report&limit=50'
      );

      expect(response.status).toBe(200);
      const sizes = response.body.results.map(
        (r: { size: number }) => r.size
      );
      for (let i = 1; i < sizes.length; i++) {
        expect(sizes[i - 1]).toBeGreaterThanOrEqual(sizes[i]);
      }
    });
  });

  describe('db-status with large database', () => {
    it('should return correct statistics', async () => {
      const response = await request(app).get('/api/db-status');

      expect(response.status).toBe(200);
      expect(response.body.statistics.totalFiles).toBe(TOTAL_FILES);
      expect(response.body.statistics.totalFolders).toBe(TOTAL_FOLDERS);
      expect(response.body.statistics.totalVolumes).toBe(TOTAL_VOLUMES);
    });
  });
});
