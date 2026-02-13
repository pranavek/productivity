const express = require('express');
const compression = require('compression');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(compression({
    level: 6, // Compression level (0-9, default 6)
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
        // Don't compress if client doesn't accept gzip
        if (req.headers['x-no-compression']) {
            return false;
        }
        // Use compression filter (compress everything except already compressed files)
        return compression.filter(req, res);
    }
}));
app.use(express.json({limit: '10mb'}));
app.use(express.static(path.join(__dirname, '../public'), {
    maxAge: '1d', // Cache static assets for 1 day
    etag: true // Enable ETag for caching
}));

// Database connection
const dbPath = path.join(__dirname, '../data/productivity.db');
console.log(`Attempting to connect to database at: ${dbPath}`);

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
    console.log(`Creating data directory: ${dataDir}`);
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Database connection error:', err);
        console.error('Server will continue but database operations will fail');
        return;
    }
    console.log('✅ Connected to SQLite database');

    // Initialize schema
    try {
        const schemaPath = path.join(__dirname, 'config/schema.sql');
        console.log(`Reading schema from: ${schemaPath}`);
        const schema = fs.readFileSync(schemaPath, 'utf8');

        db.exec(schema, (err) => {
            if (err) {
                console.error('❌ Schema initialization error:', err);
            } else {
                console.log('✅ Database schema initialized');
            }
        });
    } catch (err) {
        console.error('❌ Error reading schema file:', err);
    }
});

// TEMPORARY MIGRATION ENDPOINT - Remove after running once!
app.get('/api/migrate', (req, res) => {
    console.log('🔄 Running database migration...');

    db.serialize(() => {
        db.run('ALTER TABLE tasks ADD COLUMN status TEXT DEFAULT "todo"', (err) => {
            if (err && !err.message.includes('duplicate column')) {
                console.log('❌ Status column:', err.message);
            } else {
                console.log('✅ Status column added');
            }
        });

        db.run('ALTER TABLE tasks ADD COLUMN is_milestone INTEGER DEFAULT 0', (err) => {
            if (err && !err.message.includes('duplicate column')) {
                console.log('❌ Milestone column:', err.message);
            } else {
                console.log('✅ Milestone column added');
            }
        });

        db.run('ALTER TABLE tasks ADD COLUMN category TEXT', (err) => {
            if (err && !err.message.includes('duplicate column')) {
                console.log('❌ Category column:', err.message);
            } else {
                console.log('✅ Category column added');
            }
        });

        db.run('ALTER TABLE tasks ADD COLUMN color TEXT', (err) => {
            if (err && !err.message.includes('duplicate column')) {
                console.log('❌ Color column:', err.message);
            } else {
                console.log('✅ Color column added');
            }
        });

        db.run('ALTER TABLE tasks ADD COLUMN description TEXT DEFAULT ""', (err) => {
            if (err && !err.message.includes('duplicate column')) {
                console.log('❌ Description column:', err.message);
            } else {
                console.log('✅ Description column added');
            }

            // Migrate existing data after all columns are added
            db.run('UPDATE tasks SET status = "completed" WHERE completed = 1 AND (status IS NULL OR status = "")', (err) => {
                if (err) console.log('Migration update error:', err.message);
                else console.log('✅ Migrated completed tasks to status');
            });

            db.run('UPDATE tasks SET status = "todo" WHERE completed = 0 AND (status IS NULL OR status = "")', (err) => {
                if (err) console.log('Migration update error:', err.message);
                else console.log('✅ Migrated pending tasks to status');
            });

            console.log('🎉 Migration completed!');
            res.json({
                success: true,
                message: 'Database migration completed. Please remove this endpoint and restart the server.'
            });
        });
    });
});

// TASK ENDPOINTS

app.post('/api/tasks/add', (req, res) => {
    const {text, type, completed, createdAt, priority, quadrant, date, status, is_milestone, category, color, description} = req.body;

    db.run(
        'INSERT INTO tasks (text, type, completed, created_at, priority, quadrant, date, status, is_milestone, category, color, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [text, type, completed ? 1 : 0, createdAt, priority, quadrant, date, status || 'todo', is_milestone ? 1 : 0, category, color, description || ''],
        function(err) {
            if (err) return res.status(500).json({error: err.message});
            res.status(201).json({id: this.lastID});
        }
    );
});

