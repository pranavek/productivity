const { createApp, ref, onMounted, computed } = Vue;

createApp({
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
            if (allTasks.length === 0) {
                const samples = [
                    { text: 'Finish project presentation', quadrant: 'q1', completed: false, createdAt: Date.now() },
                    { text: 'Gym session', quadrant: 'q2', completed: false, createdAt: Date.now() - 1000 },
                    { text: 'Reply to non-urgent emails', quadrant: 'q3', completed: false, createdAt: Date.now() - 2000 },
                    { text: 'Scroll social media', quadrant: 'q4', completed: true, createdAt: Date.now() - 3000 }
                ];
                for (const s of samples) {
                    await TaskDB.add(s);
                }
                tasks.value = await TaskDB.getAll();
            } else {
                tasks.value = allTasks;
            }
        };

        const addTask = async () => {
            if (!newTaskText.value.trim()) return;

            const task = {
                text: newTaskText.value.trim(),
                quadrant: newTaskQuadrant.value,
                completed: false,
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
            await TaskDB.delete(id);
            await loadTasks();
        };

        const resetData = async () => {
            await TaskDB.clearAll();
            showResetModal.value = false;
            await loadTasks();
        };

        const getTasks = (quadrantId, completed) => {
            return tasks.value
                .filter(t => t.quadrant === quadrantId && t.completed === completed)
                .sort((a, b) => b.createdAt - a.createdAt);
        };

        const hasCompleted = (quadrantId) => {
            return tasks.value.some(t => t.quadrant === quadrantId && t.completed);
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
            hasCompleted
        };
    }
}).mount('#app');
