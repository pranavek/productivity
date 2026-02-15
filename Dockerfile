FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY server/package.json ./server/
RUN cd server && npm install

# Copy application files
COPY server/ ./server/
COPY public/ ./public/

# Minify CSS and JS files (for production builds without volumes)
RUN cd server && npm run build

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create data directory for SQLite
RUN mkdir -p data

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Use entrypoint to rebuild assets on container start (useful with volumes)
ENTRYPOINT ["docker-entrypoint.sh"]
