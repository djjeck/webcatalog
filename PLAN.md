# WinCatalog Web UI - Implementation Plan

## Project Overview
A web-based UI for searching WinCatalog SQLite databases. The app provides read-only access with a text-based search interface, deployed as a Docker container compatible with Synology NAS.

## Technology Stack
- **Frontend**: React with TypeScript
- **Backend**: Node.js with TypeScript
- **Database**: SQLite (read-only access)
- **Containerization**: Docker
- **Build Tool**: Vite (for React)
- **Backend Framework**: Express.js
- **Database Library**: better-sqlite3
- **Testing**: Vitest (both frontend and backend)

## Project Structure
```
webcatalog/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API client
│   │   ├── types/         # TypeScript types
│   │   └── App.tsx
│   ├── __tests__/         # Frontend tests
│   ├── package.json
│   └── vite.config.ts
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── db/           # Database access layer
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   └── index.ts
│   ├── __tests__/         # Backend tests
│   └── package.json
├── docker/
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Implementation Phases

### Phase 1: Project Setup & Testing Infrastructure
**Goal**: Initialize the project structure, dependencies, and testing framework

#### Tasks:

✅ **1.1 Initialize Project Structure**
   - Create root directory structure
   - Initialize Git repository
   - Create `.gitignore` for Node.js/TypeScript projects

✅ **1.2 Setup Backend (server/)**
   - Initialize npm project
   - Install production dependencies:
     - `express` - Web framework
     - `better-sqlite3` - SQLite database access
     - `cors` - CORS middleware
     - `node-cron` - Scheduled tasks for nightly refresh
   - Install development dependencies:
     - `typescript`, `@types/node`, `@types/express`, `@types/cors`, `@types/node-cron`
     - `tsx` - TypeScript execution
     - `vitest` - Testing framework
     - `@vitest/coverage-v8` - Coverage reporting
     - `supertest`, `@types/supertest` - HTTP testing
   - Create `tsconfig.json` for backend
   - Setup basic Express server structure (`server/src/index.ts`)

✅ **1.3 Setup Frontend (client/)**
   - Initialize Vite React TypeScript project
   - Install development dependencies:
     - `vitest` - Testing framework
     - `@vitest/ui` - Test UI
     - `@testing-library/react`, `@testing-library/jest-dom` - React testing utilities
     - `jsdom` - DOM environment for tests
   - Configure Vitest in `vite.config.ts`
   - Setup basic React app structure

✅ **1.4 Configure Testing & Quality Tools**
   - Setup coverage thresholds in both `package.json` files:
     - Lines: 80%
     - Functions: 80%
     - Branches: 80%
     - Statements: 80%
   - Add ESLint configuration
   - Add Prettier configuration
   - Create npm scripts in both packages:
     - `dev` - Development server
     - `build` - Production build
     - `test` - Run tests
     - `test:coverage` - Run tests with coverage
     - `test:watch` - Watch mode for tests
     - `lint` - Run linter
     - `lint:fix` - Fix linting issues
     - `typecheck` - TypeScript type checking
     - `format` - Format code
     - `format:check` - Check formatting

✅ **1.5 Setup Root Package Scripts**
   - Create root `package.json` with workspace configuration
   - Install `concurrently` for running multiple scripts
   - Add root scripts:
     - `dev` - Run both frontend and backend
     - `test` - Run all tests
     - `test:coverage` - Coverage for both packages
     - `lint` - Lint both packages
     - `typecheck` - Type check both packages
     - `format` - Format all code

✅ **1.6 Write Initial Tests**
   - Backend: Create test for basic Express server health endpoint
   - Frontend: Create test for App component rendering
   - Run `npm run test:coverage` and ensure it passes

#### Acceptance Criteria:
- ✅ Project structure matches defined layout
- ✅ All npm scripts run without errors
- ✅ `npm run lint` passes
- ✅ `npm run typecheck` passes
- ✅ `npm run format:check` passes
- ✅ `npm run test:coverage` passes with >80% coverage (100% achieved)
- ✅ Git repository initialized with proper `.gitignore`
- ✅ Backend server starts and responds to health check
- ✅ Frontend dev server starts and renders basic UI

---

### Phase 2: Database Schema Discovery
**Goal**: Reverse-engineer the WinCatalog SQLite schema and create type definitions

#### Tasks:

✅ **2.1 Create Schema Extraction Utility**
   - Create `server/src/scripts/inspect-schema.ts`
   - Use better-sqlite3 to query SQLite metadata tables
   - Extract table names, column definitions, indexes, foreign keys
   - Write tests for schema extraction utility

✅ **2.2 Document Database Schema**
   - Run schema extraction on sample WinCatalog database
   - Create `docs/DATABASE_SCHEMA.md` with findings
   - Document all relevant tables and columns:
     - File/folder information tables
     - File path, name, size, type/extension
     - Modified/created dates
     - Drive/volume information
     - Any metadata (tags, descriptions, thumbnails)

✅ **2.3 Create TypeScript Types**
   - Create `server/src/types/database.ts` with interfaces matching schema
   - Create `server/src/types/api.ts` for API request/response types
   - Write type tests to ensure correctness
   - Export types for use in frontend (`client/src/types/api.ts`)

#### Acceptance Criteria:
- ✅ `docs/DATABASE_SCHEMA.md` documents all relevant tables and columns
- ✅ TypeScript types accurately represent database schema
- ⬜ Types are shared between frontend and backend
- ✅ Schema extraction script runs successfully on sample database
- ✅ `npm run typecheck` passes

---

### Phase 3: Backend Development
**Goal**: Build the Node.js API server with full test coverage

#### Tasks:

⬜ **3.1 Database Access Layer** (`server/src/db/`)
   - Create `database.ts`:
     - Initialize SQLite connection with better-sqlite3
     - Implement file modification time checking
     - Implement database reload mechanism
     - Cache database handle in memory
     - Export singleton database instance
   - Write tests for database module:
     - Test connection initialization
     - Test file modification time detection
     - Test database reload on file change
     - Mock filesystem for tests
   - Ensure >80% coverage

⬜ **3.2 Search Query Builder** (`server/src/db/queries.ts`)
   - Implement search query parser:
     - Parse search string into terms and phrases
     - Handle quoted phrases: `"exact phrase"`
     - Split unquoted text by spaces
     - Escape special SQL characters
   - Build parameterized SQL queries with AND conditions
   - Write comprehensive tests:
     - Single term search
     - Multiple terms (AND logic)
     - Quoted phrase search
     - Mixed quoted and unquoted
     - Special characters and SQL injection attempts
     - Empty search string
     - Edge cases
   - Ensure >80% coverage

⬜ **3.3 Search Service** (`server/src/services/search.ts`)
   - Implement search logic:
     - Use query builder to construct SQL
     - Execute search against database
     - Map database results to API types
     - Implement result ranking/sorting
     - Limit result count
   - Write tests:
     - Test search results accuracy
     - Test result mapping
     - Test sorting logic
     - Mock database for tests
   - Ensure >80% coverage

⬜ **3.4 Database Refresh Service** (`server/src/services/refresh.ts`)
   - Implement on-demand refresh:
     - Check file modification time before each search
     - Reload database if changed
   - Implement scheduled refresh:
     - Use node-cron for nightly refresh
     - Configurable refresh hour
   - Write tests:
     - Test modification time checking
     - Test reload triggering
     - Test cron schedule (mock cron)
     - Test error handling
   - Ensure >80% coverage

⬜ **3.5 API Routes** (`server/src/routes/`)
   - Implement endpoints:
     - `GET /api/search?q=<query>` - Search endpoint
     - `GET /api/health` - Health check endpoint
     - `GET /api/db-status` - Database status (last updated, file count, etc.)
   - Write integration tests using supertest:
     - Test all endpoints
     - Test query parameters
     - Test error responses (400, 500)
     - Test search with mock database
   - Ensure >80% coverage

⬜ **3.6 Configuration & Environment**
   - Create `server/src/config.ts` for environment variables:
     - `DB_PATH` - Path to WinCatalog SQLite file
     - `PORT` - Server port (default: 3000)
     - `NIGHTLY_REFRESH_HOUR` - Hour for nightly refresh (default: 0)
     - `NODE_ENV` - Environment
   - Create `.env.example` file
   - Write tests for config module
   - Ensure >80% coverage

⬜ **3.7 Error Handling Middleware**
   - Create error handling middleware
   - Handle database errors gracefully
   - Write tests for error scenarios
   - Ensure >80% coverage

#### Acceptance Criteria:
- ⬜ All backend modules have >80% test coverage
- ⬜ Search query parser handles all specified cases
- ⬜ API endpoints return correct responses
- ⬜ Database reload works on file modification
- ⬜ Nightly refresh is scheduled correctly
- ⬜ All tests pass: `npm run test:coverage`
- ⬜ No type errors: `npm run typecheck`
- ⬜ No lint errors: `npm run lint`
- ⬜ Backend server runs without errors
- ⬜ Manual testing shows search returns expected results

---

### Phase 4: Frontend Development
**Goal**: Build the React search UI with full test coverage

#### Tasks:

⬜ **4.1 API Client** (`client/src/services/api.ts`)
   - Create typed API client using fetch
   - Implement methods:
     - `search(query: string): Promise<SearchResult[]>`
     - `getDbStatus(): Promise<DbStatus>`
     - `healthCheck(): Promise<boolean>`
   - Error handling and request/response typing
   - Write tests:
     - Mock fetch responses
     - Test successful requests
     - Test error handling
     - Test request formatting
   - Ensure >80% coverage

⬜ **4.2 Search Components**
   - Create `SearchBar.tsx`:
     - Input with submit button
     - Handle quoted phrase input
     - Display search syntax help
   - Create `SearchResults.tsx`:
     - Display list of results
     - Show result count
     - Handle empty state
   - Create `ResultItem.tsx`:
     - Display file metadata (name, path, size, date)
     - Copy path to clipboard button
     - Highlight search terms
   - Write component tests:
     - Test rendering
     - Test user interactions
     - Test state changes
     - Mock API calls
   - Ensure >80% coverage

⬜ **4.3 UI Components**
   - Create `StatusBar.tsx`:
     - Show database last updated time
     - Show file count
     - Show connection status
   - Create `EmptyState.tsx`:
     - Show when no search performed
     - Show when no results found
     - Display helpful message
   - Write component tests
   - Ensure >80% coverage

⬜ **4.4 Main App** (`client/src/App.tsx`)
   - Implement layout structure
   - Search state management (useState)
   - Handle search submission
   - Display loading states
   - Display error states
   - Write integration tests:
     - Test full search flow
     - Test error handling
     - Test state transitions
   - Ensure >80% coverage

⬜ **4.5 Styling**
   - Create responsive layout (mobile-first)
   - Style all components with CSS modules or styled-components
   - Implement loading spinner
   - Implement error message styling
   - Add hover states and focus indicators
   - Ensure accessibility (ARIA labels, keyboard navigation)

⬜ **4.6 Advanced Features**
   - Implement search term highlighting in results
   - Copy file path to clipboard functionality
   - Add keyboard shortcuts (Enter to search, Esc to clear)
   - Add result pagination or infinite scroll (if needed)
   - Write tests for all features
   - Ensure >80% coverage

#### Acceptance Criteria:
- ⬜ All frontend components have >80% test coverage
- ⬜ Search UI is responsive on mobile and desktop
- ⬜ Search returns and displays results correctly
- ⬜ Error states display user-friendly messages
- ⬜ Copy to clipboard works
- ⬜ Search term highlighting works
- ⬜ All tests pass: `npm run test:coverage`
- ⬜ No type errors: `npm run typecheck`
- ⬜ No lint errors: `npm run lint`
- ⬜ Manual testing shows good UX
- ⬜ Accessibility audit passes (basic checks)

---

### Phase 5: Integration & End-to-End Testing
**Goal**: Ensure frontend and backend work together correctly

#### Tasks:

⬜ **5.1 Backend Static File Serving**
   - Configure Express to serve built React app
   - Serve `index.html` for all non-API routes (SPA support)
   - Write tests for static file serving
   - Ensure >80% coverage

⬜ **5.2 Integration Testing**
   - Test full search flow from UI to database
   - Test error scenarios:
     - Missing database file
     - Corrupted database
     - Network errors
     - Invalid search queries
   - Test database reload on file change
   - Manual testing with real WinCatalog database

⬜ **5.3 Performance Testing**
   - Test search performance with large databases
   - Test with large result sets (1000+ results)
   - Add result limiting if needed
   - Optimize queries if needed

#### Acceptance Criteria:
- ⬜ Frontend successfully communicates with backend
- ⬜ Search works end-to-end with real database
- ⬜ Error handling works in all scenarios
- ⬜ Database reload works when file changes
- ⬜ Performance is acceptable (<1s for most searches)
- ⬜ All tests pass with >80% coverage

---

### Phase 6: Docker Setup
**Goal**: Containerize the application for deployment

#### Tasks:

⬜ **6.1 Multi-stage Dockerfile** (`docker/Dockerfile`)
   - Stage 1: Build frontend
     - Use Node.js base image
     - Copy client files
     - Run `npm install` and `npm run build`
   - Stage 2: Build backend
     - Copy server files
     - Run `npm install` and `npm run build`
   - Stage 3: Production image
     - Use Node.js Alpine base (lightweight)
     - Copy built frontend to serve statically
     - Copy built backend
     - Install only production dependencies
     - Expose port 3000
     - Set non-root user for security
     - Set entrypoint to start server

⬜ **6.2 Docker Compose** (`docker-compose.yml`)
   - Define service configuration
   - Volume mount for database file (read-only)
   - Environment variable configuration
   - Port mapping (3000:3000)
   - Restart policy (unless-stopped)
   - Health check configuration

⬜ **6.3 Multi-Architecture Support**
   - Configure Docker buildx for multi-arch builds
   - Test build for both AMD64 and ARM64
   - Document build commands

⬜ **6.4 Docker Testing**
   - Build Docker image
   - Run container with sample database
   - Test all functionality in container
   - Test volume mounts
   - Test environment variables
   - Test Synology NAS compatibility (if available)

#### Acceptance Criteria:
- ⬜ Docker image builds successfully
- ⬜ Container runs and serves application correctly
- ⬜ Database volume mount works (read-only)
- ⬜ Environment variables configure correctly
- ⬜ Health check endpoint works
- ⬜ Multi-architecture builds work (AMD64 and ARM64)
- ⬜ Image size is reasonable (<500MB)
- ⬜ Container restarts on failure
- ⬜ All features work in containerized environment

---

### Phase 7: Documentation & Deployment
**Goal**: Create comprehensive documentation and deployment guides

#### Tasks:

⬜ **7.1 README Documentation**
   - Project description and overview
   - Features list
   - Requirements
   - Quick start guide
   - Local development setup
   - Docker deployment guide
   - Environment variables documentation
   - Search syntax documentation
   - Troubleshooting section

⬜ **7.2 Docker Deployment Guide**
   - Docker Compose deployment steps
   - Volume mounting instructions
   - Environment variable examples
   - Network configuration
   - Reverse proxy setup (nginx/traefik)

⬜ **7.3 Synology NAS Guide**
   - Synology Container Manager setup steps
   - Volume path configuration for Synology
   - Port configuration
   - Auto-start configuration
   - Screenshots of setup process

⬜ **7.4 User Guide**
   - How to use the search interface
   - Search syntax examples:
     - Single term: `vacation`
     - Multiple terms: `vacation photos`
     - Exact phrase: `"vacation photos"`
     - Mixed: `vacation "summer 2024" photos`
   - Copy path feature
   - Keyboard shortcuts

⬜ **7.5 Developer Guide**
   - Architecture overview
   - Code structure
   - Testing guidelines
   - Contributing guide
   - Release process

⬜ **7.6 Build & Publish**
   - Tag version (v1.0.0)
   - Build final Docker image
   - Test on target environment
   - Optional: Push to Docker Hub
   - Create GitHub release

#### Acceptance Criteria:
- ⬜ README is comprehensive and clear
- ⬜ All deployment scenarios are documented
- ⬜ User guide covers all features
- ⬜ Developer guide enables contribution
- ⬜ Docker image is published (if applicable)
- ⬜ Version is tagged in Git
- ⬜ Documentation has no broken links
- ⬜ Screenshots are included where helpful

---

## Search Implementation Details

### Search Query Parser
Input: `one two "exact phrase" three`

Parsed as:
- Term: `one`
- Term: `two`
- Phrase: `exact phrase`
- Term: `three`

SQL Query Logic:
```sql
WHERE
  (filename LIKE '%one%' OR filepath LIKE '%one%') AND
  (filename LIKE '%two%' OR filepath LIKE '%two%') AND
  (filename LIKE '%exact phrase%' OR filepath LIKE '%exact phrase%') AND
  (filename LIKE '%three%' OR filepath LIKE '%three%')
