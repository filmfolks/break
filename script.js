document.addEventListener('DOMContentLoaded', () => {
    console.log("Script Breakdown Initializing...");

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

    let projectData = { panelItems: [], activeItemId: null, projectInfo: {} };
    let currentBreakdown = {};
    let currentMode = 'assistant';

    function initialize() {
        setupEventListeners();
        createEntryGrid();
        loadProjectData();
        setMode(localStorage.getItem('breakdownAppMode') || 'assistant');
    }

    function setupEventListeners() {
        const safeAddListener = (id, event, handler) => {
            const element = document.getElementById(id);
            if (element) element.addEventListener(event, handler);
        };
        
        const hamburgerBtn = document.getElementById('hamburger-btn');
        const dropdownMenu = document.getElementById('dropdown-menu');
        if(hamburgerBtn) hamburgerBtn.addEventListener('click', (e) => { e.stopPropagation(); dropdownMenu.classList.toggle('show'); });
        
        document.addEventListener('click', (event) => {
            if (hamburgerBtn && dropdownMenu.classList.contains('show') && !hamburgerBtn.contains(event.target) && !dropdownMenu.contains(event.target)) {
                dropdownMenu.classList.remove('show');
            }
        });
        
        safeAddListener('breakdown-form', 'submit', handleAddBreakdownToSequence);
        safeAddListener('project-info-btn', 'click', openProjectInfoModal);
        safeAddListener('open-project-btn', 'click', () => document.getElementById('file-input').click());
        safeAddListener('file-input', 'change', openProjectFile);
        safeAddListener('save-project-btn', 'click', saveProjectFile);
        safeAddListener('save-excel-btn', 'click', saveAsExcel);
        safeAddListener('clear-project-btn', 'click', clearProject);
        safeAddListener('assistant-mode-btn', 'click', () => setMode('assistant'));
        safeAddListener('producer-mode-btn', 'click', () => setMode('producer'));
        safeAddListener('project-cost-btn', 'click', openProjectCostModal);
        safeAddListener('sequence-hamburger-btn', 'click', () => document.getElementById('sequence-panel').classList.add('open'));
        safeAddListener('close-panel-btn', 'click', () => document.getElementById('sequence-panel').classList.remove('open'));
        safeAddListener('new-sequence-btn', 'click', handleNewSequence);
        safeAddListener('add-schedule-break-btn', 'click', handleAddScheduleBreak);
    }

    function setMode(mode) {
        currentMode = mode;
        localStorage.setItem('breakdownAppMode', mode);
        const container = document.getElementById('main-container');
        const assistantBtn = document.getElementById('assistant-mode-btn');
        const producerBtn = document.getElementById('producer-mode-btn');
        if (!container || !assistantBtn || !producerBtn) return;

        if (mode === 'producer') {
            container.classList.add('producer-mode');
            producerBtn.classList.add('active-mode');
            assistantBtn.classList.remove('active-mode');
        } else {
            container.classList.remove('producer-mode');
            assistantBtn.classList.add('active-mode');
            producerBtn.classList.remove('active-mode');
        }
        calculateAndDisplayTotalCost();
    }

    function createEntryGrid(gridId = 'breakdown-entry-grid', targetData = currentBreakdown) {
        const grid = document.getElementById(gridId);
        if (!grid) return;
        grid.innerHTML = '';
        CATEGORIES.forEach(cat => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'breakdown-entry-category';
            categoryDiv.style.borderTopColor = cat.color;
            categoryDiv.innerHTML = `<h4><i class="fas ${cat.icon}"></i> ${cat.title}</h4>
                <form class="add-item-form" data-category="${cat.key}">
                    <input type="text" placeholder="Add element..." required>
                    <button type="submit">Add</button>
                </form>
                <ul class="item-list-entry" id="list-${gridId}-${cat.key}"></ul>`;
            grid.appendChild(categoryDiv);
            
            categoryDiv.querySelector('.add-item-form').addEventListener('submit', (e) => {
                e.preventDefault();
                const categoryKey = e.target.dataset.category;
                const input = e.target.querySelector('input');
                if (input.value.trim()) {
                    if (!targetData[categoryKey]) targetData[categoryKey] = [];
                    targetData[categoryKey].push({ name: input.value.trim(), cost: 0 });
                    renderItemList(`list-${gridId}-${cat.key}`, categoryKey, targetData);
                    input.value = '';
                }
            });
            renderItemList(`list-${gridId}-${cat.key}`, categoryKey, targetData);
        });
    }
    
    function renderItemList(listId, categoryKey, data) {
        const list = document.getElementById(listId);
        if (!list) return;
        list.innerHTML = '';
        if (data[categoryKey]) {
            data[categoryKey].forEach((item, index) => {
                const li = document.createElement('li');
                li.className = 'tagged-item-entry';
                li.innerHTML = `<span class="tagged-item-name"></span>
                    <input type="number" class="cost-input" placeholder="Cost" min="0" step="0.01">
                    <button type="button" class="delete-item-btn">&times;</button>`;
                li.querySelector('.tagged-item-name').textContent = item.name;
                
                const costInput = li.querySelector('.cost-input');
                costInput.value = item.cost || '';
                costInput.oninput = () => { 
                    item.cost = parseFloat(costInput.value) || 0; 
                    calculateAndDisplayTotalCost();
                };

                li.querySelector('.delete-item-btn').onclick = () => {
                    data[categoryKey].splice(index, 1);
                    renderItemList(listId, categoryKey, data);
                    calculateAndDisplayTotalCost();
                };
                list.appendChild(li);
            });
        }
    }

    function handleAddBreakdownToSequence(e) {
        e.preventDefault();
        const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
        if (!activeSequence) {
            alert("No active sequence. Please create or select a sequence from the side panel first.");
            return;
        }

        const sceneNumberInput = document.getElementById('scene-number');
        if (!sceneNumberInput.value.trim()) { alert('Please enter a Scene Number.'); return; }
        
        const sceneDetails = {
            id: Date.now(),
            sceneNumber: sceneNumberInput.value,
            sceneType: document.getElementById('scene-type').value,
            sceneLocation: document.getElementById('scene-location').value,
            sceneTime: document.getElementById('scene-time').value,
        };

        const newBreakdown = { ...sceneDetails, ...currentBreakdown };
        activeSequence.breakdowns.push(newBreakdown);
        
        saveProjectData();
        renderBreakdowns();
        currentBreakdown = {};
        document.getElementById('breakdown-form').reset();
        createEntryGrid(); // Re-creates the main form with empty lists
    }
    
    function renderBreakdowns() {
        const container = document.getElementById('breakdown-strips-container');
        const display = document.getElementById('active-sequence-display');
        const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
        
        if (!activeSequence) {
            display.textContent = 'No active sequence. Create one from the side panel.';
            container.innerHTML = '';
            return;
        }

        display.textContent = `Current Sequence: ${activeSequence.name}`;
        container.innerHTML = '';
        if (!activeSequence.breakdowns) activeSequence.breakdowns = [];
        
        activeSequence.breakdowns.forEach(breakdown => {
            const stripWrapper = document.createElement('div');
            stripWrapper.className = 'breakdown-strip-wrapper';
            let summaryHTML = '';
            CATEGORIES.forEach(cat => {
                const count = breakdown[cat.key] ? breakdown[cat.key].length : 0;
                if (count > 0) {
                    summaryHTML += `<div class="strip-item-summary" style="color:${cat.color};"><i class="fas ${cat.icon}"></i><span class="count">${count}</span></div>`;
                }
            });
            stripWrapper.innerHTML = `
                <div class="breakdown-strip">
                    <div class="strip-item-scene">#${breakdown.sceneNumber} - ${breakdown.sceneLocation} (${breakdown.sceneTime})</div>
                    ${summaryHTML}
                </div>
                <div class="strip-actions">
                    <button class="edit-btn-strip" title="Edit Breakdown"><i class="fas fa-pencil-alt"></i></button>
                </div>`;
            stripWrapper.querySelector('.edit-btn-strip').onclick = () => openEditModal(breakdown.id);
            container.appendChild(stripWrapper);
        });
        calculateAndDisplayTotalCost();
    }

    function calculateAndDisplayTotalCost() {
        const display = document.getElementById('total-cost-display');
        let totalCost = 0;
        projectData.panelItems.forEach(item => {
            if (item.type === 'sequence' && item.breakdowns) {
                item.breakdowns.forEach(scene => {
                    CATEGORIES.forEach(cat => {
                        if(scene[cat.key]){
                            scene[cat.key].forEach(item => { totalCost += item.cost || 0; });
                        }
                    });
                });
            }
        });
        display.innerHTML = `<h3>Total Estimated Cost: <span>$${totalCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></h3>`;
    }

    // --- Data Persistence ---
    function saveProjectData() { localStorage.setItem('scriptBreakdownProject', JSON.stringify(projectData)); }

    function loadProjectData() {
        const savedData = localStorage.getItem('scriptBreakdownProject');
        projectData = savedData ? JSON.parse(savedData) : { panelItems: [], activeItemId: null, projectInfo: {} };
        if (!projectData.panelItems) projectData.panelItems = [];
        if (!projectData.projectInfo) projectData.projectInfo = {};
        if (projectData.activeItemId === null && projectData.panelItems.length > 0) {
            const firstSeq = projectData.panelItems.find(i => i.type === 'sequence');
            if (firstSeq) projectData.activeItemId = firstSeq.id;
        }
        renderBreakdowns();
        renderSequencePanel();
    }
    
    function clearProject() {
        if(confirm("Are you sure? This will delete all sequences and breakdowns.")){
            projectData = { panelItems: [], activeItemId: null, projectInfo: {} };
            saveProjectData();
            loadProjectData();
        }
    }

    // --- File I/O ---
    function saveProjectFile() {
        const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(projectData.projectInfo.prodName || 'Breakdown').replace(/ /g, '_')}.filmbreakdown`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    function openProjectFile(event) {
        const file = event.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const loadedData = JSON.parse(e.target.result);
                if (loadedData && loadedData.panelItems && loadedData.projectInfo) {
                    projectData = loadedData;
                    saveProjectData();
                    alert('Project loaded successfully!');
                    loadProjectData();
                } else { alert('Error: Invalid project file format.'); }
            } catch (error) { alert('Error: Could not read project file.'); }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    // --- Modals (Project Info, Edit, Cost Summary) ---
    function openProjectInfoModal() {
        const modal = document.getElementById('project-info-modal');
        const { prodName = '', directorName = '' } = projectData.projectInfo;
        modal.innerHTML = `
            <div class="modal-content small">
                <span class="close-btn">&times;</span>
                <h3>Project Information</h3>
                <div class="modal-form">
                    <input type="text" id="modal-prod-name" placeholder="Production Name" value="${prodName}">
                    <input type="text" id="modal-director-name" placeholder="Director Name" value="${directorName}">
                    <button id="modal-save-info-btn" class="btn-primary">Save Info</button>
                </div>
            </div>`;
        modal.style.display = 'block';
        modal.querySelector('.close-btn').onclick = () => modal.style.display = 'none';
        modal.querySelector('#modal-save-info-btn').onclick = () => {
            projectData.projectInfo.prodName = document.getElementById('modal-prod-name').value;
            projectData.projectInfo.directorName = document.getElementById('modal-director-name').value;
            saveProjectData();
            modal.style.display = 'none';
        };
    }

    function openEditModal(breakdownId) {
        const modal = document.getElementById('edit-breakdown-modal');
        const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
        if (!modal || !activeSequence) return;
        const breakdown = activeSequence.breakdowns.find(b => b.id === breakdownId);
        if (!breakdown) return;

        modal.innerHTML = `
            <div class="modal-content"><span class="close-btn">&times;</span>
                <div class="modal-body">
                    <h3>Edit Scene #${breakdown.sceneNumber}</h3>
                    <div class="breakdown-grid" id="edit-breakdown-grid"></div>
                </div>
                <div class="modal-actions">
                    <button id="delete-breakdown-btn" class="btn-danger">Delete Breakdown</button>
                    <button id="share-breakdown-btn" class="btn-secondary">Share</button>
                    <button id="save-changes-btn" class="btn-primary">Save Changes</button>
                </div>
            </div>`;
        modal.style.display = 'block';
        
        let tempEditData = JSON.parse(JSON.stringify(breakdown));
        createEntryGrid('edit-breakdown-grid', tempEditData);
        
        modal.querySelector('.close-btn').onclick = () => modal.style.display = 'none';
        modal.querySelector('#save-changes-btn').onclick = () => handleSaveChanges(breakdownId, tempEditData);
        modal.querySelector('#delete-breakdown-btn').onclick = () => handleDelete(breakdownId);
        modal.querySelector('#share-breakdown-btn').onclick = () => shareSceneBreakdown(tempEditData);
    }
    
    function handleSaveChanges(id, updatedData) {
        const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
        const breakdownIndex = activeSequence.breakdowns.findIndex(b => b.id === id);
        if (breakdownIndex > -1) {
            activeSequence.breakdowns[breakdownIndex] = { ...updatedData };
            saveProjectData();
            renderBreakdowns();
            document.getElementById('edit-breakdown-modal').style.display = 'none';
        }
    }
    
    function handleDelete(id) {
        if(confirm("Are you sure you want to delete this breakdown?")){
            const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
            activeSequence.breakdowns = activeSequence.breakdowns.filter(b => b.id !== id);
            saveProjectData();
            renderBreakdowns();
            document.getElementById('edit-breakdown-modal').style.display = 'none';
        }
    }

    function openProjectCostModal() {
        if(currentMode !== 'producer') { alert("Switch to Producer Mode to view costs."); return; }
        let totalCost = 0;
        const categoryCosts = {};
        CATEGORIES.forEach(cat => categoryCosts[cat.key] = 0);
        
        projectData.panelItems.forEach(item => {
            if (item.type === 'sequence' && item.breakdowns) {
                item.breakdowns.forEach(scene => {
                    CATEGORIES.forEach(cat => {
                        if(scene[cat.key]){
                            scene[cat.key].forEach(item => {
                                const cost = item.cost || 0;
                                categoryCosts[cat.key] += cost;
                                totalCost += cost;
                            });
                        }
                    });
                });
            }
        });
        
        const modal = document.getElementById('project-cost-modal');
        let tableHTML = `<table class="cost-summary-table">`;
        CATEGORIES.forEach(cat => {
            if(categoryCosts[cat.key] > 0){
                tableHTML += `<tr><td>${cat.title}</td><td>$${categoryCosts[cat.key].toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td></tr>`;
            }
        });
        tableHTML += `<tr style="font-size: 1.2rem; border-top: 2px solid var(--border-color);"><td><strong>Grand Total</strong></td><td><strong>$${totalCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td></tr></table>`;
        modal.innerHTML = `<div class="modal-content small"><span class="close-btn">&times;</span><h3>Project Cost Summary</h3>${tableHTML}</div>`;
        modal.style.display = 'block';
        modal.querySelector('.close-btn').onclick = () => modal.style.display = 'none';
    }

    // --- Sequence Panel Logic ---
    function handleNewSequence() {
        let name = prompt("Enter a name for the new sequence:");
        if (name === null) return;
        if (name.trim() === "") name = `Sequence ${projectData.panelItems.filter(i => i.type === 'sequence').length + 1}`;
        const newItem = { type: 'sequence', id: Date.now(), name: name, breakdowns: [] };
        projectData.panelItems.push(newItem);
        setActiveItem(newItem.id);
        document.getElementById('sequence-panel').classList.remove('open');
    }

    function handleAddScheduleBreak() {
        let name = prompt("Enter a name for the schedule break (e.g., DAY 1):");
        if (name === null || name.trim() === "") return;
        const newItem = { type: 'schedule_break', id: Date.now(), name: name };
        projectData.panelItems.push(newItem);
        saveProjectData();
        renderSequencePanel();
    }

    function setActiveItem(id) {
        const item = projectData.panelItems.find(i => i.id === id);
        if (item && item.type === 'sequence') {
            projectData.activeItemId = id;
            saveProjectData();
            renderBreakdowns();
            renderSequencePanel();
        }
    }
    
    function renderSequencePanel() {
        const listContainer = document.getElementById('sequence-list');
        listContainer.innerHTML = '';
        projectData.panelItems.forEach(item => {
            const element = document.createElement('div');
            if (item.type === 'sequence') {
                element.className = `sequence-item ${item.id === projectData.activeItemId ? 'active' : ''}`;
                element.textContent = item.name;
                element.onclick = () => {
                    setActiveItem(item.id);
                    document.getElementById('sequence-panel').classList.remove('open');
                };
            } else if (item.type === 'schedule_break') {
                element.className = 'schedule-break-item';
                element.textContent = item.name;
            }
            listContainer.appendChild(element);
        });
    }

    // Placeholder for Excel export
    function saveAsExcel() { alert('Excel export feature coming soon!'); }
    
    // Placeholder for Sharing
    async function shareSceneBreakdown(breakdown) { 
        const {prodName = 'Production'} = projectData.projectInfo;
        const card = document.getElementById('share-card-template');
        let gridHTML = '';
        CATEGORIES.forEach(cat => {
            if (breakdown[cat.key] && breakdown[cat.key].length > 0) {
                gridHTML += `<div class="share-card-category"><h4>${cat.title}</h4><ul class="share-card-list">${breakdown[cat.key].map(i => `<li>${i.name}</li>`).join('')}</ul></div>`
            }
        });

        card.innerHTML = `<div class="share-card-header"><h1>${prodName}</h1><p>Breakdown for Scene #${breakdown.sceneNumber}</p></div><div class="share-card-grid">${gridHTML}</div>`;
        try {
            const canvas = await html2canvas(card);
            canvas.toBlob(blob => {
                const file = new File([blob], `Breakdown_Scene_${breakdown.sceneNumber}.png`, {type: 'image/png'});
                if (navigator.canShare && navigator.canShare({files: [file]})) {
                    navigator.share({
                        title: `Breakdown: Scene ${breakdown.sceneNumber}`,
                        files: [file]
                    });
                } else {
                   alert('Sharing not supported on this browser.');
                }
            });
        } catch(e) {
            console.error(e);
            alert('Could not generate shareable image.');
        }
    }
    
    initialize();
});
