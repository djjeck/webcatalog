import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/index.js';

vi.mock('../../src/services/search.js', () => ({
  executeSearch: vi.fn(),
  executeRandom: vi.fn(),
}));

vi.mock('../../src/services/refresh.js', () => ({
  checkAndReloadIfChanged: vi.fn().mockResolvedValue(false),
  getLastReloadTime: vi.fn().mockReturnValue(null),
}));

import { executeSearch } from '../../src/services/search.js';
import type { SearchResponse } from '../../src/types/api.js';

const PROTOCOL_VERSION = '2025-03-26';

const MCP_HEADERS = {
  'content-type': 'application/json',
  accept: 'application/json, text/event-stream',
};

/**
 * The MCP transport responds with SSE (text/event-stream).
 * Parse the first data: line from the SSE body.
 */
function parseSseBody(text: string): unknown {
  for (const line of text.split('\n')) {
    if (line.startsWith('data:')) {
      return JSON.parse(line.slice('data:'.length).trim());
    }
  }
  return null;
}

const initializeRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: { name: 'test-client', version: '0.0.1' },
  },
};

describe('POST /mcp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should respond to an initialize request', async () => {
    const response = await request(app).post('/mcp').set(MCP_HEADERS).send(initializeRequest);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/event-stream');
    const body = parseSseBody(response.text) as Record<string, unknown>;
    expect(body).not.toBeNull();
    expect(body.jsonrpc).toBe('2.0');
    expect(body.id).toBe(1);
    const result = body.result as Record<string, unknown>;
    expect(result).toHaveProperty('serverInfo');
    expect((result.serverInfo as Record<string, unknown>).name).toBe('webcatalog');
    expect(result).toHaveProperty('capabilities');
  });

  it('should respond to a tools/list request', async () => {
    const listToolsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    };

    const listRes = await request(app).post('/mcp').set(MCP_HEADERS).send(listToolsRequest);
    expect(listRes.status).toBe(200);
    const body = parseSseBody(listRes.text) as Record<string, unknown>;
    const result = body?.result as Record<string, unknown>;
    const tools = (result?.tools ?? []) as { name: string }[];
    const names = tools.map((t) => t.name);
    expect(names).toContain('search');
  });

  it('should call executeSearch when tools/call search is invoked', async () => {
    const mockResponse: SearchResponse = {
      query: 'vacation',
      results: [],
      totalResults: 0,
      executionTime: 1,
    };
    vi.mocked(executeSearch).mockResolvedValue(mockResponse);

    const callToolRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'search',
        arguments: { query: 'vacation', limit: 10, offset: 0 },
      },
    };

    const response = await request(app).post('/mcp').set(MCP_HEADERS).send(callToolRequest);

    expect(response.status).toBe(200);
    expect(executeSearch).toHaveBeenCalledWith('vacation', 10, 0);
    const body = parseSseBody(response.text) as Record<string, unknown>;
    const result = body?.result as Record<string, unknown>;
    const content = result?.content as { type: string; text: string }[];
    expect(Array.isArray(content)).toBe(true);
    expect(content[0].type).toBe('text');
    const parsed = JSON.parse(content[0].text) as SearchResponse;
    expect(parsed.query).toBe('vacation');
  });

  it('should use default limit and offset when not specified', async () => {
    const mockResponse: SearchResponse = {
      query: 'photos',
      results: [],
      totalResults: 0,
      executionTime: 1,
    };
    vi.mocked(executeSearch).mockResolvedValue(mockResponse);

    const callToolRequest = {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'search',
        arguments: { query: 'photos' },
      },
    };

    const response = await request(app).post('/mcp').set(MCP_HEADERS).send(callToolRequest);

    expect(response.status).toBe(200);
    expect(executeSearch).toHaveBeenCalledWith('photos', 100, 0);
  });
});

describe('GET /mcp', () => {
  it('should return 405', async () => {
    const response = await request(app).get('/mcp');
    expect(response.status).toBe(405);
    expect(response.body.error).toBe('Method Not Allowed');
  });
});

describe('DELETE /mcp', () => {
  it('should return 405', async () => {
    const response = await request(app).delete('/mcp');
    expect(response.status).toBe(405);
    expect(response.body.error).toBe('Method Not Allowed');
  });
});
