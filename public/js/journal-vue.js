const { createApp, ref, onMounted, computed, watch } = Vue;

createApp({
    setup() {
        const journals = ref([]);
        const currentJournal = ref({ id: '', content: '' });
        const last10Journals = ref([]);
        const isSaving = ref(false);
        const saveTimeout = ref(null);

        const formatDate = (date) => {
            return date.toISOString().split('T')[0];
        };

        const todayId = formatDate(new Date());

        const loadJournal = async (id) => {
            const entry = await JournalDB.get(id);
            if (entry) {
                currentJournal.value = entry;
            } else {
                currentJournal.value = { id, content: '' };
            }
        };

        const loadHistory = async () => {
            const all = await JournalDB.getAll();
            // Sort by ID (date) descending
            all.sort((a, b) => b.id.localeCompare(a.id));
            journals.value = all;
            last10Journals.value = all.slice(0, 10);
        };

        const saveJournal = async () => {
            if (!currentJournal.value.id) return;
            isSaving.value = true;
            await JournalDB.save(JSON.parse(JSON.stringify(currentJournal.value)));
            await loadHistory();
            setTimeout(() => {
                isSaving.value = false;
            }, 1000);
        };

        // Auto-save on content change
        watch(() => currentJournal.value.content, () => {
            if (saveTimeout.value) clearTimeout(saveTimeout.value);
            saveTimeout.value = setTimeout(saveJournal, 1000);
        });

        const selectJournal = (id) => {
            loadJournal(id);
        };

        const displayDate = (id) => {
            if (!id) return '';
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            return new Date(id + 'T00:00:00').toLocaleDateString(undefined, options);
        };

        onMounted(async () => {
            await loadJournal(todayId);
            await loadHistory();
        });

        return {
            currentJournal,
            last10Journals,
            isSaving,
            todayId,
            selectJournal,
            displayDate
        };
    }
}).mount('#app');
