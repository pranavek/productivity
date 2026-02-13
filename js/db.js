/**
 * Secure SQLite Database Layer
 * Uses existing SQLite WASM with parameterized queries for security
 */

let worker = null;
let initPromise = null;
let messageId = 0;
const pendingMessages = new Map();

async function initDB() {
    if (worker) return worker;
    if (initPromise) return initPromise;

    initPromise = new Promise((resolve, reject) => {
        worker = new Worker('/js/sqlite/db-worker.js?v=' + Date.now());

        worker.onmessage = (e) => {
            const { id, type, result, error } = e.data;

            if (type === 'ready') {
                console.log('Database ready');
                resolve(worker);
                return;
            }

            if (type === 'error') {
                console.error('Database error:', error);
                reject(new Error(error));
                return;
            }

            const pending = pendingMessages.get(id);
            if (pending) {
                pendingMessages.delete(id);
                if (error) {
                    pending.reject(new Error(error));
                } else {
                    pending.resolve(result);
                }
            }
        };

        worker.onerror = (err) => {
            console.error('Worker error:', err);
            reject(err);
        };
    });

    return initPromise;
}

// Helper to send messages to worker with proper error handling
function workerExec(method, ...args) {
    return new Promise(async (resolve, reject) => {
        try {
            await initDB();
            const id = ++messageId;
            pendingMessages.set(id, { resolve, reject });
            worker.postMessage({ id, method, args });

            // Timeout after 30 seconds
            setTimeout(() => {
                if (pendingMessages.has(id)) {
                    pendingMessages.delete(id);
                    reject(new Error('Database operation timed out'));
                }
            }, 30000);
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Task Operations using SQLite with parameterized queries
 */
const TaskDB = {
    async add(task) {
        await initDB();

        const { id, ...rest } = task;
        const dataStr = JSON.stringify(rest);

        // Use parameterized query for security
        await workerExec('execParams',
            'INSERT INTO tasks (data) VALUES (?)',
            [dataStr]
        );

        const newId = await workerExec('selectValue', 'SELECT last_insert_rowid()');
        return newId;
    },

    async getAll() {
        await initDB();

        const rows = await workerExec('selectArray', 'SELECT id, data FROM tasks');

        return rows.map(([id, dataStr]) => {
            try {
                const obj = JSON.parse(dataStr);
                obj.id = id;
                return obj;
            } catch (e) {
                console.error('Error parsing task row:', id, e);
                return null;
            }
        }).filter(Boolean);
    },

    async update(task) {
        await initDB();

        const { id, ...rest } = task;
        if (!id) throw new Error("Task update failed: Missing ID");

        const dataStr = JSON.stringify(rest);

        // Use parameterized query for security
        await workerExec('execParams',
            'UPDATE tasks SET data = ? WHERE id = ?',
            [dataStr, id]
        );

        return id;
    },

    async delete(id) {
        await initDB();

        // Use parameterized query for security
        await workerExec('execParams',
            'DELETE FROM tasks WHERE id = ?',
            [id]
        );
    },

    async clearAll() {
        await initDB();
        await workerExec('exec', 'DELETE FROM tasks');
    }
};

/**
 * Journal Operations using SQLite with parameterized queries
 */
const JournalDB = {
    async save(journal) {
        await initDB();

        const { id, ...rest } = journal;
        if (!id) throw new Error("Journal save failed: Missing ID");

        const dataStr = JSON.stringify(rest);

        // Use parameterized query for security
        await workerExec('execParams',
            'INSERT OR REPLACE INTO journals (id, data) VALUES (?, ?)',
            [id, dataStr]
        );

        return id;
    },

    async get(id) {
        await initDB();

        // Use parameterized query for security
        const rows = await workerExec('selectArrayParams',
            'SELECT id, data FROM journals WHERE id = ?',
            [id]
        );

        if (rows.length === 0) return null;

        const [dbId, dataStr] = rows[0];
        try {
            const obj = JSON.parse(dataStr);
            obj.id = dbId;
            return obj;
        } catch (e) {
            console.error('Error parsing journal:', e);
            return null;
        }
    },

    async getAll() {
        await initDB();

        const rows = await workerExec('selectArray', 'SELECT id, data FROM journals');

        return rows.map(([id, dataStr]) => {
            try {
                const obj = JSON.parse(dataStr);
                obj.id = id;
                return obj;
            } catch (e) {
                console.error('Error parsing journal:', id, e);
                return null;
            }
        }).filter(Boolean);
    },

    async delete(id) {
        await initDB();

        // Use parameterized query for security
        await workerExec('execParams',
            'DELETE FROM journals WHERE id = ?',
            [id]
        );
    }
};

/**
 * Backup and Restore Operations
 */
const BackupDB = {
    async export() {
        try {
            await initDB();
            const bytes = await workerExec('exportDB');
            const blob = new Blob([bytes], { type: 'application/x-sqlite3' });

            const url = URL.createObjectURL(blob);
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
        try {
            await initDB();
            const arrayBuffer = await file.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);

            await workerExec('importDB', bytes);

            alert('Database restored successfully! The page will now reload.');
            window.location.reload();
        } catch (e) {
            console.error('Import failed:', e);
            alert('Failed to import database. Ensure it is a valid SQLite file.');
            throw e;
        }
    }
};

// Export to global scope
window.TaskDB = TaskDB;
window.JournalDB = JournalDB;
window.BackupDB = BackupDB;
