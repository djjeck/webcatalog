import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { executeSearch } from '../services/search.js';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

export function createMcpServer(): McpServer {
  const server = new McpServer({ name: 'webcatalog', version: '1.0.0' });

  server.registerTool(
    'search',
    {
      title: 'Search catalog',
      description:
        'Search the WinCatalog database for files and folders. ' +
        'Supports multi-term AND search and quoted phrases (e.g. "summer vacation" photos 2024). ' +
        'All searches are case-insensitive and accent-insensitive.',
      inputSchema: {
        query: z.string().describe('Search query string'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_LIMIT)
          .default(DEFAULT_LIMIT)
          .optional()
          .describe(
            'Maximum number of results to return (default: 100, max: 1000)'
          ),
        offset: z
          .number()
          .int()
          .min(0)
          .default(0)
          .optional()
          .describe('Number of results to skip for pagination (default: 0)'),
      },
    },
    async ({ query, limit, offset }) => {
      const response = await executeSearch(query, limit, offset);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response),
          },
        ],
      };
    }
  );

  return server;
}
