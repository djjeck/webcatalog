# WebCatalog

A web-based UI for searching [WinCatalog](https://www.wincatalog.com/) databases.

## Overview

WinCatalog is a Windows utility that scans external drives and offers a search bar to locate content within these drives. It stores catalog data in SQLite databases with a proprietary schema (`.w3cat` files).

**WebCatalog** provides a simple, web-based interface to search these catalogs without needing the full Windows application. The application is dockerized for easy deployment on any platform, including Synology NAS devices.

## Features

- 🔍 **Text-based search** across file names and paths
- 🌐 **Web interface** accessible from any device
- 🐳 **Docker deployment** for easy installation
- ⚡ **Fast search** with support for multiple search terms
- 🔄 **Auto-reload** when database file changes
- 📦 **Read-only access** to WinCatalog databases
- 💾 **No modification** of original WinCatalog files

## Technology Stack

- **Frontend**: React + TypeScript (Vite)
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite (via better-sqlite3)
- **Testing**: Vitest (100% coverage)
- **Containerization**: Docker

## Quick Start

### Using Docker (Recommended)

```bash
docker run -d \
  --name webcatalog \
  -p 3000:3000 \
  -v /path/to/your/catalog.w3cat:/data/catalog.db:ro \
  webcatalog:latest
```

Then open http://localhost:3000

### Local Development

1. **Prerequisites**
   - Node.js 20+
   - npm

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env to point to your WinCatalog database
   ```

4. **Run development servers**
   ```bash
   npm run dev
   ```

   This starts both frontend (Vite) and backend (Express) in development mode.

5. **Run tests**
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
└── docker/                 # Docker configuration
```

## Search Syntax

- **Single term**: `vacation` - Finds files/folders containing "vacation"
- **Multiple terms**: `vacation photos 2024` - Finds items containing all three terms (AND logic)
- **Exact phrase**: `"summer vacation"` - Finds exact phrase
- **Mixed**: `vacation "summer 2024" photos` - Combines phrase and individual terms

All searches are case-insensitive and match partial words.

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/search?q=<query>` - Search catalog
- `GET /api/db-status` - Database status and statistics

## Environment Variables

| Variable               | Description                          | Default            |
| ---------------------- | ------------------------------------ | ------------------ |
| `DB_PATH`              | Path to WinCatalog `.w3cat` file     | `/data/catalog.db` |
| `PORT`                 | Server port                          | `3000`             |
| `NIGHTLY_REFRESH_HOUR` | Hour (0-23) for automatic DB reload  | `0` (midnight)     |
| `NODE_ENV`             | Environment (development/production) | `production`       |

## Database Schema

The WinCatalog database schema has been reverse-engineered and documented. See [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) for details.

**Key tables**:
- `w3_items` - Main catalog items
- `w3_fileInfo` - File metadata (names, sizes, dates)
- `w3_decent` - Tree structure (parent-child relationships)
- `w3_volumeInfo` - Drive/volume information

## Development

### Available Scripts

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

### Testing

This project aims for 100% test coverage. Tests are written using Vitest.

```bash
npm run test:coverage     # Run all tests with coverage
npm run test:watch        # Watch mode for development
```

Current coverage: **100%** on both frontend and backend.

### Code Quality

The project uses:
- **ESLint** for linting
- **Prettier** for code formatting
- **TypeScript** for type safety
- **Vitest** for testing

All checks run automatically and must pass before committing.

## Deployment

### Docker

1. **Build image**
   ```bash
   docker build -t webcatalog -f docker/Dockerfile .
   ```

2. **Run container**
   ```bash
   docker run -d \
     --name webcatalog \
     -p 3000:3000 \
     -v /path/to/catalog.w3cat:/data/catalog.db:ro \
     -e NIGHTLY_REFRESH_HOUR=2 \
     --restart unless-stopped \
     webcatalog:latest
   ```

### Synology NAS

1. Open **Container Manager** (formerly Docker)
2. Go to **Registry** and search for `webcatalog` (or upload manually)
3. Download the image
4. Go to **Image** and launch the container
5. Configure:
   - **Port**: Map local port 3000 to container port 3000
   - **Volume**: Mount your `.w3cat` file to `/data/catalog.db` (read-only)
   - **Environment**: Set `DB_PATH` if needed
6. Start the container

The web interface will be available at `http://your-nas-ip:3000`

### Docker Compose

```yaml
version: '3.8'

services:
  webcatalog:
    image: webcatalog:latest
    container_name: webcatalog
    ports:
      - "3000:3000"
    volumes:
      - /path/to/your/catalog.w3cat:/data/catalog.db:ro
    environment:
      - DB_PATH=/data/catalog.db
      - NIGHTLY_REFRESH_HOUR=2
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Architecture

### Backend

- **Express.js** server with TypeScript
- **better-sqlite3** for fast, synchronous SQLite access
- **Read-only** database access for safety
- **Auto-reload** on database file changes
- **Nightly refresh** for reliability

### Frontend

- **React** with TypeScript
- **Vite** for fast builds and HMR
- **Responsive design** for mobile and desktop
- **Client-side search state** management

### Database Access

The application monitors the WinCatalog database file and automatically reloads when changes are detected. This allows you to continue using WinCatalog normally while the web interface stays in sync.

## Limitations

- **Read-only**: Cannot modify catalog data (by design)
- **No authentication**: Intended for network-protected environments
- **Basic search**: Text-based search only (no advanced filters yet)
- **No thumbnails**: Image previews not currently supported

## Future Enhancements

See [PLAN.md](PLAN.md) for the complete roadmap. Potential features:

- Advanced search filters (file type, size, date)
- Sort options
- Export search results
- Image thumbnails
- Dark mode
- Search history
- Virtual drive status indicators

## Contributing

This project follows a structured development workflow. See [CLAUDE.md](CLAUDE.md) for development guidelines.

1. All changes follow [PLAN.md](PLAN.md)
2. Tests are required (100% coverage goal)
3. Code must pass linting, type checking, and formatting
4. Each change should be self-contained and reviewable

## License

ISC License - See [LICENSE](LICENSE) for details.

## Links

- [WinCatalog Official Site](https://www.wincatalog.com/)
- [Database Schema Documentation](docs/DATABASE_SCHEMA.md)
- [Implementation Plan](PLAN.md)
- [Development Workflow](CLAUDE.md)

## Credits

This project was implemented with assistance from **Claude** (Anthropic's AI assistant), including:
- Project architecture and structure
- Database schema reverse-engineering
- TypeScript implementation
- Test suite development
- Documentation

## Support

For issues or questions:
1. Check the [Database Schema](docs/DATABASE_SCHEMA.md) documentation
2. Review the [Implementation Plan](PLAN.md)
3. Open an issue on GitHub

---

Made with ❤️ for WinCatalog users who want web access to their catalogs.
