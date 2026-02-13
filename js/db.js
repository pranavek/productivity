/* eslint-disable no-console */
const DB_NAME = '/productivity.sqlite3';

let worker = null;
let initPromise = null;
let messageId = 0;
const pendingMessages = new Map();

async function initDB() {
    if (worker) return worker;
    if (initPromise) return initPromise;

    initPromise = new Promise((resolve, reject) => {
        worker = new Worker('js/db-worker.js');

        worker.onmessage = (e) => {
            const { id, type, result, error } = e.data;

            if (type === 'ready') {
                console.log('Main: Worker ready');
                resolve(worker);
                return;
            }

            if (type === 'error') {
                console.error('Main: Worker error:', error);
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
            console.error('Main: Worker error:', err);
            reject(err);
        };
    });

    return initPromise;
}

// Helper to send messages to worker and get results
function workerExec(method, ...args) {
    return new Promise(async (resolve, reject) => {
        await initDB();
        const id = ++messageId;
        pendingMessages.set(id, { resolve, reject });
        worker.postMessage({ id, method, args });
    });
}

/**
 * Task Operations using SQLite
 * Stores task objects as JSON in 'data' column.
 */
const TaskDB = {
    async add(task) {
        await initDB();
        // Exclude ID from the stored JSON to avoid confusion, 
        // effectively letting SQLite manage the ID. 
        // Or we can store the ID inside the JSON too? 
        // IndexedDB assigns ID "on insert".
        // Use copy to avoid mutating original
        const { id, ...rest } = task;

        const dataStr = JSON.stringify(rest);

        await workerExec('exec', `INSERT INTO tasks (data) VALUES ('${dataStr.replace(/'/g, "''")}')`);

        // Retrieve the auto-generated ID
        // selectValue is a helper in oo1
        const newId = await workerExec('selectValue', 'SELECT last_insert_rowid()');
        return newId;
    },

    async getAll() {
        await initDB();
        const rows = await workerExec('selectArray', 'SELECT id, data FROM tasks');
        return rows.map(([id, dataStr]) => {
            try {
                // row is [id, data]
                const obj = JSON.parse(dataStr);
                obj.id = id; // Ensure ID matches DB
                return obj;
            } catch (e) {
                console.error('Error parsing task row:', id, e);
                return null;
            }
        }).filter(Boolean);
    },

    async update(task) {
        await initDB();
        const { id, ...rest } = task; // Separate ID
        if (!id) throw new Error("Task update failed: Missing ID");

        const dataStr = JSON.stringify(rest);
        await workerExec('exec', `UPDATE tasks SET data = '${dataStr.replace(/'/g, "''")}' WHERE id = ${id}`);
        return id;
    },

    async delete(id) {
        await initDB();
        await workerExec('exec', `DELETE FROM tasks WHERE id = ${id}`);
    },

    async clearAll() {
        await initDB();
        await workerExec('exec', 'DELETE FROM tasks');
    }
};

/**
 * Journal Operations using SQLite
 */
const JournalDB = {
    async save(journal) {
        await initDB();
        const { id, ...rest } = journal;
        if (!id) throw new Error("Journal save failed: Missing ID");

        const dataStr = JSON.stringify(rest);
        await workerExec('exec', `INSERT OR REPLACE INTO journals (id, data) VALUES ('${id}', '${dataStr.replace(/'/g, "''")}')`);
        return id;
    },

    async get(id) {
        await initDB();
        const rows = await workerExec('selectArray', `SELECT id, data FROM journals WHERE id = '${id}'`);
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
                return null;
            }
        }).filter(Boolean);
    },

    async delete(id) {
        await initDB();
        await workerExec('exec', `DELETE FROM journals WHERE id = '${id}'`);
    }
};

/**
 * Backup and Restore Operations
 */
const BackupDB = {
    async export() {
        if (!sqlite3) await initDB();
        try {
            // Read the file from OPFS
            const bytes = await sqlite3.opfs.entryPoint.readFile(DB_NAME);
            const blob = new Blob([bytes], { type: 'application/x-sqlite3' });

            // Trigger download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'productivity_backup.sqlite3';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Export failed:', e);
            alert('Failed to export database. See console for details.');
        }
    },

    async import(file) {
        if (!sqlite3) await initDB();
        try {
            const arrayBuffer = await file.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);

            // Overwrite the file in OPFS
            await sqlite3.opfs.entryPoint.writeFile(DB_NAME, bytes);

            alert('Database restored successfully! The page will now reload.');
            window.location.reload();
        } catch (e) {
            console.error('Import failed:', e);
            alert('Failed to import database. Ensure it is a valid SQLite file.');
        }
    }
};

window.BackupDB = BackupDB;

