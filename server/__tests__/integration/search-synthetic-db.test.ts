/**
 * End-to-end integration tests for the search flow.
 *
 * These tests create a real SQLite database mimicking the WinCatalog schema,
 * initialize the actual DatabaseManager, and exercise the full API stack
 * (routes → services → queries → database) without mocking intermediate layers.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import app from '../../src/index.js';
import { initDatabase, closeDatabase } from '../../src/db/database.js';
import { resetRefreshState } from '../../src/services/refresh.js';

/**
 * Create a temporary WinCatalog-style SQLite database with test data.
 * Returns the path to the temporary file.
 */
function createTestDatabase(dbPath: string): void {
  const db = new Database(dbPath);

  // Create WinCatalog schema tables
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

  // Insert test data:
  // Volume (itype=172)
  db.exec(`
    INSERT INTO w3_items (id, itype, name) VALUES (1, 172, 'Backup Drive');
    INSERT INTO w3_volumeInfo (id_item, root_path) VALUES (1, 'E:\\');
    INSERT INTO w3_decent (id_item, id_parent) VALUES (1, 0);
  `);

  // Folder under volume (itype=200)
  db.exec(`
    INSERT INTO w3_items (id, itype, name) VALUES (2, 200, 'Photos');
    INSERT INTO w3_decent (id_item, id_parent) VALUES (2, 1);
    INSERT INTO w3_fileInfo (id_item, name, size) VALUES (2, 'Photos', NULL);
  `);

  // Sub-folder
  db.exec(`
    INSERT INTO w3_items (id, itype, name) VALUES (3, 200, 'Summer 2024');
    INSERT INTO w3_decent (id_item, id_parent) VALUES (3, 2);
    INSERT INTO w3_fileInfo (id_item, name, size) VALUES (3, 'Summer 2024', NULL);
  `);

  // Files under sub-folder
  db.exec(`
    INSERT INTO w3_items (id, itype, name) VALUES (4, 1, 'vacation-photo.jpg');
    INSERT INTO w3_fileInfo (id_item, name, date_change, date_create, size)
      VALUES (4, 'vacation-photo.jpg', '2024-06-15 10:30:00', '2024-06-15 10:00:00', 2048576);
    INSERT INTO w3_decent (id_item, id_parent) VALUES (4, 3);

    INSERT INTO w3_items (id, itype, name) VALUES (5, 1, 'beach-sunset.png');
    INSERT INTO w3_fileInfo (id_item, name, date_change, date_create, size)
      VALUES (5, 'beach-sunset.png', '2024-06-16 14:00:00', '2024-06-16 13:30:00', 5120000);
    INSERT INTO w3_decent (id_item, id_parent) VALUES (5, 3);

    INSERT INTO w3_items (id, itype, name) VALUES (6, 1, 'vacation-video.mp4');
    INSERT INTO w3_fileInfo (id_item, name, date_change, date_create, size)
      VALUES (6, 'vacation-video.mp4', '2024-06-17 09:00:00', '2024-06-17 08:30:00', 104857600);
    INSERT INTO w3_decent (id_item, id_parent) VALUES (6, 3);
  `);

  // Another folder at volume root
  db.exec(`
    INSERT INTO w3_items (id, itype, name) VALUES (7, 200, 'Documents');
    INSERT INTO w3_decent (id_item, id_parent) VALUES (7, 1);
    INSERT INTO w3_fileInfo (id_item, name, size) VALUES (7, 'Documents', NULL);

    INSERT INTO w3_items (id, itype, name) VALUES (8, 1, 'report.pdf');
    INSERT INTO w3_fileInfo (id_item, name, date_change, date_create, size)
      VALUES (8, 'report.pdf', '2024-01-10 12:00:00', '2024-01-10 11:00:00', 512000);
    INSERT INTO w3_decent (id_item, id_parent) VALUES (8, 7);
  `);

  db.close();
}

