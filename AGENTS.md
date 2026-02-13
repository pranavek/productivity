# Productivity Suite - Agent Documentation

## Project Overview

A collection of minimal productivity tools designed for focus and clarity, featuring a glassmorphic dark mode UI and server-side persistence.

**Live Demo:** https://pranavek.com/productivity

## Architecture

### Technology Stack

- **Frontend:** Vue 3 (CDN), Vanilla CSS with glassmorphic design
- **Backend:** Node.js + Express REST API
- **Database:** SQLite with WAL mode for concurrent access
- **Deployment:** Docker with Alpine Linux

### Design Philosophy

- **No Build Step:** Pure CDN-based Vue 3 for simplicity
- **Unified Data Model:** Single tasks table serves all productivity tools
- **Minimal Dependencies:** Only express, sqlite3, and nodemon
- **Dark Mode First:** Sleek glassmorphic UI optimized for focus
- **Persistence:** Server-side SQLite for cross-device access

## Project Structure

```
productivity/
├── server/
│   ├── server.js              # Express API server
│   ├── config/
│   │   └── schema.sql         # Database schema
│   └── package.json
├── public/
│   ├── index.html             # Landing page
│   ├── eisenhower.html        # Eisenhower Matrix tool
│   ├── moscow.html            # MoSCoW Prioritizer tool
│   ├── todo-calender.html     # Todo Calendar tool
│   ├── journal.html           # Daily Journal tool
│   ├── css/
│   │   └── style.css          # Global styles
│   └── js/
│       ├── api-client.js      # HTTP API client
│       ├── db.js              # IndexedDB fallback
│       ├── eisenhower-vue.js  # Eisenhower component
│       ├── moscow-vue.js      # MoSCoW component
│       ├── calendar-vue.js    # Calendar component
│       └── journal-vue.js     # Journal component
├── data/
│   └── productivity.db        # SQLite database
├── .github/
│   └── workflows/
│       └── docker-publish.yml # CI/CD workflow
├── docker-compose.yml
├── Dockerfile
└── README.md
```

## Core Tools

### 1. Eisenhower Matrix (`eisenhower.html`)
- Prioritize tasks by urgency and importance
- Four quadrants: Urgent & Important, Schedule, Delegate, Eliminate
- Color-coded quadrants (Red, Blue, Amber, Slate)
- Vue component: `eisenhower-vue.js`

### 2. MoSCoW Prioritizer (`moscow.html`)
- Categorize tasks: Must, Should, Could, Won't have
- Visual progress bars showing Must-have ratio
- Warning indicator when Must-haves exceed 60%
- Vue component: `moscow-vue.js`

### 3. Todo Calendar (`todo-calender.html`)
- Monthly calendar view with task management
- Add tasks to specific dates
- Mark tasks as complete
- Navigate between months
- Vue component: `calendar-vue.js`

### 4. Daily Journal (`journal.html`)
- Date-based journal entries
- Auto-save with 1-second debounce
- History sidebar with entry list
- Markdown-friendly textarea
- Vue component: `journal-vue.js`

## Database Schema

### Tasks Table
```sql
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    type TEXT NOT NULL CHECK(type IN ('moscow', 'eisenhower', 'calendar')),
    created_at INTEGER NOT NULL,
    priority TEXT CHECK(priority IS NULL OR priority IN ('must', 'should', 'could', 'wont')),
    quadrant TEXT CHECK(quadrant IS NULL OR quadrant IN ('q1', 'q2', 'q3', 'q4')),
    date TEXT
);
```

**Indexes:**
- `idx_tasks_type` on `type`
- `idx_tasks_type_completed` on `(type, completed)`

### Journals Table
```sql
CREATE TABLE IF NOT EXISTS journals (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

## API Endpoints

### Task Management

- **POST** `/api/tasks/add` - Create new task
- **GET** `/api/tasks/all?type={type}` - Get all tasks (optionally filtered)
- **PUT** `/api/tasks/update?id={id}` - Update task
- **DELETE** `/api/tasks/delete?id={id}` - Delete task
- **DELETE** `/api/tasks/clear?type={type}` - Clear all tasks of type

### Journal Management

- **POST** `/api/journals/save` - Save journal entry (upsert)
- **GET** `/api/journals/get?id={id}` - Get journal entry
- **GET** `/api/journals/all` - Get all journal entries
- **DELETE** `/api/journals/delete?id={id}` - Delete journal entry

### System

- **GET** `/health` - Health check endpoint

## Vue 3 Patterns

### Composition API Structure

All tools follow this pattern:

```javascript
const { createApp, ref, computed, onMounted, watch } = Vue;

createApp({
    setup() {
        // Reactive state
        const tasks = ref([]);
        const newTaskText = ref('');
        const showModal = ref(false);

        // Computed properties
        const filteredTasks = computed(() => {
            return tasks.value.filter(t => t.type === 'calendar');
        });

        // Methods
        const addTask = async () => {
            await TaskDB.add({
                text: newTaskText.value,
                type: 'calendar',
                completed: false,
                createdAt: Date.now()
            });
            await loadTasks();
        };

        const loadTasks = async () => {
            const allTasks = await TaskDB.getAll();
            tasks.value = allTasks.filter(t => t.type === 'calendar');
        };

        // Lifecycle
        onMounted(loadTasks);

        // Return public API
        return {
            tasks,
            newTaskText,
            showModal,
            filteredTasks,
            addTask,
            loadTasks
        };
    }
}).mount('#app');
```

## Design System

### Color Palette

```css
:root {
    --primary-bg: #0f172a;              /* Deep navy base */
    --secondary-bg: #1e293b;            /* Lighter navy for cards */
    --glass-bg: rgba(30, 41, 59, 0.7);  /* Glassmorphism base */
    --border-color: rgba(255, 255, 255, 0.1);
    --text-main: #f8fafc;               /* Off-white text */
    --text-muted: #94a3b8;              /* Muted gray */
    --accent-glow: rgba(59, 130, 246, 0.5);
}
```

### Status Colors

**Eisenhower Quadrants:**
- Q1 (Urgent & Important): `#ef4444` (Red)
- Q2 (Schedule): `#3b82f6` (Blue)
- Q3 (Delegate): `#f59e0b` (Amber)
- Q4 (Eliminate): `#64748b` (Slate)

