document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');
    const emptyImage = document.querySelector('.empty-img');
    const nimbusContainer = document.querySelector('.nimbus-container');
    const progressBar = document.getElementById('progress'); // Fixed typo
    const progressNumber = document.getElementById('numbers');

    const toggleEmptyState = () => {
        if (emptyImage) emptyImage.style.display = taskList.children.length === 0 ? 'block' : 'none';
        if (nimbusContainer) nimbusContainer.style.width = taskList.children.length > 0 ? '100%' : '50%';
    };

   const updateProgress = () => {
    // 1. Get the current counts
    const totalTasks = taskList.children.length;
    const completedTasks = taskList.querySelectorAll('.checkbox:checked').length;

    // 2. Calculate percentage (Avoid division by zero)
    const progressPercent = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;

    // 3. Update the UI elements
    if (progressBar) {
        progressBar.style.width = `${progressPercent}%`;
    }
    if (progressNumber) {
        progressNumber.textContent = `${completedTasks} / ${totalTasks}`;
    }
};

    const addTask = (text, completed = false) => {
        const taskText = text || taskInput.value.trim();
        if (!taskText) return;

        const li = document.createElement('li');
        li.innerHTML = `
            <input type="checkbox" class="checkbox" ${completed ? 'checked' : ''}>
            <span></span>
            <div class="task-buttons">
                <button class="edit-btn"><i class="fa-solid fa-pen"></i></button>
                <button class="delete-btn"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        
        // Use textContent for safety against XSS
        li.querySelector('span').textContent = taskText;

        const checkbox = li.querySelector('.checkbox');
        const editBtn = li.querySelector('.edit-btn');
        const deleteBtn = li.querySelector('.delete-btn');

        if (completed) {
            li.classList.add('completed');
            editBtn.disabled = true;
            editBtn.style.opacity = '0.5';
            editBtn.style.pointerEvents = 'none';
        }

        checkbox.addEventListener('change', () => {
            const isChecked = checkbox.checked;
            li.classList.toggle('completed', isChecked);
            editBtn.disabled = isChecked;
            editBtn.style.opacity = isChecked ? '0.5' : '1';
            editBtn.style.pointerEvents = isChecked ? 'none' : 'auto';
            updateProgress(); // Update when checked/unchecked
        });

        editBtn.addEventListener('click', () => {
            if (!checkbox.checked) {
                taskInput.value = li.querySelector('span').textContent;
                li.remove();
                toggleEmptyState();
                updateProgress(); // Update when removing for edit
                taskInput.focus();
            }
        });

        deleteBtn.addEventListener('click', () => {
            li.remove();
            toggleEmptyState();
            updateProgress(); // Update when deleted
        });

        taskList.appendChild(li);
        taskInput.value = '';
        toggleEmptyState();
        updateProgress(); // Update when added
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
});