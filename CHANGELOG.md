# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.1.0] - 2026-05-13

### Added

- MCP endpoint at `POST /mcp` — AI agents can search the catalog via the [Model Context Protocol](https://modelcontextprotocol.io/) using a stateless Streamable HTTP transport

## [1.0.2] - 2026-05-04

### Changed

- Dependency version upgrades

## [1.0.1] - 2026-03-19

### Added

- Search without diacritics (e.g. accent-insensitive search)

### Changed

- `validate` npm script for running full quality checks in one command
- Auto-publish Docker `dev` tag on push
- npm dependency upgrades
- TypeScript import normalization

## [1.0.0] - 2026-02-02

### Added

- Web-based search UI for WinCatalog SQLite databases
- Text search with multi-term and exact phrase (quoted) support
- Paginated results with "Load more" functionality
- Search term highlighting in results
- Random item function for catalog exploration
- Live database status footer with file/folder/volume counts, DB size, and last update time
- Automatic database reload on file changes
- Exclude patterns filtering via `EXCLUDE_PATTERNS` environment variable (glob wildcards)
- Minimum file size filtering via `MIN_FILE_SIZE` environment variable
- Docker support with multi-architecture images (AMD64/ARM64)
