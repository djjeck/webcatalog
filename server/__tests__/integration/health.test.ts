import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/index.js';

describe('GET /api/health', () => {
  it('should return 200 and status ok', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
    expect(typeof response.body.timestamp).toBe('string');
  });

  it('should return valid ISO timestamp', async () => {
    const response = await request(app).get('/api/health');

    const timestamp = response.body.timestamp;
    const date = new Date(timestamp);

    expect(date.toISOString()).toBe(timestamp);
  });
});
