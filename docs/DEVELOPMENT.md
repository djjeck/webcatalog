# Development Guide

## Local Development

### Prerequisites

- Node.js 20+
- npm

### Install Dependencies

```bash
npm install
```

### Set Up Environment

```bash
cp server/.env.example server/.env
# Edit server/.env to point to your WinCatalog database
```

### Run Development Servers

```bash
npm run dev
```

This starts both frontend (Vite) and backend (Express) in development mode.

### Run Tests

```bash
npm run test:coverage
```

## Project Structure

```
webcatalog/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API client
│   │   └── types/         # TypeScript types
│   └── __tests__/         # Frontend tests
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── db/           # Database access layer
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   └── scripts/      # Utility scripts
│   └── __tests__/         # Backend tests
├── docs/                   # Documentation
└── Dockerfile              # Docker image build
```

## Available Scripts

**Root level** (runs on both client and server):
- `npm run dev` - Start development servers
- `npm run build` - Build for production
- `npm run test` - Run all tests
- `npm run test:coverage` - Run tests with coverage reports
- `npm run lint` - Lint all code
- `npm run typecheck` - TypeScript type checking
- `npm run format` - Format code with Prettier

**Client specific**:
```bash
cd client
npm run dev          # Vite dev server
npm run build        # Production build
npm run preview      # Preview production build
```

**Server specific**:
```bash
cd server
npm run dev          # Development server with auto-reload
npm start            # Production server
```

## Testing

This project aims for 100% test coverage. Tests are written using Vitest.

```bash
npm run test:coverage     # Run all tests with coverage
npm run test:watch        # Watch mode for development
```

Current coverage: **100%** on both frontend and backend.

## Code Quality

The project uses:
- **ESLint** for linting
- **Prettier** for code formatting
- **TypeScript** for type safety
- **Vitest** for testing

All checks run automatically and must pass before committing.

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/search?q=<query>` - Search catalog
- `GET /api/db-status` - Database status and statistics

## Environment Variables

| Variable           | Description                             | Default                          |
| ------------------ | --------------------------------------- | -------------------------------- |
| `DB_PATH`          | Path to WinCatalog `.w3cat` file        | `/data/My WinCatalog File.w3cat` |
| `EXCLUDE_PATTERNS` | Comma-separated patterns to exclude     | (none)                           |
| `PORT`             | Server port                             | `3000`                           |
| `NODE_ENV`         | Environment (development/production)    | `production`                     |
| `MIN_FILE_SIZE`    | Minimum file size to include in results | (none)                           |
| `STATIC_PATH`      | Path to static files directory (the UI) | `./public`                       |

### Exclude Patterns

The `EXCLUDE_PATTERNS` environment variable allows you to filter out files and directories from search results based on filename patterns. This is useful for excluding system files, temporary files, or NAS-specific metadata.

**Pattern Syntax:**
- `*` matches any characters (like a glob wildcard)
- Patterns are matched against filenames only (not full paths)
- Multiple patterns are separated by commas

**Examples:**
```bash
# Exclude common system/temp files
EXCLUDE_PATTERNS="*.tmp,Thumbs.db,.DS_Store"

# Exclude Synology NAS metadata
EXCLUDE_PATTERNS="@eaDir/*,#recycle/*"
```

### Minimum File Size

The `MIN_FILE_SIZE` environment variable excludes files and folders smaller than a given size from search results. This is useful for filtering out small system files or metadata files. Folder sizes are computed from all descendant files (including those below the threshold), then folders whose total size is still below the threshold are also excluded.

**Format:** A number followed by a unit: `b`, `kb`, `mb`, or `gb` (case insensitive).

**Examples:**
```bash
# Exclude files smaller than 100 KB
MIN_FILE_SIZE="100kb"

# Exclude files smaller than 5 MB
MIN_FILE_SIZE="5MB"
```

## Architecture

### Backend

- **Express.js** server with TypeScript
- **better-sqlite3** for fast, synchronous SQLite access
- **Read-only** database access for safety
- **Auto-reload** on database file changes
- **Hourly DB refresh** for reliability

### Frontend

- **React** with TypeScript
- **Vite** for fast builds and HMR
- **Responsive design** for mobile and desktop
- **Client-side search state** management

### Database Access

The application monitors the WinCatalog database file and automatically reloads when changes are detected. This allows you to continue using WinCatalog normally while the web interface stays in sync.

## Staging Deployment

You can build and deploy a dev image to a server on your local network for testing before releasing:

```bash
npm run docker:dev
```

## Releasing

To publish a new version to Docker Hub:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The [publish workflow](../.github/workflows/publish.yml) will automatically build multi-arch images (AMD64 + ARM64) and push them to Docker Hub tagged with the version number and `latest`. You can also trigger a manual build from the Actions tab using `workflow_dispatch`.

**Required GitHub secrets**: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`

## Contributing

This project follows a structured development workflow. See [CLAUDE.md](../CLAUDE.md) for development guidelines.

1. All changes follow [PLAN.md](../PLAN.md)
2. Tests are required (100% coverage goal)
3. Code must pass linting, type checking, and formatting
4. Each change should be self-contained and reviewable
