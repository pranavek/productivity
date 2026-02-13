FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY server/package.json ./server/
RUN cd server && npm install --omit=dev

# Copy application files
COPY server/ ./server/
COPY public/ ./public/

# Create data directory for SQLite
RUN mkdir -p data

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server
CMD ["node", "server/server.js"]
