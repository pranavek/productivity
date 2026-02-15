const { createApp, ref, onMounted, computed } = Vue;

createApp({
    setup() {
        // State
        const tasks = ref([]);
        const currentDate = ref(new Date());
        const showAddModal = ref(false);
        const showEventModal = ref(false);
        const selectedDate = ref(null);
        const selectedEvent = ref(null);
        const newTaskText = ref('');
        const showSummaryPanel = ref(false);
        const showToolbar = ref(true);

        // View and filter state
        const viewMode = ref('month'); // 'month', 'week', 'agenda', 'timeline', 'table', 'board', 'list'
        const filterCategory = ref(null);
        const filterStatus = ref(null);
        const draggedTask = ref(null);
        const draggedBoardTask = ref(null);

        // Hover menu state
        const hoveredTask = ref(null);
        const showHoverMenu = ref(false);
        const hoverMenuPosition = ref({ x: 0, y: 0 });

        // Constants
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        const eventCategories = [
            {name: 'Work', value: 'work', color: '#3b82f6'},
            {name: 'Personal', value: 'personal', color: '#8b5cf6'},
            {name: 'Health', value: 'health', color: '#10b981'},
            {name: 'Finance', value: 'finance', color: '#f59e0b'},
            {name: 'Social', value: 'social', color: '#ec4899'}
        ];

        const eventColors = [
            {name: 'Blue', value: '#3b82f6'},
            {name: 'Green', value: '#10b981'},
            {name: 'Red', value: '#ef4444'},
            {name: 'Yellow', value: '#f59e0b'},
            {name: 'Purple', value: '#a855f7'},
            {name: 'Pink', value: '#ec4899'},
            {name: 'Cyan', value: '#06b6d4'},
            {name: 'Gray', value: '#64748b'}
        ];

        const statusOptions = [
            {value: 'todo', label: 'To Do'},
            {value: 'in-progress', label: 'In Progress'},
            {value: 'blocked', label: 'Blocked'},
            {value: 'completed', label: 'Completed'},
            {value: 'cancelled', label: 'Cancelled'}
        ];

        // Data loading
        const loadTasks = async () => {
            const allTasks = await TaskDB.getAll();
            tasks.value = allTasks.filter(t => t.type === 'calendar');
        };

        // Calendar grid computation
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

        // Week view days
        const weekDays = computed(() => {
            if (viewMode.value !== 'week') return [];

            const startOfWeek = new Date(currentDate.value);
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

            const days = [];
            for (let i = 0; i < 7; i++) {
                const day = new Date(startOfWeek);
                day.setDate(day.getDate() + i);
                days.push({
                    date: day,
                    dateStr: day.toISOString().split('T')[0],
                    isToday: isToday(day)
                });
            }

            return days;
        });

        // Filtered tasks
        const filteredTasks = computed(() => {
            let filtered = tasks.value;

            if (filterCategory.value) {
                filtered = filtered.filter(t => t.category === filterCategory.value);
            }

            if (filterStatus.value) {
                filtered = filtered.filter(t => t.status === filterStatus.value);
            }

            return filtered;
        });

        // Agenda events (next 30 days)
        const agendaEvents = computed(() => {
            if (viewMode.value !== 'agenda') return [];

            const today = new Date();
            const endDate = new Date(today);
            endDate.setDate(endDate.getDate() + 30);

            const todayStr = today.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            return filteredTasks.value
                .filter(t => t.date >= todayStr && t.date <= endDateStr)
                .sort((a, b) => a.date.localeCompare(b.date));
        });

        // Group agenda events by date
        const groupedAgendaEvents = computed(() => {
            const grouped = {};
            agendaEvents.value.forEach(event => {
                if (!grouped[event.date]) {
                    grouped[event.date] = [];
                }
                grouped[event.date].push(event);
            });
            return grouped;
        });

        // Board view: Tasks grouped by status
        const tasksByStatus = computed(() => {
            const grouped = {};
            statusOptions.forEach(status => {
                grouped[status.value] = filteredTasks.value.filter(t => t.status === status.value);
            });
            return grouped;
        });

        // Calendar summary statistics
        const calendarSummary = computed(() => {
            const summary = {
                total: filteredTasks.value.length,
                byStatus: {},
                byCategory: {},
                milestones: 0,
                overdue: 0,
                next7Days: 0,
                next14Days: 0,
                next21Days: 0,
                next30Days: 0
            };

            const today = new Date().toISOString().split('T')[0];

            // Calculate date ranges
            const next7 = new Date();
            next7.setDate(next7.getDate() + 7);
            const next7Str = next7.toISOString().split('T')[0];

            const next14 = new Date();
            next14.setDate(next14.getDate() + 14);
            const next14Str = next14.toISOString().split('T')[0];

            const next21 = new Date();
            next21.setDate(next21.getDate() + 21);
            const next21Str = next21.toISOString().split('T')[0];

            const next30 = new Date();
            next30.setDate(next30.getDate() + 30);
            const next30Str = next30.toISOString().split('T')[0];

            filteredTasks.value.forEach(task => {
                // Count by status
                summary.byStatus[task.status] = (summary.byStatus[task.status] || 0) + 1;

                // Count by category
                if (task.category) {
                    summary.byCategory[task.category] = (summary.byCategory[task.category] || 0) + 1;
                }

                // Count milestones
                if (task.isMilestone) {
                    summary.milestones++;
                }

                // Count overdue
                if (task.date < today && task.status !== 'completed' && task.status !== 'cancelled') {
                    summary.overdue++;
                }

                // Count upcoming periods (exclude completed/cancelled)
                if (task.status !== 'completed' && task.status !== 'cancelled') {
                    if (task.date >= today && task.date <= next7Str) {
                        summary.next7Days++;
                    }
                    if (task.date >= today && task.date <= next14Str) {
                        summary.next14Days++;
                    }
                    if (task.date >= today && task.date <= next21Str) {
                        summary.next21Days++;
                    }
                    if (task.date >= today && task.date <= next30Str) {
                        summary.next30Days++;
                    }
                }
            });

            return summary;
        });

        // Utility functions
        const formatDate = (year, month, day) => {
            const d = new Date(year, month, day);
            return d.toISOString().split('T')[0];
        };

        const isToday = (date) => {
            const today = new Date();
            return date.getDate() === today.getDate() &&
                   date.getMonth() === today.getMonth() &&
                   date.getFullYear() === today.getFullYear();
        };

        const formatAgendaDate = (dateStr) => {
            const date = new Date(dateStr);
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            if (dateStr === today.toISOString().split('T')[0]) {
                return 'Today - ' + date.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'});
            } else if (dateStr === tomorrow.toISOString().split('T')[0]) {
                return 'Tomorrow - ' + date.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'});
            } else {
                return date.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'});
            }
        };

        const formatTimelineDate = (dateStr) => {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
        };

        const formatStatus = (status) => {
            const option = statusOptions.find(s => s.value === status);
            return option ? option.label : status;
        };

        const getTaskColor = (task) => {
            if (task.color) return task.color;
            if (task.status === 'completed') return '#64748b';
            if (task.status === 'cancelled') return '#94a3b8';
            if (task.status === 'blocked') return '#ef4444';
            if (task.isMilestone) return '#f59e0b';
            if (task.category) {
                const cat = eventCategories.find(c => c.value === task.category);
                return cat ? cat.color : '#3b82f6';
            }
            return '#3b82f6';
        };

        // Period label (month or week)
        const periodLabel = computed(() => {
            if (viewMode.value === 'week') {
                const start = weekDays.value[0]?.date;
                const end = weekDays.value[6]?.date;
                if (start && end) {
                    return `${start.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} - ${end.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}`;
                }
            }
            return currentDate.value.toLocaleString('default', { month: 'long', year: 'numeric' });
        });

        // Navigation
        const prevPeriod = () => {
            if (viewMode.value === 'week') {
                currentDate.value = new Date(currentDate.value.getTime() - 7 * 24 * 60 * 60 * 1000);
            } else {
                currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1);
            }
        };

        const nextPeriod = () => {
            if (viewMode.value === 'week') {
                currentDate.value = new Date(currentDate.value.getTime() + 7 * 24 * 60 * 60 * 1000);
            } else {
                currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1);
            }
        };

        const goToToday = () => {
            currentDate.value = new Date();
        };

        // Event modal
        const openAddModal = (dateStr) => {
            selectedDate.value = dateStr;
            showAddModal.value = true;
            setTimeout(() => document.getElementById('cal-task-input')?.focus(), 50);
        };

        const openEventModal = (task = null, dateStr = null) => {
            if (task) {
                selectedEvent.value = JSON.parse(JSON.stringify(task));
            } else {
                selectedEvent.value = {
                    text: '',
                    date: dateStr || selectedDate.value,
                    status: 'todo',
                    isMilestone: false,
                    category: null,
                    color: null,
                    description: '',
                    completed: false,
                    type: 'calendar',
                    createdAt: Date.now(),
                    quadrant: null,
                    priority: null
                };
            }
            showEventModal.value = true;
            setTimeout(() => document.getElementById('event-title-input')?.focus(), 50);
        };

        const saveEvent = async () => {
            if (!selectedEvent.value.text.trim()) return;

            // Sync completed status with status field
            if (selectedEvent.value.status === 'completed') {
                selectedEvent.value.completed = true;
            } else {
                selectedEvent.value.completed = false;
            }

            if (selectedEvent.value.id) {
                await TaskDB.update(selectedEvent.value);
            } else {
                await TaskDB.add(selectedEvent.value);
            }

            showEventModal.value = false;
            selectedEvent.value = null;
            await loadTasks();
        };

        // Simple add task (legacy support)
        const addTask = async () => {
            if (!newTaskText.value.trim()) return;

            const task = {
                text: newTaskText.value.trim(),
                date: selectedDate.value,
                completed: false,
                status: 'todo',
                type: 'calendar',
                createdAt: Date.now(),
                isMilestone: false,
                category: null,
                color: null,
                description: '',
                quadrant: null,
                priority: null
            };

            await TaskDB.add(task);
            newTaskText.value = '';
            showAddModal.value = false;
            await loadTasks();
        };

        const toggleComplete = async (task) => {
            task.completed = !task.completed;
            task.status = task.completed ? 'completed' : 'todo';
            await TaskDB.update(JSON.parse(JSON.stringify(task)));
            await loadTasks();
        };

        const updateEventStatus = async (task, newStatus) => {
            task.status = newStatus;
            task.completed = (newStatus === 'completed');
            await TaskDB.update(JSON.parse(JSON.stringify(task)));
            await loadTasks();
        };

        const deleteTask = async (task) => {
            if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
                return;
            }
            await TaskDB.delete(task.id);
            await loadTasks();
        };

        const getTasksForDate = (dateStr) => {
            return filteredTasks.value.filter(t => t.date === dateStr);
        };

        const getEventsByMilestone = (category) => {
            return filteredTasks.value
                .filter(t => t.category === category)
                .sort((a, b) => a.date.localeCompare(b.date));
        };

        const getEventsWithoutCategory = () => {
            return filteredTasks.value
                .filter(t => !t.category)
                .sort((a, b) => a.date.localeCompare(b.date));
        };

        // Drag and drop
        const onDragStart = (event, task) => {
            draggedTask.value = task;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', task.id.toString());
        };

        const onDragOver = (event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
        };

        const onDrop = async (event, targetDateStr) => {
            event.preventDefault();

            if (!draggedTask.value) return;

            const task = JSON.parse(JSON.stringify(draggedTask.value));
            task.date = targetDateStr;

            await TaskDB.update(task);
            await loadTasks();

            draggedTask.value = null;
        };

        const onDragEnd = () => {
            draggedTask.value = null;
        };

        // Inline editing
        const updateTaskText = async (task, event) => {
            const newText = event.target.textContent.trim();
            if (newText && newText !== task.text) {
                task.text = newText;
                await TaskDB.update(JSON.parse(JSON.stringify(task)));
                await loadTasks();
            } else if (!newText) {
                // Revert if empty
                event.target.textContent = task.text;
            }
        };

        // Board view drag and drop
        const onBoardDragStart = (event, task) => {
            draggedBoardTask.value = task;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', task.id.toString());
        };

        const onBoardDragOver = (event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
        };

        const onBoardDrop = async (event, targetStatus) => {
            event.preventDefault();

            if (!draggedBoardTask.value) return;

            const task = JSON.parse(JSON.stringify(draggedBoardTask.value));
            task.status = targetStatus;
            task.completed = (targetStatus === 'completed');

            await TaskDB.update(task);
            await loadTasks();

            draggedBoardTask.value = null;
        };

        const onBoardDragEnd = () => {
            draggedBoardTask.value = null;
        };

        // Add task to board column
        const addTaskToColumn = async (status) => {
            const text = prompt('Enter task title:');
            if (!text || !text.trim()) return;

            const task = {
                text: text.trim(),
                date: new Date().toISOString().split('T')[0],
                completed: (status === 'completed'),
                status: status,
                type: 'calendar',
                createdAt: Date.now(),
                isMilestone: false,
                category: null,
                color: null,
                description: '',
                quadrant: null,
                priority: null
            };

            await TaskDB.add(task);
            await loadTasks();
        };

        // Hover menu functionality
        const showTaskMenu = (event, task) => {
            event.preventDefault();
            event.stopPropagation();

            hoveredTask.value = task;

            // Position menu near the click/hover point
            const rect = event.target.getBoundingClientRect();
            hoverMenuPosition.value = {
                x: event.clientX,
                y: event.clientY
            };

            showHoverMenu.value = true;
        };

        const hideTaskMenu = () => {
            showHoverMenu.value = false;
            hoveredTask.value = null;
        };

        const duplicateTask = async () => {
            if (!hoveredTask.value) return;

            const task = JSON.parse(JSON.stringify(hoveredTask.value));
            delete task.id;
            task.text = task.text + ' (copy)';
            task.createdAt = Date.now();

            await TaskDB.add(task);
            await loadTasks();
            hideTaskMenu();
        };

        const moveTaskToDate = async () => {
            if (!hoveredTask.value) return;

            const newDate = prompt('Enter new date (YYYY-MM-DD):', hoveredTask.value.date);
            if (!newDate || newDate === hoveredTask.value.date) {
                hideTaskMenu();
                return;
            }

            const task = JSON.parse(JSON.stringify(hoveredTask.value));
            task.date = newDate;

            await TaskDB.update(task);
            await loadTasks();
            hideTaskMenu();
        };

        const toggleMilestone = async () => {
            if (!hoveredTask.value) return;

            const task = JSON.parse(JSON.stringify(hoveredTask.value));
            task.isMilestone = !task.isMilestone;

            await TaskDB.update(task);
            await loadTasks();
            hideTaskMenu();
        };

        const deleteTaskFromMenu = async () => {
            if (!hoveredTask.value) return;

            if (confirm('Are you sure you want to delete this event?')) {
                await TaskDB.delete(hoveredTask.value.id);
                await loadTasks();
            }
            hideTaskMenu();
        };

        // Click outside to close hover menu
        const handleClickOutside = (event) => {
            if (showHoverMenu.value && !event.target.closest('.hover-menu')) {
                hideTaskMenu();
            }
        };

        onMounted(() => {
            loadTasks();
            document.addEventListener('click', handleClickOutside);
        });

        return {
            // State
            tasks,
            currentDate,
            showAddModal,
            showEventModal,
            selectedDate,
            selectedEvent,
            newTaskText,
            showSummaryPanel,
            showToolbar,
            viewMode,
            filterCategory,
            filterStatus,
            draggedTask,
            draggedBoardTask,
            hoveredTask,
            showHoverMenu,
            hoverMenuPosition,

            // Constants
            daysOfWeek,
            eventCategories,
            eventColors,
            statusOptions,

            // Computed
            calendarDays,
            weekDays,
            filteredTasks,
            agendaEvents,
            groupedAgendaEvents,
            calendarSummary,
            periodLabel,
            tasksByStatus,

            // Methods
            loadTasks,
            formatDate,
            isToday,
            formatAgendaDate,
            formatTimelineDate,
            formatStatus,
            getTaskColor,
            prevPeriod,
            nextPeriod,
            goToToday,
            openAddModal,
            openEventModal,
            saveEvent,
            addTask,
            toggleComplete,
            updateEventStatus,
            deleteTask,
            getTasksForDate,
            getEventsByMilestone,
            getEventsWithoutCategory,
            onDragStart,
            onDragOver,
            onDrop,
            onDragEnd,
            updateTaskText,
            onBoardDragStart,
            onBoardDragOver,
            onBoardDrop,
            onBoardDragEnd,
            addTaskToColumn,
            showTaskMenu,
            hideTaskMenu,
            duplicateTask,
            moveTaskToDate,
            toggleMilestone,
            deleteTaskFromMenu
        };
    }
}).mount('#app');