```

### Parser Algorithm:
1. Find all quoted strings and extract them as phrases
2. Remove quoted strings from input
3. Split remaining text by spaces to get individual terms
4. Combine phrases and terms into search tokens
5. Build SQL query with AND conditions for each token

---

## Database File Monitoring Strategy

Since database updates are rare, use a simple on-demand approach:

1. **On Search Request**:
   - Check file modification time before executing search
   - If changed since last load, reload database connection
   - Cache the modification time

2. **Nightly Refresh**:
   - Schedule automatic database reload at configured hour (default: midnight)
   - Ensures fresh data even if file timestamp doesn't change
   - Uses `node-cron` or similar scheduling library

3. **On Reload**:
   - Close existing connection
   - Open new connection
   - Update cached modification time
   - Log reload event

---

## Environment Variables

| Variable               | Description                          | Default            |
| ---------------------- | ------------------------------------ | ------------------ |
| `DB_PATH`              | Path to WinCatalog SQLite file       | `/data/catalog.db` |
| `PORT`                 | Server port                          | `3000`             |
| `NIGHTLY_REFRESH_HOUR` | Hour (0-23) for nightly refresh      | `0` (midnight)     |
| `NODE_ENV`             | Environment (development/production) | `production`       |

---

## Docker Volume Mounts

```yaml
volumes:
  - /path/to/wincatalog.db:/data/catalog.db:ro
