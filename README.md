# WebCatalog

[![CI](https://github.com/djjeck/webcatalog/actions/workflows/ci.yml/badge.svg)](https://github.com/djjeck/webcatalog/actions/workflows/ci.yml)

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

## Quick Start

### Using Docker Compose (Recommended)

1. Create a `docker-compose.yml` file:

```yaml
# docker-compose.yml
services:
  webcatalog:
    image: djjeck/webcatalog:latest
    # For local builds, replace the line above with:
    # build: .
    container_name: webcatalog
    ports:
      - "3000:3000"
    volumes:
      # Mount your WinCatalog database file (read-only)
      # Replace with your actual database path
      - /path/to/your/My WinCatalog File.w3cat:/data/My WinCatalog File.w3cat:ro
    environment:
      - PORT=3000
      # Optional: exclude system/temp files from search results
      - EXCLUDE_PATTERNS=@eaDir/*,*.tmp,Thumbs.db,.DS_Store
      # Optional: exclude files smaller than a given size (e.g. 100kb, 5MB, 1gb)
      - MIN_FILE_SIZE=100kb
    restart: unless-stopped
    # Resource limits (adjust as needed)
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "1.0"
    # Logging configuration
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

2. Start the service:
```bash
docker compose up -d
```

3. Open http://localhost:3000

### Using Docker Run

```bash
docker run -d \
  --name webcatalog \
  -p 3000:3000 \
  -v "/path/to/your/My WinCatalog File.w3cat:/data/My WinCatalog File.w3cat:ro" \
  --restart unless-stopped \
  djjeck/webcatalog:latest
```

## Search Syntax

- **Single term**: `vacation` - Finds files/folders containing "vacation"
- **Multiple terms**: `vacation photos 2024` - Finds items containing all three terms (AND logic)
- **Exact phrase**: `"summer vacation"` - Finds exact phrase
- **Mixed**: `vacation "summer 2024" photos` - Combines phrase and individual terms

All searches are case-insensitive and match partial words.

## Configuration

| Variable           | Description                             | Default                          |
| ------------------ | --------------------------------------- | -------------------------------- |
| `DB_PATH`          | Path to WinCatalog `.w3cat` file        | `/data/My WinCatalog File.w3cat` |
| `EXCLUDE_PATTERNS` | Comma-separated glob patterns to exclude | (none)                          |
| `PORT`             | Server port                             | `3000`                           |
| `MIN_FILE_SIZE`    | Minimum file size to include in results | (none)                           |

See [Development Guide](docs/DEVELOPMENT.md#environment-variables) for full configuration details.

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

## Documentation

- [Development Guide](docs/DEVELOPMENT.md) — local setup, scripts, architecture, releasing
- [Deployment Guide](docs/DEPLOYMENT.md) — Docker builds, Synology NAS, troubleshooting
- [Database Schema](docs/DATABASE_SCHEMA.md) — reverse-engineered WinCatalog schema

## Credits

This project was implemented with assistance from **Claude** (Anthropic's AI assistant), including:
- Project architecture and structure
- Database schema reverse-engineering
- TypeScript implementation
- Test suite development
- Documentation

## License

ISC License - See [LICENSE](LICENSE) for details.

## Disclaimer

This project is not affiliated with, endorsed by, or associated with [WinCatalog](https://www.wincatalog.com/) or its developers. WinCatalog is a product of its respective owners. This is an independent, community project that reads WinCatalog database files for personal use.

---

Made with ❤️ for WinCatalog users who want web access to their catalogs.