**MoSCoW Priorities:**
- Must: `#10b981` (Green)
- Should: `#f59e0b` (Amber)
- Could: `#0ea5e9` (Sky Blue)
- Won't: `#f43f5e` (Rose)

### Glassmorphic Effect

```css
.glass-container {
    background: var(--glass-bg);
    backdrop-filter: blur(12px);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
}
```

### Animations

```css
--transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
```

## Development Guide

### Local Development

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Start server:**
   ```bash
   npm start
   ```

3. **Access:** http://localhost:3000

### Docker Deployment

1. **Build and start:**
   ```bash
   docker-compose up -d
   ```

2. **Access:** http://localhost:9191

3. **View logs:**
   ```bash
   docker-compose logs -f
   ```

4. **Stop:**
   ```bash
   docker-compose down
   ```

### Using Pre-built Docker Image

```bash
# Pull latest image
docker pull ghcr.io/YOUR_USERNAME/productivity:latest

# Run container
docker run -d \
  -p 9191:3000 \
  -v $(pwd)/data:/app/data \
  --name productivity-suite \
  --restart unless-stopped \
  ghcr.io/YOUR_USERNAME/productivity:latest
```

## Data Backup

All data is stored in `data/productivity.db` (SQLite database).

**Backup command:**
```bash
cp data/productivity.db data/productivity-backup-$(date +%Y%m%d).db
```

**Restore command:**
```bash
cp data/productivity-backup-YYYYMMDD.db data/productivity.db
```

## Adding New Features

### Adding a New Tool

1. **Create HTML file** in `public/` (e.g., `newtool.html`)
2. **Create Vue component** in `public/js/` (e.g., `newtool-vue.js`)
3. **Add to index.html** landing page
4. **Use existing TaskDB or JournalDB** API
5. **Follow glassmorphic design patterns**

### Extending Database Schema

1. **Update schema.sql** with new columns/tables
2. **Add migration script** if needed
3. **Update API endpoints** in `server.js`
4. **Update frontend data models**
5. **Test backward compatibility**

### Example: Adding a New Field

**Backend (`server.js`):**
```javascript
// Update POST endpoint
const {text, type, completed, createdAt, newField} = req.body;
db.run(
    'INSERT INTO tasks (text, type, completed, created_at, new_field) VALUES (?, ?, ?, ?, ?)',
    [text, type, completed ? 1 : 0, createdAt, newField],
    // ...
);
```

**Frontend (Vue component):**
```javascript
const addTask = async () => {
    await TaskDB.add({
        text: newTaskText.value,
        type: 'calendar',
        completed: false,
        createdAt: Date.now(),
        newField: newFieldValue.value
    });
};
```

## Best Practices

### Frontend

- Use Vue 3 Composition API consistently
- Keep components in single files (no build step)
- Leverage computed properties for derived state
- Use `watch()` with debouncing for auto-save
- Maintain glassmorphic design patterns
- Use CSS custom properties for theming

### Backend

- Use parameterized queries (prevent SQL injection)
- Return appropriate HTTP status codes
- Keep endpoints RESTful and consistent
- Use transactions for multi-step operations
- Enable WAL mode for concurrent access
- Log errors appropriately

### Database

- Use CHECK constraints for data integrity
- Add indexes for frequently queried fields
- Keep schema normalized but pragmatic
- Use INTEGER for booleans (SQLite convention)
- Store dates as ISO strings (YYYY-MM-DD)
- Store timestamps as milliseconds since epoch

## Common Tasks

### Reset All Data

```sql
DELETE FROM tasks WHERE type = 'calendar';
DELETE FROM journals;
```

### View Database Contents

```bash
sqlite3 data/productivity.db
.tables
.schema tasks
SELECT * FROM tasks LIMIT 10;
```

### Update Task Type

```sql
UPDATE tasks SET type = 'new-type' WHERE id = 123;
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000
# Kill process
kill -9 <PID>
```

### Database Locked

SQLite WAL mode should prevent most locking issues. If persistent:
```bash
# Close all connections
# Delete WAL files
rm data/productivity.db-wal
rm data/productivity.db-shm
```

### CORS Issues

Server already has CORS disabled. If issues persist, check browser console for specific errors.

## Performance Considerations

- **SQLite WAL Mode:** Enabled for better concurrent read access
- **Indexes:** Added for type-based and completion-based queries
- **Frontend Caching:** Tasks loaded once, updated reactively
- **Debounced Auto-save:** 1-second delay prevents excessive writes
- **Minimal Bundle:** No build step, CDN Vue 3 only

## Future Enhancement Ideas

- Recurring tasks/events
- Export/import functionality
- Search across all tools
- Tags/labels system
- Analytics dashboard
- Mobile app (PWA)
- Keyboard shortcuts
- Themes (light mode)
- Multi-user support
- Cloud sync

## Contributing

When contributing, maintain:
1. Glassmorphic dark mode design
2. Vue 3 Composition API patterns
3. No build step requirement
4. Server-side persistence
5. Unified data model
6. Responsive design
7. Accessibility standards

## License

[Add your license here]

## Contact

[Add your contact information here]
