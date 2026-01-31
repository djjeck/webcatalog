import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/index.js';

// Mock the search service
vi.mock('../../src/services/search.js', () => ({
  executeSearch: vi.fn(),
  executeRandom: vi.fn(),
}));

// Mock the refresh service (used by search service)
vi.mock('../../src/services/refresh.js', () => ({
  checkAndReloadIfChanged: vi.fn().mockResolvedValue(false),
  getLastReloadTime: vi.fn().mockReturnValue(null),
}));

import { executeSearch, executeRandom } from '../../src/services/search.js';

describe('GET /api/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when query parameter is missing', async () => {
    const response = await request(app).get('/api/search');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Bad Request');
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('"q" is required');
    expect(response.body).toHaveProperty('statusCode', 400);
  });

  it('should return 400 when query parameter is empty', async () => {
    const response = await request(app).get('/api/search?q=');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Bad Request');
  });

  it('should return 400 when query parameter is whitespace only', async () => {
    const response = await request(app).get('/api/search?q=   ');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Bad Request');
  });

  it('should return 400 when limit is not a number', async () => {
    const response = await request(app).get('/api/search?q=test&limit=abc');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Bad Request');
    expect(response.body.message).toContain('limit');
  });

  it('should return 400 when limit is negative', async () => {
    const response = await request(app).get('/api/search?q=test&limit=-5');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Bad Request');
    expect(response.body.message).toContain('limit');
  });

  it('should return 400 when offset is not a number', async () => {
    const response = await request(app).get('/api/search?q=test&offset=abc');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Bad Request');
    expect(response.body.message).toContain('offset');
  });

  it('should return 400 when offset is negative', async () => {
    const response = await request(app).get('/api/search?q=test&offset=-10');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Bad Request');
    expect(response.body.message).toContain('offset');
  });

  it('should return search results on valid query', async () => {
    const mockResults = {
      query: 'test',
      results: [
        {
          id: 1,
          name: 'test.txt',
          path: 'E:\\test.txt',
          size: 1024,
          dateModified: '2024-01-15T10:00:00.000Z',
          dateCreated: '2024-01-10T08:00:00.000Z',
          type: 'file',
          volumeName: 'USB Drive',
        },
      ],
      totalResults: 1,
      executionTime: 15,
    };

    vi.mocked(executeSearch).mockResolvedValue(mockResults);

    const response = await request(app).get('/api/search?q=test');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockResults);
    expect(executeSearch).toHaveBeenCalledWith('test', undefined, undefined);
  });

  it('should pass limit and offset to search service', async () => {
    vi.mocked(executeSearch).mockResolvedValue({
      query: 'test',
      results: [],
      totalResults: 0,
      executionTime: 5,
    });

    const response = await request(app).get(
      '/api/search?q=test&limit=50&offset=10'
    );

    expect(response.status).toBe(200);
    expect(executeSearch).toHaveBeenCalledWith('test', 50, 10);
  });

  it('should trim the query string', async () => {
    vi.mocked(executeSearch).mockResolvedValue({
      query: 'test',
      results: [],
      totalResults: 0,
      executionTime: 5,
    });

    const response = await request(app).get('/api/search?q=  test  ');

    expect(response.status).toBe(200);
    expect(executeSearch).toHaveBeenCalledWith('test', undefined, undefined);
  });

  it('should return 500 when search service throws error', async () => {
    vi.mocked(executeSearch).mockRejectedValue(new Error('Database error'));

    const response = await request(app).get('/api/search?q=test');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error', 'Internal Server Error');
    expect(response.body).toHaveProperty('message', 'Database error');
    expect(response.body).toHaveProperty('statusCode', 500);
  });

  it('should handle non-Error exceptions', async () => {
    vi.mocked(executeSearch).mockRejectedValue('Unknown error');

    const response = await request(app).get('/api/search?q=test');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error', 'Internal Server Error');
    expect(response.body.message).toContain('unexpected error');
  });

  it('should handle quoted phrases in query', async () => {
    vi.mocked(executeSearch).mockResolvedValue({
      query: '"exact phrase"',
      results: [],
      totalResults: 0,
      executionTime: 5,
    });

    const response = await request(app).get(
      '/api/search?q=' + encodeURIComponent('"exact phrase"')
    );

    expect(response.status).toBe(200);
    expect(executeSearch).toHaveBeenCalledWith(
      '"exact phrase"',
      undefined,
      undefined
    );
  });

  it('should handle special characters in query', async () => {
    vi.mocked(executeSearch).mockResolvedValue({
      query: 'test%file_name',
      results: [],
      totalResults: 0,
      executionTime: 5,
    });

    const response = await request(app).get(
      '/api/search?q=' + encodeURIComponent('test%file_name')
    );

    expect(response.status).toBe(200);
    expect(executeSearch).toHaveBeenCalledWith(
      'test%file_name',
      undefined,
      undefined
    );
  });
});

describe('GET /api/random', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return a random result', async () => {
    const mockResult = {
      id: 42,
      name: 'random.txt',
      path: '/docs/random.txt',
      size: 512,
      dateModified: '2024-03-01T12:00:00.000Z',
      dateCreated: '2024-03-01T10:00:00.000Z',
      type: 'file' as const,
      volumeName: 'Drive1',
    };

    vi.mocked(executeRandom).mockResolvedValue(mockResult);

    const response = await request(app).get('/api/random');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockResult);
    expect(executeRandom).toHaveBeenCalled();
  });

  it('should return 500 when service throws error', async () => {
    vi.mocked(executeRandom).mockRejectedValue(
      new Error('No items in the database')
    );

    const response = await request(app).get('/api/random');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error', 'Internal Server Error');
  });
});
