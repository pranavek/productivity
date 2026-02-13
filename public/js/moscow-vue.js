const { createApp, ref, onMounted, computed } = Vue;

createApp({
    setup() {
        const tasks = ref([]);
        const newTaskText = ref('');
        const newTaskPriority = ref('must');
        const showResetModal = ref(false);

        const categories = [
            { id: 'must', title: 'Must Have', label: 'Critical for success' },
            { id: 'should', title: 'Should Have', label: 'Important but not vital' },
            { id: 'could', title: 'Could Have', label: 'Desirable but not necessary' },
            { id: 'wont', title: "Won't Have", label: 'Not for now' }
        ];

        const loadTasks = async () => {
            const allTasks = await TaskDB.getAll();
            tasks.value = allTasks.filter(t => t.type === 'moscow');
        };

        const addTask = async () => {
            if (!newTaskText.value.trim()) return;

            const task = {
                text: newTaskText.value.trim(),
                priority: newTaskPriority.value,
                completed: false,
                type: 'moscow',
                createdAt: Date.now()
            };

            await TaskDB.add(task);
            newTaskText.value = '';
            await loadTasks();
        };

        const updateTask = async (task) => {
            await TaskDB.update(JSON.parse(JSON.stringify(task)));
            await loadTasks();
        };

        const deleteTask = async (id) => {
            await TaskDB.delete(id);
            await loadTasks();
        };

        const resetData = async () => {
            // Only clear moscow tasks
            for (const task of tasks.value) {
                await TaskDB.delete(task.id);
            }
            showResetModal.value = false;
            await loadTasks();
        };

        const getTasks = (priorityId, completed) => {
            return tasks.value
                .filter(t => t.priority === priorityId && t.completed === completed)
                .sort((a, b) => b.createdAt - a.createdAt);
        };

        const hasCompleted = (priorityId) => {
            return tasks.value.some(t => t.priority === priorityId && t.completed);
        };

        const mustRatio = computed(() => {
            if (tasks.value.length === 0) return 0;
            const mustCount = tasks.value.filter(t => t.priority === 'must').length;
            return Math.round((mustCount / tasks.value.length) * 100);
        });

        onMounted(loadTasks);

        return {
            tasks,
            newTaskText,
            newTaskPriority,
            showResetModal,
            categories,
            addTask,
            updateTask,
            deleteTask,
            resetData,
            getTasks,
            hasCompleted,
            mustRatio
        };
    }
}).mount('#app');
