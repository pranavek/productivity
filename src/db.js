/**
 * Database Layer using SQLocal
 * Secure SQLite in the browser with OPFS support
 */

import { SQLocal } from 'sqlocal';

// Initialize SQLocal database
const db = new SQLocal('productivity.sqlite3');
let dbInitialized = false;
let initPromise = null;

// Create tables on initialization
async function initDB() {
    if (dbInitialized) return;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            await db.sql`
                CREATE TABLE IF NOT EXISTS tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    data TEXT NOT NULL
                )
            `;

            await db.sql`
                CREATE TABLE IF NOT EXISTS journals (
                    id TEXT PRIMARY KEY,
                    data TEXT NOT NULL
                )
            `;

            dbInitialized = true;
            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    })();

    return initPromise;
}

/**
 * Task Operations using SQLocal
 * All queries use parameterized statements for security
 */
export const TaskDB = {
    async add(task) {
        await initDB();
        const { id, ...rest } = task;
        const dataStr = JSON.stringify(rest);

        // Secure parameterized query
        await db.sql`INSERT INTO tasks (data) VALUES (\${dataStr})`;

        // Get the auto-generated ID
        const result = await db.sql`SELECT last_insert_rowid() as id`;
        return result[0].id;
    },

    async getAll() {
        await initDB();
        const rows = await db.sql`SELECT id, data FROM tasks`;

        return rows.map(row => {
            try {
                const obj = JSON.parse(row.data);
                obj.id = row.id;
                return obj;
            } catch (e) {
                console.error('Error parsing task row:', row.id, e);
                return null;
            }
        }).filter(Boolean);
    },

    async update(task) {
        await initDB();
        const { id, ...rest } = task;
        if (!id) throw new Error("Task update failed: Missing ID");

        const dataStr = JSON.stringify(rest);

        // Secure parameterized query
        await db.sql`UPDATE tasks SET data = \${dataStr} WHERE id = \${id}`;
        return id;
    },

    async delete(id) {
        await initDB();
        // Secure parameterized query
        await db.sql`DELETE FROM tasks WHERE id = \${id}`;
    },

    async clearAll() {
        await initDB();
        await db.sql`DELETE FROM tasks`;
    }
};

/**
 * Journal Operations using SQLocal
 */
export const JournalDB = {
    async save(journal) {
        await initDB();
        const { id, ...rest } = journal;
        if (!id) throw new Error("Journal save failed: Missing ID");

        const dataStr = JSON.stringify(rest);

        // Secure parameterized query with UPSERT
        await db.sql`INSERT OR REPLACE INTO journals (id, data) VALUES (\${id}, \${dataStr})`;
        return id;
    },

    async get(id) {
        await initDB();
        const rows = await db.sql`SELECT id, data FROM journals WHERE id = \${id}`;

        if (rows.length === 0) return null;

        try {
            const obj = JSON.parse(rows[0].data);
            obj.id = rows[0].id;
            return obj;
        } catch (e) {
            console.error('Error parsing journal:', e);
            return null;
        }
    },

    async getAll() {
        await initDB();
        const rows = await db.sql`SELECT id, data FROM journals`;

        return rows.map(row => {
            try {
                const obj = JSON.parse(row.data);
                obj.id = row.id;
                return obj;
            } catch (e) {
                console.error('Error parsing journal:', row.id, e);
                return null;
            }
        }).filter(Boolean);
    },

    async delete(id) {
        await initDB();
        await db.sql`DELETE FROM journals WHERE id = \${id}`;
    }
};

/**
 * Backup and Restore Operations
 */
export const BackupDB = {
    async export() {
        await initDB();
        try {
            const file = await db.getDatabaseFile();

            const url = URL.createObjectURL(file);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'productivity_backup.sqlite3';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('Database exported successfully');
        } catch (e) {
            console.error('Export failed:', e);
            alert('Failed to export database. See console for details.');
            throw e;
        }
    },

    async import(file) {
        await initDB();
        try {
            await db.overwriteDatabaseFile(file);
            alert('Database restored successfully! The page will now reload.');
            window.location.reload();
        } catch (e) {
            console.error('Import failed:', e);
            alert('Failed to import database. Ensure it is a valid SQLite file.');
            throw e;
        }
    }
};

// Export database instance for direct access if needed
export default db;

