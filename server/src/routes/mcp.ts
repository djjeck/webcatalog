import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { type Request, type Response, Router } from 'express';
import { createMcpServer } from '../mcp/server.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  const server = createMcpServer();
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

router.get('/', (_req: Request, res: Response) => {
  res.status(405).json({
    error: 'Method Not Allowed',
    message: 'GET is not supported on the stateless MCP endpoint',
  });
});

router.delete('/', (_req: Request, res: Response) => {
  res.status(405).json({
    error: 'Method Not Allowed',
    message: 'DELETE is not supported on the stateless MCP endpoint',
  });
});

export default router;
