import { createApp, ref, onMounted, computed } from 'vue';
import { JournalDB } from './db.js';

createApp({
    setup() {
        const currentDate = ref(getTodayDate());
        const currentEntry = ref('');
        const journalHistory = ref([]);
        const showSaved = ref(false);
        let saveTimeout = null;

        function getTodayDate() {
            return new Date().toISOString().split('T')[0];
        }

        const currentDisplayDate = computed(() => {
            const date = new Date(currentDate.value + 'T00:00:00');
            return date.toLocaleDateString('default', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        });

        const loadEntry = async (dateId) => {
            currentDate.value = dateId;
            const entry = await JournalDB.get(dateId);
            currentEntry.value = entry ? entry.content : '';
        };

        const saveEntry = async () => {
            if (!currentEntry.value.trim()) return;

            const journal = {
                id: currentDate.value,
                content: currentEntry.value,
                updatedAt: Date.now()
            };

            await JournalDB.save(journal);
            await loadHistory();

            // Show saved indicator
            showSaved.value = true;
            setTimeout(() => {
                showSaved.value = false;
            }, 2000);
        };

        const onEntryChange = () => {
            // Debounced auto-save
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                saveEntry();
            }, 1000);
        };

        const loadHistory = async () => {
            const entries = await JournalDB.getAll();
            journalHistory.value = entries
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map(entry => ({
                    id: entry.id,
                    displayDate: new Date(entry.id + 'T00:00:00').toLocaleDateString('default', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    }),
                    preview: entry.content.substring(0, 60) + (entry.content.length > 60 ? '...' : '')
                }));
        };

        onMounted(async () => {
            await loadHistory();
            await loadEntry(currentDate.value);
        });

        return {
            currentDate,
            currentEntry,
            journalHistory,
            showSaved,
            currentDisplayDate,
            loadEntry,
            onEntryChange
        };
    }
}).mount('#app');
