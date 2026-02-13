/* SQLite Web Worker - Runs in Worker context */
'use strict';
importScripts('/js/sqlite/sqlite3.js');

let db = null;
const DB_NAME = '/productivity.sqlite3';

// Initialize SQLite with OPFS in the worker
sqlite3InitModule({
    print: console.log,
    printErr: console.error,
}).then((sqlite3) => {
    console.log('Worker: SQLite initialized');

    // Install OPFS VFS in worker (this works because we're in a worker context)
    if (sqlite3.capi.sqlite3_vfs_find('opfs')) {
        db = new sqlite3.oo1.DB(DB_NAME, 'ct', 'opfs');
        console.log('Worker: Using OPFS storage');
    } else {
        db = new sqlite3.oo1.DB(DB_NAME, 'ct');
        console.log('Worker: Using in-memory storage (OPFS not available)');
    }

    // Initialize schema
    db.exec(`
        CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT);
        CREATE TABLE IF NOT EXISTS journals (id TEXT PRIMARY KEY, data TEXT);
    `);

    // Store sqlite3 reference globally for export/import operations
    self.sqlite3 = sqlite3;

    // Notify main thread that worker is ready
    self.postMessage({ type: 'ready' });
}).catch((err) => {
    console.error('Worker: Failed to initialize SQLite:', err);
    self.postMessage({ type: 'error', error: err.message });
});

// Handle messages from main thread
self.onmessage = function (e) {
    const { id, method, args } = e.data;

    try {
        let result;

        switch (method) {
            case 'exec':
                db.exec(args[0]);
                result = null;
                break;

            case 'execParams': {
                // Execute with parameters for security
                const sql = args[0];
                const params = args[1] || [];
                const stmt = db.prepare(sql);
                try {
                    stmt.bind(params);
                    stmt.step();
                } finally {
                    stmt.finalize();
                }
                result = null;
                break;
            }

            case 'selectValue':
                result = db.selectValue(args[0]);
                break;

            case 'selectArray': {
                const rows = [];
                db.exec({
                    sql: args[0],
                    rowMode: 'array',
                    callback: (row) => rows.push(row)
                });
                result = rows;
                break;
            }

            case 'selectArrayParams': {
                // Select with parameters for security
                const sql = args[0];
                const params = args[1] || [];
                const rows = [];
                const stmt = db.prepare(sql);
                try {
                    stmt.bind(params);
                    while (stmt.step()) {
                        rows.push(stmt.get([]));
                    }
                } finally {
                    stmt.finalize();
                }
                result = rows;
                break;
            }

            case 'selectObjects': {
                const rows = [];
                db.exec({
                    sql: args[0],
                    rowMode: 'object',
                    callback: (row) => rows.push(row)
                });
                result = rows;
                break;
            }

            case 'exportDB': {
                // Export database file using OPFS
                if (!self.sqlite3) {
                    throw new Error('SQLite not initialized');
                }
                const bytes = self.sqlite3.capi.sqlite3_js_db_export(db.pointer);
                result = bytes;
                break;
            }

            case 'importDB': {
                // Import database file
                if (!self.sqlite3) {
                    throw new Error('SQLite not initialized');
                }
                const bytes = args[0];

                // Close current database
                db.close();

                // Import the new database
                self.sqlite3.capi.sqlite3_js_db_import(DB_NAME, bytes);

                // Reopen database
                if (self.sqlite3.capi.sqlite3_vfs_find('opfs')) {
                    db = new self.sqlite3.oo1.DB(DB_NAME, 'ct', 'opfs');
                } else {
                    db = new self.sqlite3.oo1.DB(DB_NAME, 'ct');
                }

                result = null;
                break;
            }

            default:
                throw new Error(`Unknown method: ${method}`);
        }

        self.postMessage({ id, result });
    } catch (error) {
        self.postMessage({ id, error: error.message });
    }
};
