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

    const saveTasks = () => {
        const tasks = [];
        taskList.querySelectorAll('li').forEach(li => {
            tasks.push({
                text: li.querySelector('span').textContent,
                completed: li.classList.contains('completed')
            });
        });
        localStorage.setItem('nimbus_tasks', JSON.stringify(tasks));
    };

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
        saveTasks(); 
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

    // --- EVENT LISTENERS ---

    // FIXED: Added missing closing braces below
   if (resetBtn) { resetBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to reset all tasks and progress?")) {
            // 1. Clear the visual list
            taskList.innerHTML = '';
            
            // 2. Clear the input field
            taskInput.value = '';
            
            // 3. Delete from permanent storage
            localStorage.removeItem('nimbus_tasks');
            
            // 4. Reset UI States
            stopConfetti();      // Stop any active celebrations
            updateProgress();    // This will reset the progress bar and "0/0" text
            toggleEmptyState();  // This will show your 'check.png' image again
        }
    });
}

    const addTask = (text, completed = false) => {
        const taskText = text || taskInput.value.trim();
        if (!taskText) return;

        stopConfetti();
        const li = document.createElement('li');
        if (completed) li.classList.add('completed');

        li.innerHTML = `
            <input type="checkbox" class="checkbox" ${completed ? 'checked' : ''}>
            <span></span>
            <div class="task-buttons">
                <button class="edit-btn"><i class="fa-solid fa-pen"></i></button>
                <button class="delete-btn"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;

        li.querySelector('span').textContent = taskText;

        const checkbox = li.querySelector('.checkbox');
        const editBtn = li.querySelector('.edit-btn');
        const deleteBtn = li.querySelector('.delete-btn');

        // Toggle edit button style based on completion
        const updateEditStyle = (isComplete) => {
            editBtn.disabled = isComplete;
            editBtn.style.opacity = isComplete ? '0.5' : '1';
            editBtn.style.pointerEvents = isComplete ? 'none' : 'auto';
        };

        updateEditStyle(completed);

        checkbox.addEventListener('change', () => {
            li.classList.toggle('completed', checkbox.checked);
            updateEditStyle(checkbox.checked);
            updateProgress(); 
        });

        editBtn.addEventListener('click', () => {
            taskInput.value = li.querySelector('span').textContent;
            li.remove();
            updateProgress();
            taskInput.focus();
        });

        deleteBtn.addEventListener('click', () => {
            li.remove();
            toggleEmptyState();
            updateProgress();
        });

        taskList.appendChild(li);
        taskInput.value = '';
        toggleEmptyState();
        updateProgress();
    };

    const loadTasks = () => {
        const savedTasks = JSON.parse(localStorage.getItem('nimbus_tasks')) || [];
        savedTasks.forEach(task => addTask(task.text, task.completed));
    };

    addTaskBtn.addEventListener('click', (e) => {
        e.preventDefault();
        addTask();
    });

    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTask();
        }
    });

    loadTasks();
});