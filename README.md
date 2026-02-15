# Productivity Suite

A collection of minimal productivity tools designed for focus and clarity. Schedule events on a calendar while simultaneously viewing them through priority frameworks for a multi-dimensional view of your tasks.

## 🛠️ Tools

- **[Calendar](index.html)** *(Default Entry Point)*: Visualize your month and schedule tasks directly onto a calendar. Optionally classify events with Eisenhower quadrants or MoSCoW priorities for cross-tool visibility.
- **[Eisenhower Matrix](eisenhower.html)**: Prioritize tasks by urgency and importance to focus on high-impact goals. Shows both native tasks and classified calendar events.
- **[MoSCoW Prioritizer](moscow.html)**: Categorize tasks into Must, Should, Could, and Won't have to manage project scope effectively. Shows both native tasks and classified calendar events.
- **[Daily Journal](journal.html)**: Capture your thoughts, track your growth, and find clarity with daily entries and history tracking.

## 🚀 Features

- **Cross-Tool Integration**: Calendar events can be tagged with Eisenhower quadrants and/or MoSCoW priorities, automatically appearing on their respective matrix pages with visual distinction (📅 icon, date badges).
- **Dark Mode First**: Sleek, glassmorphic UI designed for concentration.
- **Persistence**: All tasks are saved in a server-side SQLite database for reliable, cross-device access.
- **Vue.js Powered**: Smooth, reactive interface for efficient task management.
- **Containerized**: Easy deployment with Docker for consistent environments with automatic asset minification.

Try me out at https://pranavek.com/productivity

## 📦 Deployment

### Using Pre-built Docker Image

Pull and run the latest image from GitHub Container Registry:

```bash
# Pull the latest image
docker pull ghcr.io/pranavek/productivity:latest

# Run the container
docker run -d \
  -p 9191:3000 \
  -v $(pwd)/data:/app/data \
  --name productivity-suite \
  --restart unless-stopped \
  ghcr.io/pranavek/productivity:latest

# Access at http://localhost:9191
```

Or use with docker-compose by updating your `docker-compose.yml`:
```yaml
services:
  productivity:
    image: ghcr.io/pranavek/productivity:latest
    # Remove the 'build' section when using pre-built image
```

### Docker Deployment

1. Build and start:
   ```bash
   docker-compose up --build -d
   ```

2. Access: http://localhost:9191

3. View logs:
   ```bash
   docker-compose logs -f
   ```

4. Stop:
   ```bash
   docker-compose down
   ```

**Note**: The Docker container automatically minifies CSS and JavaScript files on startup via `docker-entrypoint.sh`, ensuring optimal performance even with volume mounts for development.

### Data Persistence

All data is stored in `data/productivity.db` (SQLite database).

**Backup:**
```bash
cp data/productivity.db data/productivity-backup-$(date +%Y%m%d).db
```

## 🏗️ Architecture

- **Frontend**: Vue 3 (CDN), vanilla CSS with glassmorphic design
- **Backend**: Node.js + Express REST API
- **Database**: SQLite with WAL mode for concurrent access
- **Container**: Docker with Alpine Linux for minimal footprint

