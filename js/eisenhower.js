document.addEventListener('DOMContentLoaded', async () => {
    const taskInput = document.getElementById('taskInput');
    const quadrantSelect = document.getElementById('quadrantSelect');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const modalOverlay = document.getElementById('modalOverlay');
    const openResetModal = document.getElementById('openResetModal');
    const cancelReset = document.getElementById('cancelReset');
    const confirmReset = document.getElementById('confirmReset');

    // Initial load
    const existingTasks = await TaskDB.getAll();
    if (existingTasks.length === 0) {
        const samples = [
            { text: 'Finish project presentation', quadrant: 'q1', completed: false, createdAt: Date.now() },
            { text: 'Gym session', quadrant: 'q2', completed: false, createdAt: Date.now() - 1000 },
            { text: 'Reply to non-urgent emails', quadrant: 'q3', completed: false, createdAt: Date.now() - 2000 },
            { text: 'Scroll social media', quadrant: 'q4', completed: true, createdAt: Date.now() - 3000 }
        ];
        for (const s of samples) await TaskDB.add(s);
    }
    await renderTasks();

    // Add Task Event
    addTaskBtn.addEventListener('click', async () => {
        const text = taskInput.value.trim();
        const quadrant = quadrantSelect.value;

        if (text) {
            const newTask = {
                text,
                quadrant,
                completed: false,
                createdAt: new Date().getTime()
            };

            await TaskDB.add(newTask);
            taskInput.value = '';
            await renderTasks();
        }
    });

    // Enter key to add task
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTaskBtn.click();
        }
    });

    // Modal Control
    openResetModal.addEventListener('click', () => {
        modalOverlay.style.display = 'flex';
    });

    cancelReset.addEventListener('click', () => {
        modalOverlay.style.display = 'none';
    });

    confirmReset.addEventListener('click', async () => {
        await TaskDB.clearAll();
        modalOverlay.style.display = 'none';
        await renderTasks();
    });

    /**
     * Render all tasks from DB to the UI
     */
    async function renderTasks() {
        const tasks = await TaskDB.getAll();
        const quadrants = ['q1', 'q2', 'q3', 'q4'];

        // Clear all lists
        quadrants.forEach(q => {
            document.getElementById(`list-${q}`).innerHTML = '';
        });

        // Group tasks by quadrant
        const groupedTasks = {
            q1: [], q2: [], q3: [], q4: []
        };

        tasks.forEach(task => {
            if (groupedTasks[task.quadrant]) {
                groupedTasks[task.quadrant].push(task);
            }
        });

        // Sort and render each quadrant
        quadrants.forEach(q => {
            const listElement = document.getElementById(`list-${q}`);
            const quadrantTasks = groupedTasks[q];

            // Sort: Uncompleted first, then by createdAt
            quadrantTasks.sort((a, b) => {
                if (a.completed === b.completed) {
                    return b.createdAt - a.createdAt; // Newest first within same status
                }
                return a.completed ? 1 : -1; // Uncompleted first
            });

            let completedStarted = false;

            quadrantTasks.forEach(task => {
                if (task.completed && !completedStarted) {
                    const separator = document.createElement('div');
                    separator.className = 'completed-separator';
                    separator.textContent = 'Completed';
                    listElement.appendChild(separator);
                    completedStarted = true;
                }

                const taskItem = createTaskElement(task);
                listElement.appendChild(taskItem);
            });
        });
    }

    /**
     * Create a task DOM element
     */
    function createTaskElement(task) {
        const div = document.createElement('div');
        div.className = `task-item ${task.completed ? 'completed' : ''}`;

        div.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
            <span class="task-text">${task.text}</span>
            <button class="delete-task" title="Delete Task">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
            </button>
        `;

        // Checkbox Toggle
        const checkbox = div.querySelector('.task-checkbox');
        checkbox.addEventListener('change', async () => {
            task.completed = checkbox.checked;
            await TaskDB.update(task);
            await renderTasks();
        });

        // Delete Event
        const deleteBtn = div.querySelector('.delete-task');
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            // Optional: Subtle animation before removal
            div.style.transform = 'scale(0.95)';
            div.style.opacity = '0';
            setTimeout(async () => {
                await TaskDB.delete(task.id);
                await renderTasks();
            }, 200);
        });

        return div;
    }
});
