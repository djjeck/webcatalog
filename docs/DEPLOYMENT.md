# Deployment Guide

## Building the Docker Image

```bash
# Build for the current platform
docker build -t webcatalog .

# Build for multiple architectures (AMD64 + ARM64)
docker buildx build --platform linux/amd64,linux/arm64 -t webcatalog .

# Build and push multi-arch image to a registry
docker buildx build --platform linux/amd64,linux/arm64 -t your-registry/webcatalog:latest --push .
```

> **Note:** Multi-arch builds require Docker Buildx (included with Docker Desktop).
> The published Docker Hub image (`djjeck/webcatalog`) supports both AMD64 (Intel/AMD)
> and ARM64 (Apple Silicon, Synology NAS) architectures.

## Managing the Container

```bash
# View logs
docker compose logs -f

# Stop the service
docker compose down

# Restart the service
docker compose restart
```

## Synology NAS

### Installing the Image

1. Open **Container Manager** (formerly Docker) on your Synology NAS
2. Go to **Registry**, search for `djjeck/webcatalog`, and download the `latest` tag
   - The image supports both AMD64 and ARM64, so it works on Intel and ARM-based Synology models

### Creating the Container

1. Go to **Image**, select `djjeck/webcatalog`, and click **Run**
2. **General Settings**:
   - Give the container a name (e.g., `webcatalog`)
   - Enable **auto-restart** if desired
3. **Port Settings**:
   - Map a local port (e.g., `3000`) to container port `3000`
4. **Volume Settings**:
   - Click **Add File** and select your `.w3cat` database file
   - Set the mount path to `/data/My WinCatalog File.w3cat`
   - Enable **Read-Only**
5. **Environment Variables** (optional):
   - `EXCLUDE_PATTERNS` — filter out NAS metadata, e.g., `@eaDir/*,#recycle/*,Thumbs.db,.DS_Store`
   - `MIN_FILE_SIZE` — exclude small files, e.g., `100kb`
6. Click **Done** to create and start the container

### Accessing the Interface

Open `http://your-nas-ip:3000` in a browser on any device on your network.

### Updating the Database

When you re-scan drives in WinCatalog and copy the updated `.w3cat` file to your NAS, WebCatalog will detect the change to the savefile automatically. No container restart is needed.

## Troubleshooting

- **Container won't start**: Check that the volume mount path matches exactly `/data/My WinCatalog File.w3cat`
- **No search results**: Verify the `.w3cat` file is a valid WinCatalog database and not empty
- **Permission errors**: Ensure the database file is readable. The container runs as a non-root user
- **Database not updating**: The app detects file changes on savefile change, on each search, or at the hourly refresh. If you replaced the file, try searching again or wait for the next refresh cycle. Restarting the container will also force a refresh
- **Port conflict**: Change the host port in `docker-compose.yml` (e.g., `8080:3000`) if port 3000 is already in use
