const { ref, onMounted, computed } = Vue;

Vue.createApp({
    setup() {
        const tasks = ref([]);
        const newTaskText = ref('');
        const newTaskQuadrant = ref('q1');
        const showResetModal = ref(false);

        const quadrants = [
            { id: 'q1', title: 'DO', label: 'Urgent & Important' },
            { id: 'q2', title: 'SCHEDULE', label: 'Not Urgent & Important' },
            { id: 'q3', title: 'DELEGATE', label: 'Urgent & Not Important' },
            { id: 'q4', title: 'ELIMINATE', label: 'Not Urgent & Not Important' }
        ];

        const loadTasks = async () => {
            const allTasks = await TaskDB.getAll();
            tasks.value = allTasks.filter(t =>
                t.type === 'eisenhower' ||
                !t.type ||
                (t.type === 'calendar' && t.quadrant !== null && t.quadrant !== undefined)
            );
        };

        const addTask = async () => {
            if (!newTaskText.value.trim()) return;

            const task = {
                text: newTaskText.value.trim(),
                quadrant: newTaskQuadrant.value,
                completed: false,
                type: 'eisenhower',
                createdAt: Date.now()
            };

            await TaskDB.add(task);
            newTaskText.value = '';
            await loadTasks();
        };

        const updateTask = async (task) => {
            // Task is already reactive due to v-model, but we need to persist it
            await TaskDB.update(JSON.parse(JSON.stringify(task)));
            await loadTasks();
        };

        const deleteTask = async (id) => {
            if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
                return;
            }
            await TaskDB.delete(id);
            await loadTasks();
        };

        const resetData = async () => {
            await TaskDB.clearType('eisenhower');
            showResetModal.value = false;
            await loadTasks();
        };

        const getTasks = (quadrantId, completed) => {
            return tasks.value
                .filter(t => t.quadrant === quadrantId && t.completed === completed)
                .sort((a, b) => {
                    // Calendar events first, sorted by date (nearest first)
                    if (a.type === 'calendar' && b.type !== 'calendar') return -1;
                    if (a.type !== 'calendar' && b.type === 'calendar') return 1;

                    if (a.type === 'calendar' && b.type === 'calendar') {
                        return (a.date || '').localeCompare(b.date || '');
                    }

                    // Regular tasks sorted by creation date (newest first)
                    return b.createdAt - a.createdAt;
                });
        };

        const hasCompleted = (quadrantId) => {
            return tasks.value.some(t => t.quadrant === quadrantId && t.completed);
        };

        const formatDateShort = (dateStr) => {
            const date = new Date(dateStr);
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            if (dateStr === today.toISOString().split('T')[0]) return 'Today';
            if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow';

            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        };

        onMounted(loadTasks);

        return {
            tasks,
            newTaskText,
            newTaskQuadrant,
            showResetModal,
            quadrants,
            addTask,
            updateTask,
            deleteTask,
            resetData,
            getTasks,
            hasCompleted,
            formatDateShort
        };
    }
}).mount('#app');