app.get('/api/tasks/all', (req, res) => {
    const {type} = req.query;
    const sql = type
        ? 'SELECT * FROM tasks WHERE type = ? ORDER BY created_at DESC'
        : 'SELECT * FROM tasks ORDER BY created_at DESC';

    const params = type ? [type] : [];

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({error: err.message});

        const tasks = rows.map(row => ({
            id: row.id,
            text: row.text,
            type: row.type,
            completed: Boolean(row.completed),
            createdAt: row.created_at,
            priority: row.priority,
            quadrant: row.quadrant,
            date: row.date,
            status: row.status || (row.completed ? 'completed' : 'todo'),
            isMilestone: Boolean(row.is_milestone),
            category: row.category,
            color: row.color,
            description: row.description || ''
        }));

        res.json(tasks);
    });
});

app.put('/api/tasks/update', (req, res) => {
    const {id} = req.query;
    const {text, completed, priority, quadrant, date, status, is_milestone, category, color, description} = req.body;

    db.run(
        'UPDATE tasks SET text = ?, completed = ?, priority = ?, quadrant = ?, date = ?, status = ?, is_milestone = ?, category = ?, color = ?, description = ? WHERE id = ?',
        [text, completed ? 1 : 0, priority, quadrant, date, status, is_milestone ? 1 : 0, category, color, description, id],
        (err) => {
            if (err) return res.status(500).json({error: err.message});
            res.json({success: true});
        }
    );
});

app.delete('/api/tasks/delete', (req, res) => {
    const {id} = req.query;

    db.run('DELETE FROM tasks WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json({error: err.message});
        res.status(204).send();
    });
});

app.delete('/api/tasks/clear', (req, res) => {
    const {type} = req.query;

    db.run('DELETE FROM tasks WHERE type = ?', [type], (err) => {
        if (err) return res.status(500).json({error: err.message});
        res.json({success: true});
    });
});

// Get unique categories
app.get('/api/tasks/categories', (req, res) => {
    db.all(
        'SELECT DISTINCT category FROM tasks WHERE type = ? AND category IS NOT NULL ORDER BY category',
        ['calendar'],
        (err, rows) => {
            if (err) return res.status(500).json({error: err.message});
            res.json(rows.map(r => r.category));
        }
    );
});

// Get summary statistics
app.get('/api/tasks/summary', (req, res) => {
    const {startDate, endDate} = req.query;

    db.all(
        `SELECT
            status,
            category,
            is_milestone,
            COUNT(*) as count
        FROM tasks
        WHERE type = 'calendar'
            AND date >= ?
            AND date <= ?
        GROUP BY status, category, is_milestone`,
        [startDate, endDate],
        (err, rows) => {
            if (err) return res.status(500).json({error: err.message});
            res.json(rows);
        }
    );
});

// JOURNAL ENDPOINTS

app.post('/api/journals/save', (req, res) => {
    const {id, content} = req.body;
    const now = Date.now();

    db.get('SELECT created_at FROM journals WHERE id = ?', [id], (err, row) => {
        const createdAt = row ? row.created_at : now;

        db.run(
            'INSERT OR REPLACE INTO journals (id, content, created_at, updated_at) VALUES (?, ?, ?, ?)',
            [id, content, createdAt, now],
            (err) => {
                if (err) return res.status(500).json({error: err.message});
                res.json({success: true});
            }
        );
    });
});

app.get('/api/journals/get', (req, res) => {
    const {id} = req.query;

    db.get('SELECT id, content FROM journals WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({error: err.message});

        if (!row) {
            return res.json({id, content: ''});
        }

        res.json(row);
    });
});

app.get('/api/journals/all', (req, res) => {
    db.all('SELECT id, content FROM journals ORDER BY id DESC', (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

app.delete('/api/journals/delete', (req, res) => {
    const {id} = req.query;

    db.run('DELETE FROM journals WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json({error: err.message});
        res.json({success: true});
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({status: 'ok', timestamp: Date.now()});
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Productivity Suite server running on http://localhost:${PORT}`);
    console.log(`📁 Serving static files from: ${path.join(__dirname, '../public')}`);
    console.log(`💾 Database location: ${dbPath}`);
    console.log(`🌐 Access the app at: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    db.close();
    process.exit(0);
});
