CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    type TEXT NOT NULL CHECK(type IN ('moscow', 'eisenhower', 'calendar', 'wsjf')),
    created_at INTEGER NOT NULL,
    priority TEXT CHECK(priority IS NULL OR priority IN ('must', 'should', 'could', 'wont')),
    quadrant TEXT CHECK(quadrant IS NULL OR quadrant IN ('q1', 'q2', 'q3', 'q4')),
    date TEXT,
    status TEXT CHECK(status IS NULL OR status IN ('todo', 'in-progress', 'blocked', 'completed', 'cancelled')) DEFAULT 'todo',
    is_milestone INTEGER DEFAULT 0,
    category TEXT CHECK(category IS NULL OR category IN ('work', 'personal', 'health', 'finance', 'social')),
    color TEXT,
    description TEXT DEFAULT '',
    wsjf_value INTEGER DEFAULT NULL,
    wsjf_time_criticality INTEGER DEFAULT NULL,
    wsjf_risk_reduction INTEGER DEFAULT NULL,
    wsjf_job_size INTEGER DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS journals (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_type_completed ON tasks(type, completed);

-- Enable WAL mode for better concurrent access
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
