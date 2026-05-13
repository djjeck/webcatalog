import { describe, it, expect, vi } from 'vitest';
import { createMcpServer } from '../../../src/mcp/server.js';

vi.mock('../../../src/services/search.js', () => ({
  executeSearch: vi.fn(),
}));

vi.mock('../../../src/services/refresh.js', () => ({
  checkAndReloadIfChanged: vi.fn().mockResolvedValue(false),
}));

describe('createMcpServer', () => {
  it('should return an McpServer instance', () => {
    const server = createMcpServer();
    expect(server).toBeDefined();
    expect(typeof server.connect).toBe('function');
  });

  it('should register a "search" tool', () => {
    const server = createMcpServer();
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(tools).toHaveProperty('search');
  });
});