```

Note: `:ro` flag for read-only access

---

## Testing Strategy

### Coverage Requirements
- Minimum 80% coverage for all metrics (lines, functions, branches, statements)
- Tests run automatically before commits (pre-commit hook)
- Tests run in CI/CD pipeline

### Test Types

1. **Unit Tests**
   - Test individual functions and modules
   - Mock external dependencies
   - Fast execution

2. **Integration Tests**
   - Test API endpoints with supertest
   - Test component interactions
   - Use test database

3. **End-to-End Tests**
   - Test full user flows
   - Test with real database
   - Manual testing

### Test Organization
```
server/__tests__/
  ├── unit/
  │   ├── db/
  │   ├── services/
  │   └── utils/
  └── integration/
      └── routes/

client/__tests__/
  ├── unit/
  │   ├── components/
  │   └── services/
  └── integration/
      └── App.test.tsx
```

---

## Overall Success Criteria

- ⬜ Search returns accurate results from WinCatalog database
- ⬜ Quoted phrase search works correctly
- ⬜ Multiple search terms work with AND logic
- ⬜ Database reloads when file changes
- ⬜ Nightly refresh works correctly
- ⬜ Docker container runs on Synology NAS
- ⬜ UI is responsive and user-friendly
- ⬜ All tests pass with >80% coverage
- ⬜ No type errors in codebase
- ⬜ No lint errors in codebase
- ⬜ Documentation is complete and clear
- ⬜ No authentication required (network-protected)

---

## Future Enhancements (Optional)

- Advanced filters (file type, size range, date range)
- Sort options (name, size, date)
- Export search results (CSV, JSON)
- Thumbnail previews for images
- Recently searched terms
- Search history
- Keyboard shortcuts (beyond basic)
- Dark mode theme
- Multiple database support
- Search result bookmarking
- Virtual drive status indicators
