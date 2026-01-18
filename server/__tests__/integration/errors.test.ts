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

describe('Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('404 Not Found', () => {
    it('should return 404 for unknown API routes', async () => {
      const response = await request(app).get('/api/unknown-endpoint');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not Found');
      expect(response.body).toHaveProperty(
        'message',
        'Route GET /api/unknown-endpoint not found'
      );
      expect(response.body).toHaveProperty('statusCode', 404);
    });

    it('should return 404 for unknown root routes', async () => {
      const response = await request(app).get('/unknown-path');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not Found');
      expect(response.body.message).toContain('/unknown-path');
    });

    it('should return 404 for POST to unknown routes', async () => {
      const response = await request(app).post('/api/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('POST');
      expect(response.body.message).toContain('/api/nonexistent');
    });

    it('should return 404 for PUT to unknown routes', async () => {
      const response = await request(app).put('/api/something');

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('PUT');
    });

    it('should return 404 for DELETE to unknown routes', async () => {
      const response = await request(app).delete('/api/resource/123');

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('DELETE');
    });
  });

  describe('Error Response Format', () => {
    it('should have consistent error response structure', async () => {
      const response = await request(app).get('/api/unknown');

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode');

      expect(typeof response.body.error).toBe('string');
      expect(typeof response.body.message).toBe('string');
      expect(typeof response.body.statusCode).toBe('number');
    });
  });
});
