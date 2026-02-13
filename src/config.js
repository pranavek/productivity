/**
 * Centralized Configuration
 * All hardcoded values should be defined here
 */

export const AppConfig = {
    // Task Types
    taskTypes: {
        EISENHOWER: 'eisenhower',
        MOSCOW: 'moscow',
        CALENDAR: 'calendar',
        JOURNAL: 'journal'
    },

    // UI Configuration
    ui: {
        modalFadeDelay: 50,
        calendarGridRows: 6,
        calendarGridCols: 7,
        dateFormat: 'YYYY-MM-DD'
    },

    // Feature Flags
    features: {
        enableBackup: true,
        enableExport: true,
        enableSync: false,
        enableAnalytics: false
    }
};

export default AppConfig;
