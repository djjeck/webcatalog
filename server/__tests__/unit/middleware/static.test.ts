import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { createStaticMiddleware } from '../../../src/middleware/static.js';

describe('Static Middleware', () => {
  let app: Express;
  let tempDir: string;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    app = express();
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up temp directory if it exists
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('when static directory does not exist', () => {
    it('should warn and return empty router', async () => {
      const nonExistentPath = '/non/existent/path';
      app.use(createStaticMiddleware(nonExistentPath));

      // Should not throw and should return 404 (no routes added)
      const response = await request(app).get('/');
      expect(response.status).toBe(404);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Static files directory not found')
      );
    });
  });

  describe('when static directory exists but has no index.html', () => {
    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'static-test-'));
      // Create a static file but no index.html
      fs.writeFileSync(path.join(tempDir, 'style.css'), 'body { color: red; }');
    });

    it('should warn about missing index.html', () => {
      createStaticMiddleware(tempDir);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('index.html not found')
      );
    });

    it('should serve static files', async () => {
      app.use(createStaticMiddleware(tempDir));

      const response = await request(app).get('/style.css');
      expect(response.status).toBe(200);
      expect(response.text).toBe('body { color: red; }');
    });

    it('should return 404 for non-existent files', async () => {
      app.use(createStaticMiddleware(tempDir));

      const response = await request(app).get('/nonexistent.js');
      expect(response.status).toBe(404);
    });
  });

  describe('when static directory exists with index.html', () => {
    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'static-test-'));
      // Create index.html and other files
      fs.writeFileSync(
        path.join(tempDir, 'index.html'),
        '<!DOCTYPE html><html><body>Hello</body></html>'
      );
      fs.writeFileSync(path.join(tempDir, 'app.js'), 'console.log("app");');
      fs.mkdirSync(path.join(tempDir, 'assets'));
      fs.writeFileSync(
        path.join(tempDir, 'assets', 'logo.png'),
        'fake-image-data'
      );
    });

    it('should serve index.html for root path', async () => {
      app.use(createStaticMiddleware(tempDir));

      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Hello');
    });

    it('should serve static files', async () => {
      app.use(createStaticMiddleware(tempDir));

      const response = await request(app).get('/app.js');
      expect(response.status).toBe(200);
      expect(response.text).toBe('console.log("app");');
    });

    it('should serve files in subdirectories', async () => {
      app.use(createStaticMiddleware(tempDir));

      const response = await request(app).get('/assets/logo.png');
      expect(response.status).toBe(200);
      // Binary content is in body buffer
      expect(response.body.toString()).toBe('fake-image-data');
    });

    it('should serve index.html for client-side routes (SPA fallback)', async () => {
      app.use(createStaticMiddleware(tempDir));

      // These paths don't exist as files, so should fall back to index.html
      const response1 = await request(app).get('/about');
      expect(response1.status).toBe(200);
      expect(response1.text).toContain('Hello');

      const response2 = await request(app).get('/users/123');
      expect(response2.status).toBe(200);
      expect(response2.text).toContain('Hello');

      const response3 = await request(app).get('/deep/nested/route');
      expect(response3.status).toBe(200);
      expect(response3.text).toContain('Hello');
    });

    it('should set caching headers on static files', async () => {
      app.use(createStaticMiddleware(tempDir));

      const response = await request(app).get('/app.js');
      expect(response.headers['cache-control']).toContain('max-age');
    });
  });

  describe('integration with API routes', () => {
    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'static-test-'));
      fs.writeFileSync(
        path.join(tempDir, 'index.html'),
        '<!DOCTYPE html><html><body>App</body></html>'
      );
    });

    it('should not interfere with API routes when mounted after', async () => {
      // API routes first
      app.get('/api/test', (_req, res) => {
        res.json({ message: 'api' });
      });
      // Static middleware second
      app.use(createStaticMiddleware(tempDir));

      const apiResponse = await request(app).get('/api/test');
      expect(apiResponse.status).toBe(200);
      expect(apiResponse.body).toEqual({ message: 'api' });

      const staticResponse = await request(app).get('/');
      expect(staticResponse.status).toBe(200);
      expect(staticResponse.text).toContain('App');
    });
  });
});
