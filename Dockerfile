# =============================================================================
# TabAla Development Dockerfile
# =============================================================================
# Optimized container for Node.js development with Svelte, TypeScript and Vite.
# Designed for hot-reload development with efficient layer caching.
#
# Build:  docker build -t tabala-dev .
# Run:    docker run -p 5173:5173 -v $(pwd):/app -v /app/node_modules tabala-dev
# =============================================================================

# -----------------------------------------------------------------------------
# Base Image
# -----------------------------------------------------------------------------
# Using Node.js 24.13.0 Alpine for smaller image size (~150MB vs ~1GB full).
# Alpine includes essential tools while maintaining minimal footprint.
FROM node:24.13.0-alpine

# -----------------------------------------------------------------------------
# System Dependencies
# -----------------------------------------------------------------------------
# Git is needed for some npm packages that fetch from repositories.
# Using --no-cache to avoid storing package index and reduce image size.
RUN apk add --no-cache git

# -----------------------------------------------------------------------------
# Working Directory
# -----------------------------------------------------------------------------
WORKDIR /app

# -----------------------------------------------------------------------------
# Environment Configuration
# -----------------------------------------------------------------------------
# NODE_ENV=development enables dev-specific behaviors in Node.js and npm.
# HOST=0.0.0.0 ensures Vite binds to all interfaces (required for Docker).
ENV NODE_ENV=development
ENV HOST=0.0.0.0

# -----------------------------------------------------------------------------
# Dependency Installation (Cached Layer)
# -----------------------------------------------------------------------------
# Copy package files first to leverage Docker's layer caching.
# If dependencies don't change, this layer is reused on subsequent builds.
COPY package*.json ./

# npm ci provides deterministic installs using package-lock.json.
# Faster and more reliable than npm install for CI/CD environments.
RUN npm ci

# -----------------------------------------------------------------------------
# Application Source
# -----------------------------------------------------------------------------
# Copy source code after dependencies to maximize cache efficiency.
# Changes to source code won't invalidate the npm ci layer.
COPY . .

# -----------------------------------------------------------------------------
# Permissions for Non-Root User
# -----------------------------------------------------------------------------
# Ensure the node user can write to the app directory.
# Required for hot-reload and any runtime file operations.
RUN chown -R node:node /app

# -----------------------------------------------------------------------------
# Security: Non-Root User
# -----------------------------------------------------------------------------
# Run as 'node' user (uid 1000) instead of root for security best practices.
# The node user is pre-created in the official Node.js Alpine image.
USER node

# -----------------------------------------------------------------------------
# Port Exposure
# -----------------------------------------------------------------------------
# Vite dev server default port. This is documentation; actual binding
# happens at runtime with docker run -p 5173:5173.
EXPOSE 5173

# -----------------------------------------------------------------------------
# Health Check
# -----------------------------------------------------------------------------
# Verifies the Vite dev server is responding. Used by Docker Compose and
# orchestration tools to determine container readiness.
# - interval: Check every 30 seconds
# - timeout: Wait up to 10 seconds for response
# - start-period: Wait 40 seconds before first check (server startup time)
# - retries: Mark unhealthy after 3 consecutive failures
# Note: Using nc (netcat) which is available in Alpine's busybox.
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD nc -z localhost 5173 || exit 1

# -----------------------------------------------------------------------------
# Default Command
# -----------------------------------------------------------------------------
# Start the Vite development server with hot-reload enabled.
# The -- --host flag ensures Vite binds to 0.0.0.0 for external access.
CMD ["npm", "run", "dev", "--", "--host"]
