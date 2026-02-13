/* eslint-disable no-console */
const DB_NAME = '/productivity.sqlite3';

let db = null;
let sqlite3 = null;

async function initDB() {
    if (db) return db;

    try {
        if (!sqlite3) {
            // sqlite3InitModule is defined by the sqlite3.js script
            if (typeof sqlite3InitModule === 'undefined') {
                throw new Error("sqlite3InitModule not found. Ensure sqlite3.js is loaded.");
            }
            sqlite3 = await sqlite3InitModule({
                print: console.log,
                printErr: console.error,
            });
        }

        const { oo1 } = sqlite3;

        // Attempt to use persistent storage via OPFS
        if (sqlite3.opfs) {
            try {
                db = new sqlite3.opfs.OpfsDb(DB_NAME);
                console.log('SQLite: Using OPFS storage.');
            } catch (e) {
                console.error('SQLite: OPFS initialization failed.', e);
                throw e;
            }
        } else {
            const msg = "SQLite: OPFS not available in this environment.";
            console.error(msg);
            throw new Error(msg);
        }

        // Initialize Schema with JSON document storage pattern
        db.exec([
            "CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT);",
            "CREATE TABLE IF NOT EXISTS journals (id TEXT PRIMARY KEY, data TEXT);",
        ]);

        return db;
    } catch (err) {
        console.error('Failed to initialize SQLite:', err);
        throw err;
    }
}

/**
 * Task Operations using SQLite
 * Stores task objects as JSON in 'data' column.
 */
const TaskDB = {
    async add(task) {
        const db = await initDB();
        // Exclude ID from the stored JSON to avoid confusion, 
        // effectively letting SQLite manage the ID. 
        // Or we can store the ID inside the JSON too? 
        // IndexedDB assigns ID "on insert".
        // Use copy to avoid mutating original
        const { id, ...rest } = task;

        const dataStr = JSON.stringify(rest);

        db.exec({
            sql: 'INSERT INTO tasks (data) VALUES (?)',
            bind: [dataStr]
        });

        // Retrieve the auto-generated ID
        // selectValue is a helper in oo1
        const newId = db.selectValue('SELECT last_insert_rowid()');
        return newId;
    },

    async getAll() {
        const db = await initDB();
        const result = [];
        db.exec({
            sql: 'SELECT id, data FROM tasks',
            callback: (row) => {
                try {
                    // row is [id, data]
                    const [id, dataStr] = row;
                    const obj = JSON.parse(dataStr);
                    obj.id = id; // Ensure ID matches DB
                    result.push(obj);
                } catch (e) {
                    console.error('Error parsing task row:', row, e);
                }
            }
        });
        return result;
    },

    async update(task) {
        const db = await initDB();
        const { id, ...rest } = task; // Separate ID
        if (!id) throw new Error("Task update failed: Missing ID");

        const dataStr = JSON.stringify(rest);
        db.exec({
            sql: 'UPDATE tasks SET data = ? WHERE id = ?',
            bind: [dataStr, id]
        });
        return id;
    },

    async delete(id) {
        const db = await initDB();
        db.exec({
            sql: 'DELETE FROM tasks WHERE id = ?',
            bind: [id]
        });
    },

    async clearAll() {
        const db = await initDB();
        db.exec('DELETE FROM tasks');
    }
};

/**
 * Journal Operations using SQLite
 */
const JournalDB = {
    async save(journal) {
        const db = await initDB();
        const { id, ...rest } = journal; // ID is the date string
        if (!id) throw new Error("Journal save failed: Missing ID");

        const dataStr = JSON.stringify(rest);

        // UPSERT style: Insert or Replace
        db.exec({
            sql: 'INSERT OR REPLACE INTO journals (id, data) VALUES (?, ?)',
            bind: [id, dataStr]
        });
        return id;
    },

    async get(id) {
        const db = await initDB();
        let found = null;
        db.exec({
            sql: 'SELECT id, data FROM journals WHERE id = ?',
            bind: [id],
            callback: (row) => {
                const [dbId, dataStr] = row;
                try {
                    const obj = JSON.parse(dataStr);
                    obj.id = dbId;
                    found = obj;
                } catch (e) {
                    console.error('Error parsing journal:', e);
                }
            }
        });
        return found; // Returns null if not found
    },

    async getAll() {
        const db = await initDB();
        const result = [];
        db.exec({
            sql: 'SELECT id, data FROM journals',
            callback: (row) => {
                const [id, dataStr] = row;
                try {
                    const obj = JSON.parse(dataStr);
                    obj.id = id;
                    result.push(obj);
                } catch (e) { }
            }
        });
        return result;
    },

    async delete(id) {
        const db = await initDB();
        db.exec({
            sql: 'DELETE FROM journals WHERE id = ?',
            bind: [id]
        });
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

