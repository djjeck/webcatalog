# WebCatalog Server Dockerfile
# Multi-stage build for optimal image size

# =============================================================================
# Stage 1: Build stage - Build both server and client
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files and workspace package files for dependency installation
COPY package*.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install all dependencies (including dev for building)
RUN npm ci

# Copy server source files
COPY server/tsconfig.json ./server/
COPY server/src ./server/src

# Copy client source files
COPY client/tsconfig.json ./client/
COPY client/tsconfig.app.json ./client/
COPY client/tsconfig.node.json ./client/
COPY client/vite.config.ts ./client/
COPY client/index.html ./client/
COPY client/src ./client/src

# Build TypeScript server
RUN npm run build --workspace=server

# Build React client
RUN npm run build --workspace=client

# =============================================================================
# Stage 2: Production stage
# =============================================================================
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy root package files and server package file
COPY package*.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install only production dependencies
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built server application from builder stage
COPY --from=builder /app/server/dist ./server/dist

# Copy built client application to public directory for static serving
COPY --from=builder /app/client/dist ./public

# Create data directory for database mount
RUN mkdir -p /data && chown nodejs:nodejs /data

# Switch to non-root user
USER nodejs

# Set environment variables (can be overridden at runtime)
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH="/data/My WinCatalog File.w3cat"
ENV STATIC_PATH=./public

# Expose the default port (documentation only - actual port determined by PORT env var)
EXPOSE 3000

# Health check using the configured PORT
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["node", "server/dist/index.js"]
