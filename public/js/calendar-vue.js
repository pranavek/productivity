const { createApp, ref, onMounted, computed } = Vue;

createApp({
    setup() {
        const tasks = ref([]);
        const currentDate = ref(new Date());
        const showAddModal = ref(false);
        const selectedDate = ref(null);
        const newTaskText = ref('');
        const showResetModal = ref(false);

        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        const loadTasks = async () => {
            const allTasks = await TaskDB.getAll();
            tasks.value = allTasks.filter(t => t.type === 'calendar');
        };

        const calendarDays = computed(() => {
            const year = currentDate.value.getFullYear();
            const month = currentDate.value.getMonth();

            const firstDayOfMonth = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            const days = [];

            // Previous month days
            const prevMonthLastDay = new Date(year, month, 0).getDate();
            for (let i = firstDayOfMonth - 1; i >= 0; i--) {
                days.push({
                    day: prevMonthLastDay - i,
                    month: month - 1,
                    year: year,
                    isOtherMonth: true,
                    dateStr: formatDate(year, month - 1, prevMonthLastDay - i)
                });
            }

            // Current month days
            const today = new Date();
            for (let i = 1; i <= daysInMonth; i++) {
                days.push({
                    day: i,
                    month: month,
                    year: year,
                    isOtherMonth: false,
                    isToday: today.getDate() === i && today.getMonth() === month && today.getFullYear() === year,
                    dateStr: formatDate(year, month, i)
                });
            }

            // Next month days
            const remainingSlots = 42 - days.length; // 6 rows of 7 days
            for (let i = 1; i <= remainingSlots; i++) {
                days.push({
                    day: i,
                    month: month + 1,
                    year: year,
                    isOtherMonth: true,
                    dateStr: formatDate(year, month + 1, i)
                });
            }

            return days;
        });

        const formatDate = (year, month, day) => {
            const d = new Date(year, month, day);
            return d.toISOString().split('T')[0];
        };

        const monthYearLabel = computed(() => {
            return currentDate.value.toLocaleString('default', { month: 'long', year: 'numeric' });
        });

        const prevMonth = () => {
            currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1);
        };

        const nextMonth = () => {
            currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1);
        };

        const goToToday = () => {
            currentDate.value = new Date();
        };

        const openAddModal = (dateStr) => {
            selectedDate.value = dateStr;
            showAddModal.value = true;
            setTimeout(() => document.getElementById('cal-task-input')?.focus(), 50);
        };

        const addTask = async () => {
            if (!newTaskText.value.trim()) return;

            const task = {
                text: newTaskText.value.trim(),
                date: selectedDate.value,
                completed: false,
                type: 'calendar',
                createdAt: Date.now()
            };

            await TaskDB.add(task);
            newTaskText.value = '';
            showAddModal.value = false;
            await loadTasks();
        };

        const toggleComplete = async (task) => {
            task.completed = !task.completed;
            await TaskDB.update(JSON.parse(JSON.stringify(task)));
            await loadTasks();
        };

        const deleteTask = async (task) => {
            await TaskDB.delete(task.id);
            await loadTasks();
        };

        const resetData = async () => {
            for (const task of tasks.value) {
                await TaskDB.delete(task.id);
            }
            showResetModal.value = false;
            await loadTasks();
        };

        const getTasksForDate = (dateStr) => {
            return tasks.value.filter(t => t.date === dateStr);
        };

        onMounted(loadTasks);

        return {
            tasks,
            currentDate,
            showAddModal,
            selectedDate,
            newTaskText,
            showResetModal,
            daysOfWeek,
            calendarDays,
            monthYearLabel,
            prevMonth,
            nextMonth,
            goToToday,
            openAddModal,
            addTask,
            toggleComplete,
            deleteTask,
            resetData,
            getTasksForDate
        };
    }
}).mount('#app');
