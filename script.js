document.addEventListener('DOMContentLoaded', () => {
    // --- CATEGORY DEFINITIONS ---
    const CATEGORIES = [
        { key: 'cast', title: 'Cast', icon: 'fa-user-ninja', color: 'var(--color-cast)' },
        { key: 'props', title: 'Props', icon: 'fa-magic-wand-sparkles', color: 'var(--color-props)' },
        { key: 'costumes', title: 'Costumes', icon: 'fa-shirt', color: 'var(--color-costumes)' },
        { key: 'makeup', title: 'Hair & Makeup', icon: 'fa-palette', color: 'var(--color-makeup)' },
        { key: 'vehicles', title: 'Vehicles', icon: 'fa-car', color: 'var(--color-vehicles)' },
        { key: 'sfx', title: 'Special Effects', icon: 'fa-bomb', color: 'var(--color-sfx)' },
        { key: 'sound', title: 'Sound', icon: 'fa-volume-high', color: 'var(--color-sound)' },
        { key: 'stunts', title: 'Stunts', icon: 'fa-bolt', color: 'var(--color-stunts)' },
    ];

    // --- GLOBAL STATE ---
    let projectData = { breakdowns: [], projectInfo: {} };
    let currentBreakdown = {}; // Holds items for the scene being entered in the form
    let activeFilter = { type: 'all', value: '' };

    // --- INITIALIZATION ---
    function initialize() {
        setupEventListeners();
        createEntryGrid();
        loadProjectData();
    }

    // --- SETUP EVENT LISTENERS ---
    function setupEventListeners() {
        const safeAddListener = (id, event, handler) => {
            const element = document.getElementById(id);
            if (element) element.addEventListener(event, handler);
        };

        safeAddListener('breakdown-form', 'submit', handleAddBreakdown);
        
        const hamburgerBtn = document.getElementById('hamburger-btn');
        const dropdownMenu = document.getElementById('dropdown-menu');
        if(hamburgerBtn) hamburgerBtn.addEventListener('click', (e) => { e.stopPropagation(); dropdownMenu.classList.toggle('show'); });

        safeAddListener('project-info-btn', 'click', openProjectModal);
        safeAddListener('open-project-btn', 'click', () => document.getElementById('file-input').click());
        safeAddListener('file-input', 'change', openProjectFile);
        safeAddListener('save-project-btn', 'click', saveProjectFile);
        safeAddListener('save-excel-btn', 'click', saveAsExcel);
        safeAddListener('clear-project-btn', 'click', clearProject);

        const filterPanel = document.getElementById('filter-panel');
        safeAddListener('filter-panel-btn', 'click', () => filterPanel.classList.add('open'));
        safeAddListener('close-panel-btn', 'click', () => filterPanel.classList.remove('open'));
        safeAddListener('apply-filter-btn', 'click', applyFilter);
        safeAddListener('clear-filter-btn', 'click', resetFilter);

        document.addEventListener('click', (event) => {
            if (hamburgerBtn && dropdownMenu && dropdownMenu.classList.contains('show') && !hamburgerBtn.contains(event.target) && !dropdownMenu.contains(event.target)) {
                dropdownMenu.classList.remove('show');
            }
        });
    }

    // --- UI CREATION ---
    function createEntryGrid() {
        const grid = document.getElementById('breakdown-entry-grid');
        CATEGORIES.forEach(cat => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'breakdown-entry-category';
            categoryDiv.style.borderTopColor = cat.color;
            categoryDiv.innerHTML = `
                <h4><i class="fas ${cat.icon}"></i> ${cat.title}</h4>
                <form class="add-item-form" data-category="${cat.key}">
                    <input type="text" placeholder="Add element..." required>
                    <button type="submit">Add</button>
                </form>
                <ul class="item-list-entry" id="entry-list-${cat.key}"></ul>
            `;
            grid.appendChild(categoryDiv);
            
            // Add listener for the mini "Add" button
            categoryDiv.querySelector('.add-item-form').addEventListener('submit', (e) => {
                e.preventDefault();
                const categoryKey = e.target.dataset.category;
                const input = e.target.querySelector('input');
                const value = input.value.trim();
                if (value) {
                    if (!currentBreakdown[categoryKey]) currentBreakdown[categoryKey] = [];
                    currentBreakdown[categoryKey].push(value);
                    renderCurrentBreakdownList(categoryKey);
                    input.value = '';
                }
            });
        });
    }

    function renderCurrentBreakdownList(categoryKey) {
        const list = document.getElementById(`entry-list-${categoryKey}`);
        list.innerHTML = '';
        if (currentBreakdown[categoryKey]) {
            currentBreakdown[categoryKey].forEach((item, index) => {
                const li = document.createElement('li');
                li.className = 'tagged-item-entry';
                li.innerHTML = `<span></span><button class="delete-item-btn">&times;</button>`;
                li.querySelector('span').textContent = item;
                li.querySelector('.delete-item-btn').onclick = () => {
                    currentBreakdown[categoryKey].splice(index, 1);
                    renderCurrentBreakdownList(categoryKey);
                };
                list.appendChild(li);
            });
        }
    }

    // --- CORE DATA HANDLING ---
    function handleAddBreakdown(e) {
        e.preventDefault();
        const sceneDetails = {
            id: Date.now(),
            sceneNumber: document.getElementById('scene-number').value,
            sceneType: document.getElementById('scene-type').value,
            sceneLocation: document.getElementById('scene-location').value,
            sceneTime: document.getElementById('scene-time').value,
        };

        const newBreakdown = { ...sceneDetails, ...currentBreakdown };
        projectData.breakdowns.push(newBreakdown);
        saveProjectData();
        renderBreakdowns();
        
        // Reset form and temporary data
        currentBreakdown = {};
        document.getElementById('breakdown-form').reset();
        CATEGORIES.forEach(cat => renderCurrentBreakdownList(cat.key));
    }

    function renderBreakdowns() {
        const container = document.getElementById('breakdown-strips-container');
        container.innerHTML = '';
        const visibleBreakdowns = getVisibleBreakdowns();

        visibleBreakdowns.forEach(breakdown => {
            const stripWrapper = document.createElement('div');
            stripWrapper.className = 'breakdown-strip-wrapper';
            
            let summaryHTML = '';
            CATEGORIES.forEach(cat => {
                const count = breakdown[cat.key] ? breakdown[cat.key].length : 0;
                if (count > 0) {
                    summaryHTML += `<div class="strip-item-summary" style="color:${cat.color};">
                        <i class="fas ${cat.icon}"></i><span class="count">${count}</span>
                    </div>`;
                }
            });

            stripWrapper.innerHTML = `
                <div class="breakdown-strip">
                    <div class="strip-item-scene">#${breakdown.sceneNumber} - ${breakdown.sceneLocation}</div>
                    ${summaryHTML}
                </div>
                <div class="strip-actions">
                    <button class="edit-btn-strip" title="Edit Breakdown"><i class="fas fa-pencil-alt"></i></button>
                    <button class="share-btn-strip" title="Share as Image"><i class="fas fa-share-alt"></i></button>
                </div>
            `;

            stripWrapper.querySelector('.edit-btn-strip').onclick = () => openEditModal(breakdown.id);
            stripWrapper.querySelector('.share-btn-strip').onclick = () => shareSceneBreakdown(breakdown.id);
            container.appendChild(stripWrapper);
        });
    }
    
    // --- LOCALSTORAGE PERSISTENCE ---
    function saveProjectData() {
        localStorage.setItem('scriptBreakdownProject', JSON.stringify(projectData));
    }
    function loadProjectData() {
        const savedData = localStorage.getItem('scriptBreakdownProject');
        projectData = savedData ? JSON.parse(savedData) : { breakdowns: [], projectInfo: {} };
        renderBreakdowns();
    }
    function clearProject() {
        if(confirm("Are you sure you want to clear all breakdown data? This cannot be undone.")){
            projectData = { breakdowns: [], projectInfo: {} };
            saveProjectData();
            renderBreakdowns();
        }
    }
    
    // --- EDIT MODAL LOGIC ---
    function openEditModal(breakdownId) {
        const modal = document.getElementById('edit-breakdown-modal');
        const breakdown = projectData.breakdowns.find(b => b.id === breakdownId);
        if (!breakdown) return;

        let categoryHTML = '';
        CATEGORIES.forEach(cat => {
            categoryHTML += `
                <div class="breakdown-entry-category" style="border-top-color: ${cat.color};">
                    <h4><i class="fas ${cat.icon}"></i> ${cat.title}</h4>
                    <form class="add-item-form" data-category="${cat.key}">
                        <input type="text" placeholder="Add element...">
                        <button type="submit">Add</button>
                    </form>
                    <ul class="item-list-entry" id="edit-list-${cat.key}"></ul>
                </div>
            `;
        });

        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-btn" id="close-edit-modal">&times;</span>
                <h3>Edit Scene #${breakdown.sceneNumber}</h3>
                <div class="breakdown-grid">${categoryHTML}</div>
                <div class="modal-actions">
                    <button id="delete-breakdown-btn" class="btn-danger">Delete Breakdown</button>
                    <button id="save-changes-btn" class="btn-primary">Save Changes</button>
                </div>
            </div>
        `;
        modal.style.display = 'block';

        // Populate lists and attach listeners
        let tempEditData = JSON.parse(JSON.stringify(breakdown)); // Deep copy to edit temporarily
        CATEGORIES.forEach(cat => {
            modal.querySelector(`[data-category="${cat.key}"]`).addEventListener('submit', (e) => {
                e.preventDefault();
                const input = e.target.querySelector('input');
                if (input.value.trim()) {
                    if (!tempEditData[cat.key]) tempEditData[cat.key] = [];
                    tempEditData[cat.key].push(input.value.trim());
                    renderEditList(cat.key, tempEditData);
                    input.value = '';
                }
            });
            renderEditList(cat.key, tempEditData);
        });

        document.getElementById('close-edit-modal').onclick = () => modal.style.display = 'none';
        document.getElementById('save-changes-btn').onclick = () => handleSaveChanges(breakdownId, tempEditData);
        document.getElementById('delete-breakdown-btn').onclick = () => handleDelete(breakdownId);
    }

    function renderEditList(categoryKey, data) {
        const list = document.getElementById(`edit-list-${categoryKey}`);
        list.innerHTML = '';
        if (data[categoryKey]) {
            data[categoryKey].forEach((item, index) => {
                const li = document.createElement('li');
                li.className = 'tagged-item-entry';
                li.innerHTML = `<span></span><button class="delete-item-btn">&times;</button>`;
                li.querySelector('span').textContent = item;
                li.querySelector('.delete-item-btn').onclick = () => {
                    data[categoryKey].splice(index, 1);
                    renderEditList(categoryKey, data);
                };
                list.appendChild(li);
            });
        }
    }
    
    function handleSaveChanges(id, updatedData) {
        const breakdownIndex = projectData.breakdowns.findIndex(b => b.id === id);
        if (breakdownIndex > -1) {
            projectData.breakdowns[breakdownIndex] = { ...projectData.breakdowns[breakdownIndex], ...updatedData };
            saveProjectData();
            renderBreakdowns();
            document.getElementById('edit-breakdown-modal').style.display = 'none';
        }
    }
    
    function handleDelete(id) {
        if(confirm("Are you sure you want to delete this entire scene breakdown?")){
            projectData.breakdowns = projectData.breakdowns.filter(b => b.id !== id);
            saveProjectData();
            renderBreakdowns();
            document.getElementById('edit-breakdown-modal').style.display = 'none';
        }
    }

    // --- FILTERING LOGIC ---
    function getVisibleBreakdowns() {
        if (activeFilter.type === 'all' || activeFilter.value === '') {
            return projectData.breakdowns;
        }
        return projectData.breakdowns.filter(b => {
            const categoryItems = b[activeFilter.type];
            if (Array.isArray(categoryItems)) {
                return categoryItems.some(item => item.toLowerCase().includes(activeFilter.value));
            }
            return false;
        });
    }

    function applyFilter() {
        const category = document.getElementById('filter-category-select').value;
        const value = document.getElementById('filter-value-input').value.trim().toLowerCase();
        activeFilter = { type: category, value: value };
        renderBreakdowns();
        document.getElementById('filter-panel').classList.remove('open');
    }
    
    function resetFilter() {
        activeFilter = { type: 'all', value: '' };
        document.getElementById('filter-category-select').value = 'all';
        document.getElementById('filter-value-input').value = '';
        renderBreakdowns();
    }

    // Initialize the filter category dropdown
    const filterCategorySelect = document.getElementById('filter-category-select');
    filterCategorySelect.innerHTML = `<option value="all">Filter by Category...</option>`;
    CATEGORIES.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.key;
        option.textContent = cat.title;
        filterCategorySelect.appendChild(option);
    });

    // --- EXCEL & OTHER FUNCTIONS ---
    function saveAsExcel() {
        const visibleBreakdowns = getVisibleBreakdowns();
        if(visibleBreakdowns.length === 0){
            alert("No data to export.");
            return;
        }
        
        const dataForSheet = visibleBreakdowns.map(b => {
            let row = {
                'Scene #': b.sceneNumber,
                'Scene Heading': `${b.sceneType}. ${b.sceneLocation} - ${b.sceneTime}`
            };
            CATEGORIES.forEach(cat => {
                row[cat.title] = b[cat.key] ? b[cat.key].join(', ') : '';
            });
            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Script Breakdown");
        XLSX.writeFile(workbook, "ScriptBreakdown.xlsx");
    }

    // Placeholder for Project Info Modal
    function openProjectModal() { alert("Project Info button clicked!"); }
    // Placeholder for file operations
    function saveProjectFile() { alert("Save Project button clicked!"); }
    function openProjectFile() { alert("Open Project button clicked!"); }
    // Placeholder for Share as Image
    async function shareSceneBreakdown(id) { alert(`Share for scene ID ${id} would be implemented here.`); }
    
    // --- START THE APP ---
    initialize();
});