describe('End-to-end search integration', () => {
  let tmpDir: string;
  let dbPath: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webcatalog-e2e-'));
    dbPath = path.join(tmpDir, 'test-catalog.w3cat');
    createTestDatabase(dbPath);
    await initDatabase(dbPath, [], 0);
  });

  afterAll(() => {
    closeDatabase();
    resetRefreshState();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('GET /api/search - full flow', () => {
    it('should find files by name', async () => {
      const response = await request(app).get(
        '/api/search?q=' + encodeURIComponent('vacation')
      );

      expect(response.status).toBe(200);
      expect(response.body.query).toBe('vacation');
      expect(response.body.results.length).toBe(2);

      const names = response.body.results.map(
        (r: { name: string }) => r.name
      );
      expect(names).toContain('vacation-photo.jpg');
      expect(names).toContain('vacation-video.mp4');
    });

    it('should return all result fields correctly', async () => {
      const response = await request(app).get('/api/search?q=vacation-photo');

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBe(1);

      const item = response.body.results[0];
      expect(item.name).toBe('vacation-photo.jpg');
      expect(item.size).toBe(2048576);
      expect(item.type).toBe('file');
      expect(item.volumeName).toBe('Backup Drive');
      expect(item.dateModified).toBeTruthy();
      expect(item.dateCreated).toBeTruthy();
      // Path should include the folder hierarchy but not the volume name
      expect(item.path).toContain('Photos');
      expect(item.path).toContain('Summer 2024');
      expect(item.path).toContain('vacation-photo.jpg');
    });

    it('should handle quoted phrase search', async () => {
      const response = await request(app).get(
        '/api/search?q=' + encodeURIComponent('"beach-sunset"')
      );

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBe(1);
      expect(response.body.results[0].name).toBe('beach-sunset.png');
    });

    it('should handle multiple search terms with AND logic', async () => {
      // "vacation" AND "photo" should match vacation-photo.jpg but not vacation-video.mp4
      const response = await request(app).get(
        '/api/search?q=' + encodeURIComponent('vacation photo')
      );

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBe(1);
      expect(response.body.results[0].name).toBe('vacation-photo.jpg');
    });

    it('should return empty results for non-matching query', async () => {
      const response = await request(app).get(
        '/api/search?q=' + encodeURIComponent('nonexistent-file-xyz')
      );

      expect(response.status).toBe(200);
      expect(response.body.results).toEqual([]);
      expect(response.body.totalResults).toBe(0);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app).get(
        '/api/search?q=' + encodeURIComponent('vacation') + '&limit=1'
      );

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBe(1);
    });

    it('should respect offset parameter', async () => {
      const allResponse = await request(app).get('/api/search?q=vacation');
      const offsetResponse = await request(app).get(
        '/api/search?q=vacation&offset=1&limit=10'
      );

      expect(allResponse.body.results.length).toBe(2);
      expect(offsetResponse.body.results.length).toBe(1);
      // The offset result should be the second item from the full results
      expect(offsetResponse.body.results[0].id).toBe(
        allResponse.body.results[1].id
      );
    });

    it('should return results sorted by size descending', async () => {
      const response = await request(app).get('/api/search?q=vacation');

      expect(response.status).toBe(200);
      const sizes = response.body.results.map(
        (r: { size: number }) => r.size
      );
      // vacation-video.mp4 (104857600) should come before vacation-photo.jpg (2048576)
      expect(sizes[0]).toBeGreaterThan(sizes[1]);
    });

    it('should include execution time in response', async () => {
      const response = await request(app).get('/api/search?q=vacation');

      expect(response.status).toBe(200);
      expect(typeof response.body.executionTime).toBe('number');
      expect(response.body.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle special SQL characters safely', async () => {
      const response = await request(app).get(
        '/api/search?q=' + encodeURIComponent("test%_'")
      );

      expect(response.status).toBe(200);
      // Should not throw - SQL injection prevented
      expect(response.body.results).toEqual([]);
    });
  });

  describe('GET /api/search - validation', () => {
    it('should reject missing query parameter', async () => {
      const response = await request(app).get('/api/search');
      expect(response.status).toBe(400);
    });

    it('should reject empty query parameter', async () => {
      const response = await request(app).get('/api/search?q=');
      expect(response.status).toBe(400);
    });

    it('should reject invalid limit', async () => {
      const response = await request(app).get('/api/search?q=test&limit=abc');
      expect(response.status).toBe(400);
    });

    it('should reject negative offset', async () => {
      const response = await request(app).get('/api/search?q=test&offset=-1');
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/random - full flow', () => {
    it('should return a valid random result', async () => {
      const response = await request(app).get('/api/random');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('path');
      expect(response.body).toHaveProperty('type');
      expect(['file', 'folder', 'volume']).toContain(response.body.type);
    });
  });

  describe('GET /api/db-status - full flow', () => {
    it('should return real database statistics', async () => {
      const response = await request(app).get('/api/db-status');

      expect(response.status).toBe(200);
      expect(response.body.connected).toBe(true);
      expect(response.body.path).toBe(dbPath);
      expect(response.body.statistics.totalFiles).toBeGreaterThan(0);
      expect(response.body.statistics.totalVolumes).toBe(1);
    });
  });

  describe('GET /api/health', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('Database reload on file change', () => {
    it('should pick up new data after database file is modified', async () => {
      // First, verify the file doesn't exist yet
      const before = await request(app).get(
        '/api/search?q=' + encodeURIComponent('new-document')
      );
      expect(before.body.results.length).toBe(0);

      // Modify the database file to add a new item
      const db = new Database(dbPath);
      db.exec(`
        INSERT INTO w3_items (id, itype, name) VALUES (100, 1, 'new-document.txt');
        INSERT INTO w3_fileInfo (id_item, name, size)
          VALUES (100, 'new-document.txt', 1024);
        INSERT INTO w3_decent (id_item, id_parent) VALUES (100, 7);
      `);
      db.close();

      // Wait briefly so mtime changes
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Force reload (simulates what checkAndReloadIfChanged does when file changes)
      await initDatabase(dbPath, [], 0);

      const after = await request(app).get(
        '/api/search?q=' + encodeURIComponent('new-document')
      );
      expect(after.body.results.length).toBe(1);
      expect(after.body.results[0].name).toBe('new-document.txt');
    });
  });

  describe('Error scenarios with corrupted database', () => {
    it('should fail gracefully with a non-SQLite file', async () => {
      const badPath = path.join(tmpDir, 'not-a-database.w3cat');
      fs.writeFileSync(badPath, 'this is not a sqlite database');

      await expect(initDatabase(badPath, [], 0)).rejects.toThrow();
    });

    it('should fail gracefully with a missing database file', async () => {
      const missingPath = path.join(tmpDir, 'does-not-exist.w3cat');

      await expect(initDatabase(missingPath, [], 0)).rejects.toThrow();
    });
  });
});
