// API Base URL configuration
const API_BASE = window.location.origin;

/**
 * Helper function to make API requests
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}/api${endpoint}`;

    const config = {
        method: options.method || 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    };

    if (options.body) {
        config.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(url, config);

        if (!response.ok) {
            const error = await response.json().catch(() => ({error: 'Request failed'}));
            throw new Error(error.error || 'Request failed');
        }

        // Handle 204 No Content
        if (response.status === 204) {
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('API Request Error:', endpoint, error);
        throw error;
    }
}

/**
 * Task API Client
 *
 * Provides CRUD operations for tasks stored in server-side SQLite database.
 * Communicates with Express REST API endpoints.
 */
const TaskDB = {
    async add(task) {
        const response = await apiRequest('/tasks/add', {
            method: 'POST',
            body: task
        });
        return response.id;
    },

    async getAll() {
        return await apiRequest('/tasks/all');
    },

    async update(task) {
        await apiRequest(`/tasks/update?id=${task.id}`, {
            method: 'PUT',
            body: task
        });
        return task.id;
    },

    async delete(id) {
        await apiRequest(`/tasks/delete?id=${id}`, {
            method: 'DELETE'
        });
    },

    async clearAll() {
        console.warn('clearAll() is deprecated. Use clearType() instead.');
        // This shouldn't be called anymore, but keeping for backwards compatibility
    },

    // New method for type-specific clearing
    async clearType(type) {
        await apiRequest(`/tasks/clear?type=${type}`, {
            method: 'DELETE'
        });
    }
};

/**
 * Journal API Client
 *
 * Provides CRUD operations for journal entries stored in server-side SQLite database.
 * Communicates with Express REST API endpoints.
 */
const JournalDB = {
    async save(journal) {
        await apiRequest('/journals/save', {
            method: 'POST',
            body: journal
        });
        return journal.id;
    },

    async get(id) {
        return await apiRequest(`/journals/get?id=${id}`);
    },

    async getAll() {
        return await apiRequest('/journals/all');
    },

    async delete(id) {
        await apiRequest(`/journals/delete?id=${id}`, {
            method: 'DELETE'
        });
    }
};
