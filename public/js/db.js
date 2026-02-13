const DB_NAME = 'ProductivityHubDB';
const DB_VERSION = 1;

/**
 * Initialize IndexedDB
 */
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('tasks')) {
                db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('journals')) {
                db.createObjectStore('journals', { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject('IndexedDB error: ' + event.target.errorCode);
        };
    });
}

/**
 * Task Operations
 */
const TaskDB = {
    async add(task) {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['tasks'], 'readwrite');
            const store = transaction.objectStore('tasks');
            const request = store.add(task);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getAll() {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['tasks'], 'readonly');
            const store = transaction.objectStore('tasks');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async update(task) {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['tasks'], 'readwrite');
            const store = transaction.objectStore('tasks');
            const request = store.put(task);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async delete(id) {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['tasks'], 'readwrite');
            const store = transaction.objectStore('tasks');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async clearAll() {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['tasks'], 'readwrite');
            const store = transaction.objectStore('tasks');
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};

const JournalDB = {
    async save(journal) {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['journals'], 'readwrite');
            const store = transaction.objectStore('journals');
            const request = store.put(journal);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async get(id) {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['journals'], 'readonly');
            const store = transaction.objectStore('journals');
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getAll() {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['journals'], 'readonly');
            const store = transaction.objectStore('journals');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async delete(id) {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['journals'], 'readwrite');
            const store = transaction.objectStore('journals');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};
