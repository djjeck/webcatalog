# WebCatalog Server Dockerfile
# Multi-stage build for optimal image size

# =============================================================================
# Stage 1: Build stage
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for dependency installation
COPY server/package*.json ./server/

# Install all dependencies (including dev for building)
WORKDIR /app/server
RUN npm ci

# Copy source files
COPY server/tsconfig.json ./
COPY server/src ./src

# Build TypeScript to JavaScript
RUN npm run build

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

# Copy package files
COPY server/package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/server/dist ./dist

# Create data directory for database mount
RUN mkdir -p /data && chown nodejs:nodejs /data

# Switch to non-root user
USER nodejs

# Set environment variables (can be overridden at runtime)
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/catalog.w3cat

# Expose the default port (documentation only - actual port determined by PORT env var)
EXPOSE 3000

# Health check using the configured PORT
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["node", "dist/index.js"]
