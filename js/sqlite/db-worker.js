/* SQLite Web Worker - Runs in Worker context */
'use strict';
importScripts('./sqlite3.js');

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

            default:
                throw new Error(`Unknown method: ${method}`);
        }

        self.postMessage({ id, result });
    } catch (error) {
        self.postMessage({ id, error: error.message });
    }
};
