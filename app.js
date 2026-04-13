document.addEventListener('DOMContentLoaded', () => {
    // --- State & Constants ---
    const TOTAL_DAYS = 75;
    const STATE_KEY_PREFIX = '75days_day_';
    const TITLE_KEY = '75days_title';
    const THEME_KEY = '75days_theme';
    const CONFIG_KEY = '75days_config';

    const WEEK_DAYS = [
        { id: 1, name: 'Monday' },
        { id: 2, name: 'Tuesday' },
        { id: 3, name: 'Wednesday' },
        { id: 4, name: 'Thursday' },
        { id: 5, name: 'Friday' },
        { id: 6, name: 'Saturday' },
        { id: 0, name: 'Sunday' }
    ];

    let currentEditingDay = null;

    // --- DOM Elements ---
    const appTitle = document.getElementById('app-title');
    const resetBtn = document.getElementById('reset-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const moonIcon = document.getElementById('moon-icon');
    const sunIcon = document.getElementById('sun-icon');
    const htmlEl = document.documentElement;

    // Views
    const setupView = document.getElementById('setup-view');
    const mainView = document.getElementById('main-view');
    const daysConfigContainer = document.getElementById('days-config-container');
    const startDateInput = document.getElementById('start-date');
    const startChallengeBtn = document.getElementById('start-challenge-btn');
    const daysGrid = document.getElementById('days-grid');

    // Modal
    const modal = document.getElementById('day-modal');
    const closeBtn = document.querySelector('.close-btn');
    const modalTitle = document.getElementById('modal-day-title');
    const saveDayBtn = document.getElementById('save-day-btn');
    const modalHabitsList = document.getElementById('modal-habits-list');
    const modalStatusText = document.getElementById('modal-status-text');

    // --- Initialization ---
    initTheme();
    initTitle();
    initApp();

    function initApp() {
        const configStr = localStorage.getItem(CONFIG_KEY);
        if (configStr) {
            setupView.style.display = 'none';
            mainView.style.display = 'block';
            generateGrid();
        } else {
            mainView.style.display = 'none';
            setupView.style.display = 'block';
            renderSetup();
        }
    }

    // --- Setup Logic ---
    function renderSetup() {
        daysConfigContainer.innerHTML = '';
        startDateInput.valueAsDate = new Date(); // Default to today

        WEEK_DAYS.forEach(day => {
            const block = document.createElement('div');
            block.className = 'config-day-block';
            block.dataset.dayId = day.id;

            block.innerHTML = `
                <h3>${day.name}</h3>
                <div class="tasks-wrapper" id="tasks-wrapper-${day.id}">
                    <!-- Initial empty task or default tasks can go here -->
                </div>
                <button class="add-task-btn" type="button" data-day-id="${day.id}">+ Add Task</button>
            `;
            daysConfigContainer.appendChild(block);

            // Add default first task
            addTaskRow(day.id);
        });

        // Add task button events
        document.querySelectorAll('.add-task-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const dayId = e.target.getAttribute('data-day-id');
                addTaskRow(dayId);
            });
        });
    }

    function addTaskRow(dayId, defaultText = '') {
        const wrapper = document.getElementById(`tasks-wrapper-${dayId}`);
        const row = document.createElement('div');
        row.className = 'config-task-row';
        row.innerHTML = `
            <input type="text" class="task-input" placeholder="e.g. Drink 1G water" value="${defaultText}">
            <button class="remove-task-btn" type="button">&times;</button>
        `;
        
        row.querySelector('.remove-task-btn').addEventListener('click', () => {
            row.remove();
        });

        wrapper.appendChild(row);
    }

    startChallengeBtn.addEventListener('click', () => {
        const startDate = startDateInput.value;
        if (!startDate) {
            alert('Please select a Start Date.');
            return;
        }

        const weekTasks = {};
        WEEK_DAYS.forEach(day => {
            const wrapper = document.getElementById(`tasks-wrapper-${day.id}`);
            const inputs = wrapper.querySelectorAll('.task-input');
            const tasks = Array.from(inputs).map(inp => inp.value.trim()).filter(val => val !== '');
            weekTasks[day.id] = tasks;
        });

        const config = {
            startDate: startDate,
            weekTasks: weekTasks
        };

        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
        
        // Hide setup, show main view
        setupView.style.display = 'none';
        mainView.style.display = 'block';
        generateGrid();
    });


    // --- Core Logic ---

    function getChallengeConfig() {
        return JSON.parse(localStorage.getItem(CONFIG_KEY));
    }

    // Safe local date parsing to avoid timezone shifts
    function parseLocalDate(dateString) {
        const parts = dateString.split('-');
        if (parts.length === 3) {
            return new Date(parts[0], parts[1] - 1, parts[2]);
        }
        return new Date(dateString + 'T00:00:00'); // Fallback
    }

    // Get tasks for a specific day 1-75
    function getTasksForDay(dayNum) {
        const config = getChallengeConfig();
        if (!config) return [];

        const start = parseLocalDate(config.startDate);
        const current = new Date(start.getTime() + (dayNum - 1) * 24 * 60 * 60 * 1000);
        const dayOfWeek = current.getDay(); // 0 (Sun) to 6 (Sat)
        
        return config.weekTasks[dayOfWeek] || [];
    }

    function generateGrid() {
        daysGrid.innerHTML = '';
        const config = getChallengeConfig();
        if (!config) return;

        const start = parseLocalDate(config.startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to local midnight

        for (let i = 1; i <= TOTAL_DAYS; i++) {
            const tasks = getTasksForDay(i);
            const dayState = getDayState(i);
            const totalHabits = tasks.length;
            const completedHabits = Object.values(dayState).filter(Boolean).length;
            
            const card = document.createElement('div');
            card.classList.add('day-card');
            card.dataset.day = i;
            
            const currentDayDate = new Date(start.getTime() + (i - 1) * 24 * 60 * 60 * 1000);
            const isFutureLocked = currentDayDate.getTime() > today.getTime();

            // Pending / Completed / Locked logic
            let statusText = "Pending";
            
            if (isFutureLocked) {
                card.classList.add('locked');
                statusText = "🔒 Locked";
            } else if (totalHabits === 0) {
                // If no tasks assigned for this day of week, treat as completed
                card.classList.add('completed');
                statusText = "Completed";
            } else if (completedHabits === totalHabits) {
                card.classList.add('completed');
                statusText = "Completed";
            } else if (completedHabits > 0) {
                card.classList.add('partial');
            }

            const headerHtml = `<h3>Day ${i}</h3>`;
            const statusHtml = isFutureLocked ? 
                `<div class="day-status">${statusText}</div>` : 
                `<div class="day-status"><span class="status-dot"></span>${totalHabits === 0 ? 'No tasks' : statusText}</div>`;

            card.innerHTML = headerHtml + statusHtml;

            card.addEventListener('click', () => {
                if (isFutureLocked) {
                    alert(`Day ${i} unlocks on ${currentDayDate.toLocaleDateString()}`);
                    return;
                }
                openModal(i, tasks, dayState);
            });
            daysGrid.appendChild(card);
        }
    }

    function getDayState(dayNum) {
        const stored = localStorage.getItem(`${STATE_KEY_PREFIX}${dayNum}`);
        if (stored) {
            return JSON.parse(stored);
        }
        return {}; // Will map { taskIndex: boolean }
    }

    // Modal Logic
    function openModal(dayNum, tasks, state) {
        currentEditingDay = dayNum;
        modalTitle.textContent = `Day ${dayNum}`;
        
        modalHabitsList.innerHTML = '';

        if (tasks.length === 0) {
            modalHabitsList.innerHTML = '<p style="color: var(--text-secondary);">No tasks configured for this day of the week.</p>';
            modalStatusText.textContent = "Completed";
            modalStatusText.className = "modal-status-text completed";
        } else {
            tasks.forEach((taskName, index) => {
                const isChecked = state[index] || false;
                
                const label = document.createElement('label');
                label.className = 'habit-btn';
                label.innerHTML = `
                    <input type="checkbox" id="modal-task-${index}" ${isChecked ? 'checked' : ''}>
                    <span class="habit-text">${taskName}</span>
                `;
                
                // Add change listener to instantly calculate status text
                label.querySelector('input').addEventListener('change', updateModalStatusText);
                
                modalHabitsList.appendChild(label);
            });
            updateModalStatusText();
        }

        modal.classList.add('show');
    }

    function updateModalStatusText() {
        const inputs = modalHabitsList.querySelectorAll('input[type="checkbox"]');
        if (inputs.length === 0) return;
        
        let checked = 0;
        inputs.forEach(i => { if (i.checked) checked++; });
        
        if (checked === inputs.length) {
            modalStatusText.textContent = "Completed";
            modalStatusText.className = "modal-status-text completed";
        } else {
            modalStatusText.textContent = "Pending";
            modalStatusText.className = "modal-status-text";
        }
    }

    function closeModal() {
        modal.classList.remove('show');
        currentEditingDay = null;
    }

    saveDayBtn.addEventListener('click', () => {
        if (!currentEditingDay) return;

        const inputs = modalHabitsList.querySelectorAll('input[type="checkbox"]');
        const newState = {};
        
        inputs.forEach((input, index) => {
            newState[index] = input.checked;
        });

        localStorage.setItem(`${STATE_KEY_PREFIX}${currentEditingDay}`, JSON.stringify(newState));
        closeModal();
        generateGrid();
    });

    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // --- Title Logic ---
    function initTitle() {
        const storedTitle = localStorage.getItem(TITLE_KEY);
        if (storedTitle) {
            appTitle.textContent = storedTitle;
        }

        appTitle.addEventListener('blur', () => {
            localStorage.setItem(TITLE_KEY, appTitle.textContent.trim());
        });
        appTitle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                appTitle.blur();
            }
        });
    }

    // --- Reset Logic ---
    resetBtn.addEventListener('click', () => {
        const isConfirmed = confirm('Are you sure you want to reset all your progress and configuration? This cannot be undone.');
        if (isConfirmed) {
            localStorage.removeItem(CONFIG_KEY);
            for (let i = 1; i <= TOTAL_DAYS; i++) {
                localStorage.removeItem(`${STATE_KEY_PREFIX}${i}`);
            }
            initApp();
        }
    });

    // --- Theme Logic ---
    function initTheme() {
        const storedTheme = localStorage.getItem(THEME_KEY);
        if (storedTheme === 'dark') {
            setTheme('dark');
        } else {
            setTheme('light');
        }
        
        themeToggle.addEventListener('click', () => {
            const currentTheme = htmlEl.getAttribute('data-theme');
            setTheme(currentTheme === 'light' ? 'dark' : 'light');
        });
    }

    function setTheme(theme) {
        htmlEl.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
        
        if (theme === 'dark') {
            moonIcon.style.display = 'none';
            sunIcon.style.display = 'block';
        } else {
            moonIcon.style.display = 'block';
            sunIcon.style.display = 'none';
        }
    }
});
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log("Service Worker Registered"));
}