document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');
    const emptyImage = document.querySelector('.empty-img');
    const nimbusContainer = document.querySelector('.nimbus-container');
    const progressBar = document.getElementById('progress');
    const progressNumber = document.getElementById('numbers');
    const resetBtn = document.getElementById('reset-app-btn');

    let confettiInterval = null;

    // --- HELPER FUNCTIONS (Moved up so they are ready to use) ---

    const stopConfetti = () => {
        if (confettiInterval) {
            clearInterval(confettiInterval);
            confettiInterval = null;
        }
    };

    const toggleEmptyState = () => {
        const hasTasks = taskList.children.length > 0;
        if (emptyImage) emptyImage.style.display = hasTasks ? 'none' : 'block';
    };

    // --- Server-backed persistence (CRUD) ---
    let editingId = null;

    const updateProgress = () => {
        const totalTasks = taskList.children.length;
        const completedTasks = taskList.querySelectorAll('.checkbox:checked').length;
        const progressPercent = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;

        if (progressBar) progressBar.style.width = `${progressPercent}%`;
        if (progressNumber) progressNumber.textContent = `${completedTasks} / ${totalTasks}`;

        if (totalTasks > 0 && completedTasks === totalTasks) {
            fireConfetti();
        } else {
            stopConfetti();
        }
    };

    const fireConfetti = () => {
        stopConfetti();
        const duration = 5 * 1000,
            animationEnd = Date.now() + duration,
            defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

        function randomInRange(min, max) { return Math.random() * (max - min) + min; }

        confettiInterval = setInterval(function () {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return stopConfetti();

            const particleCount = 50 * (timeLeft / duration);
            confetti(Object.assign({}, defaults, {
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
            }));
            confetti(Object.assign({}, defaults, {
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
            }));
        }, 250);
    };

    // RESET BUTTON
    if (resetBtn) { resetBtn.addEventListener('click', async () => {
        if (confirm("Are you sure you want to reset all tasks and progress?")) {
            try {
                // Delete all tasks on server (simple approach)
                const tasks = await fetch('/tasks');
                const list = await tasks.json();
                await Promise.all(list.map(t => fetch(`/tasks/${t.id}`, { method: 'DELETE' })));
            } catch (err) {
                console.error('Reset failed', err);
            }

            // Clear UI
            taskList.innerHTML = '';
            taskInput.value = '';
            stopConfetti();
            updateProgress();
            toggleEmptyState();
        }
    });
    }

    // Create a task DOM element and bind server-syncing handlers
    const createTaskDom = (task) => {
        const li = document.createElement('li');
        li.dataset.id = task.id;
        if (task.completed) li.classList.add('completed');

        li.innerHTML = `
            <input type="checkbox" class="checkbox" ${task.completed ? 'checked' : ''}>
            <span></span>
            <div class="task-buttons">
                <button class="edit-btn"><i class="fa-solid fa-pen"></i></button>
                <button class="delete-btn"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;

        li.querySelector('span').textContent = task.text;

        const checkbox = li.querySelector('.checkbox');
        const editBtn = li.querySelector('.edit-btn');
        const deleteBtn = li.querySelector('.delete-btn');

        const updateEditStyle = (isComplete) => {
            editBtn.disabled = isComplete;
            editBtn.style.opacity = isComplete ? '0.5' : '1';
            editBtn.style.pointerEvents = isComplete ? 'none' : 'auto';
        };

        updateEditStyle(task.completed);

        checkbox.addEventListener('change', async () => {
            const completed = checkbox.checked;
            try {
                await fetch(`/tasks/${li.dataset.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ completed, text: li.querySelector('span').textContent })
                });
                li.classList.toggle('completed', completed);
                updateEditStyle(completed);
                updateProgress();
            } catch (err) {
                console.error('Failed updating task', err);
            }
        });

        editBtn.addEventListener('click', () => {
            const id = li.dataset.id;
            if (!id) {
                console.error('Edit attempted with no id on element');
                return;
            }
            taskInput.value = li.querySelector('span').textContent;
            editingId = id;
            taskInput.focus();
        });

        deleteBtn.addEventListener('click', async () => {
            try {
                const id = li.dataset.id;
                if (!id) {
                    console.error('Delete attempted with no id on element, removing locally');
                    // remove locally to avoid stuck UI; but don't call server with undefined
                    li.remove();
                    toggleEmptyState();
                    updateProgress();
                    return;
                }

                console.log('Deleting task id=', id);
                const res = await fetch(`/tasks/${id}`, { method: 'DELETE' });
                if (!res.ok) {
                    console.error('Server responded with', res.status);
                }
                li.remove();
                toggleEmptyState();
                updateProgress();
            } catch (err) {
                console.error('Failed to delete task', err);
            }
        });

        taskList.appendChild(li);
    };

    // Load tasks from server
    const loadTasks = async () => {
        try {
            const res = await fetch('/tasks');
            const tasks = await res.json();
            taskList.innerHTML = '';
            tasks.forEach(createTaskDom);
            toggleEmptyState();
            updateProgress();
        } catch (err) {
            console.error('Failed to load tasks', err);
        }
    };

    // Add or edit task via server
    const submitTask = async () => {
        const taskText = taskInput.value.trim();
        if (!taskText) return;

        stopConfetti();

        try {
            if (editingId) {
                // Update existing
                const li = taskList.querySelector(`li[data-id="${editingId}"]`);
                const completed = li ? li.classList.contains('completed') : false;
                const res = await fetch(`/tasks/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: taskText, completed })
                });
                const updated = await res.json();
                // replace dom
                if (li) li.remove();
                createTaskDom(updated);
                editingId = null;
            } else {
                // Create new
                const res = await fetch('/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: taskText })
                });
                const created = await res.json();
                if (!created || !created.id) {
                    console.warn('Server did not return an id for created task', created);
                }
                createTaskDom(created);
            }

            taskInput.value = '';
            toggleEmptyState();
            updateProgress();
        } catch (err) {
            console.error('Failed to submit task', err);
        }
    };

    addTaskBtn.addEventListener('click', (e) => {
        e.preventDefault();
        submitTask();
    });

    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitTask();
        }
    });

    // Initial load
    loadTasks();
});