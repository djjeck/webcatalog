# WinCatalog Web UI - Implementation Plan

## Project Vision

A web-based UI for searching WinCatalog SQLite databases, providing read-only text-based search via a React frontend and Express.js backend, deployed as a Docker container compatible with Synology NAS.

## Implementation Phases

### Phase 1: Project Setup & Testing Infrastructure ✅

Initialized the project structure, npm workspaces, TypeScript configuration, ESLint/Prettier, Vitest with coverage thresholds, and CI-ready npm scripts for both client and server.

### Phase 2: Database Schema Discovery ✅

Reverse-engineered the WinCatalog SQLite schema, documented it in `docs/DATABASE_SCHEMA.md`, and created corresponding TypeScript types for the database and API layers.

### Phase 3: Backend Development ✅

Built the full Express.js API server with database access layer, search query parser, search service, scheduled nightly refresh, error handling middleware, environment configuration, Docker setup, and GitHub Actions CI workflow.

### Phase 4: Frontend Development ✅

Built the React search UI with typed API client, search bar, result list, status bar, loading/error states, search term highlighting, keyboard handling, pagination, and full component test coverage.

### Phase 5: Integration & End-to-End Testing ✅

Configured Express to serve the built React app, updated the Dockerfile for the full-stack build, and validated the complete search flow end-to-end including error scenarios and performance with large datasets.

### Phase 6: Multi-Architecture Docker & Production Readiness ✅

Configured Docker buildx for AMD64 and ARM64 multi-arch builds, optimized the image with Alpine and multi-stage builds, hardened security (non-root user), and enhanced docker-compose with restart policy and resource limits.

### Phase 7: Documentation & Deployment ✅

Wrote comprehensive README, Docker deployment guide, Synology NAS guide, user guide, developer guide, and GitHub Actions publish workflow; published v1.0.0 to Docker Hub.

### Phase 8: MCP Endpoint 🔄

Add a Model Context Protocol (MCP) server endpoint to the existing Express app, allowing AI agents to search the WinCatalog database via the standard MCP tool-calling protocol.

#### Sub-tasks

- [ ] **8.1** Add `@modelcontextprotocol/sdk` dependency to `server/package.json`
- [ ] **8.2** Create `server/src/mcp/server.ts` — builds an `McpServer` with a `search` tool backed by `executeSearch`
- [ ] **8.3** Create `server/src/routes/mcp.ts` — stateless Streamable HTTP Express router at `/mcp`
- [ ] **8.4** Register the MCP router in `server/src/index.ts`
- [ ] **8.5** Add unit tests for the MCP server (`__tests__/mcp/server.test.ts`) and integration tests for the route (`__tests__/routes/mcp.test.ts`)
- [ ] **8.6** Update `docs/DEVELOPMENT.md` and `README.md` with MCP endpoint documentation

#### Acceptance Criteria

- `POST /mcp` handles MCP initialize and tool-call requests
- `GET /mcp` returns 405 (stateless — no SSE streaming)
- `DELETE /mcp` returns 405 (stateless — no session management)
- A `search` tool is exposed with `query`, `limit`, and `offset` parameters
- 100% test coverage maintained
