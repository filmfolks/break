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
    let projectData = { panelItems: [], activeItemId: null, projectInfo: {} };
    let currentBreakdown = {}; // Holds items for the scene being entered in the form
    let currentMode = 'assistant'; // 'assistant' or 'producer'

    // --- INITIALIZATION ---
    function initialize() {
        setupEventListeners();
        createEntryGrid();
        loadProjectData();
        initializeDragAndDrop();
        setMode(currentMode); // Set initial mode
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

        safeAddListener('project-info-btn', 'click', openProjectInfoModal);
        safeAddListener('open-project-btn', 'click', () => document.getElementById('file-input').click());
        safeAddListener('file-input', 'change', openProjectFile);
        safeAddListener('save-project-btn', 'click', saveProjectFile);
        safeAddListener('save-excel-btn', 'click', saveAsExcel);
        safeAddListener('clear-project-btn', 'click', clearProject);
        safeAddListener('assistant-mode-btn', 'click', () => setMode('assistant'));
        safeAddListener('producer-mode-btn', 'click', () => setMode('producer'));
        safeAddListener('project-cost-btn', 'click', openProjectCostModal);

        const sequencePanel = document.getElementById('sequence-panel');
        safeAddListener('sequence-hamburger-btn', 'click', () => { renderSequencePanel(); sequencePanel.classList.add('open'); });
        safeAddListener('close-panel-btn', 'click', () => sequencePanel.classList.remove('open'));
        safeAddListener('add-schedule-break-btn', 'click', handleAddScheduleBreak);

        document.addEventListener('click', (event) => {
            if (hamburgerBtn && dropdownMenu && dropdownMenu.classList.contains('show') && !hamburgerBtn.contains(event.target) && !dropdownMenu.contains(event.target)) {
                dropdownMenu.classList.remove('show');
            }
        });
    }

    // --- MODE SWITCHING ---
    function setMode(mode) {
        currentMode = mode;
        const container = document.getElementById('main-container');
        const assistantBtn = document.getElementById('assistant-mode-btn');
        const producerBtn = document.getElementById('producer-mode-btn');

        if (mode === 'producer') {
            container.classList.add('producer-mode');
            producerBtn.classList.add('active-mode');
            assistantBtn.classList.remove('active-mode');
        } else {
            container.classList.remove('producer-mode');
            assistantBtn.classList.add('active-mode');
            producerBtn.classList.remove('active-mode');
        }
        // Re-render everything to show/hide cost inputs
        renderBreakdowns();
        const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
        if(activeSequence) calculateAndDisplayTotalCost(activeSequence);
    }

    // --- UI CREATION ---
    function createEntryGrid() {
        const grid = document.getElementById('breakdown-entry-grid');
        grid.innerHTML = '';
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
            
            categoryDiv.querySelector('.add-item-form').addEventListener('submit', (e) => {
                e.preventDefault();
                const categoryKey = e.target.dataset.category;
                const input = e.target.querySelector('input');
                if (input.value.trim()) {
                    addItemToCurrent(categoryKey, { name: input.value.trim(), cost: 0 });
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
                li.innerHTML = `
                    <span class="tagged-item-name"></span>
                    <input type="number" class="cost-input" placeholder="Cost" min="0" step="0.01">
                    <button type="button" class="delete-item-btn">&times;</button>
                `;
                li.querySelector('.tagged-item-name').textContent = item.name;
                
                const costInput = li.querySelector('.cost-input');
                costInput.value = item.cost || '';
                costInput.oninput = () => { item.cost = parseFloat(costInput.value) || 0; };

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
        let activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
        if (!activeSequence) {
            if (confirm("No sequence created. Create 'Sequence 1' to add this breakdown?")) {
                handleNewSequence();
                activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
                if(!activeSequence) return;
            } else { return; }
        }

        const sceneDetails = {
            id: Date.now(),
            sceneNumber: document.getElementById('scene-number').value,
            sceneType: document.getElementById('scene-type').value,
            sceneLocation: document.getElementById('scene-location').value,
            sceneTime: document.getElementById('scene-time').value,
        };

        const newBreakdown = { ...sceneDetails, ...currentBreakdown };
        activeSequence.scenes.push(newBreakdown);
        saveProjectData();
        renderBreakdowns();
        
        currentBreakdown = {};
        document.getElementById('breakdown-form').reset();
        CATEGORIES.forEach(cat => renderCurrentBreakdownList(cat.key));
    }

    function renderBreakdowns() {
        const container = document.getElementById('breakdown-strips-container');
        container.innerHTML = '';
        const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
        if (!activeSequence) {
            document.getElementById('active-sequence-display').textContent = 'No active sequence selected.';
            return;
        }

        document.getElementById('active-sequence-display').textContent = `Current Sequence: ${activeSequence.name}`;
        
        activeSequence.scenes.forEach(breakdown => {
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
        calculateAndDisplayTotalCost(activeSequence);
    }

    // --- COST CALCULATION & MODAL ---
    function calculateAndDisplayTotalCost(activeSequence) {
        const display = document.getElementById('total-cost-display');
        if (!activeSequence || currentMode !== 'producer') {
            display.style.display = 'none';
            return;
        }
        let totalCost = 0;
        activeSequence.scenes.forEach(scene => {
            CATEGORIES.forEach(cat => {
                if(scene[cat.key]){
                    scene[cat.key].forEach(item => { totalCost += item.cost || 0; });
                }
            });
        });
        display.innerHTML = `<h3>Total Estimated Cost: <span>$${totalCost.toLocaleString()}</span></h3>`;
        display.style.display = 'block';
    }

    function openProjectCostModal() {
        const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
        if(!activeSequence) { alert("Please select a sequence to view its cost."); return; }

        let totalCost = 0;
        const categoryCosts = {};
        CATEGORIES.forEach(cat => categoryCosts[cat.key] = 0);

        activeSequence.scenes.forEach(scene => {
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

        const modal = document.getElementById('project-cost-modal');
        let tableHTML = `<table class="cost-summary-table">`;
        CATEGORIES.forEach(cat => {
            if(categoryCosts[cat.key] > 0){
                tableHTML += `<tr><td>${cat.title}</td><td>$${categoryCosts[cat.key].toLocaleString()}</td></tr>`;
            }
        });
        tableHTML += `<tr style="font-size: 1.2rem; border-top: 2px solid var(--border-color);"><td><strong>Grand Total</strong></td><td><strong>$${totalCost.toLocaleString()}</strong></td></tr>`;
        tableHTML += `</table>`;

        modal.innerHTML = `
            <div class="modal-content small">
                <span class="close-btn">&times;</span>
                <h3>Cost Summary for "${activeSequence.name}"</h3>
                ${tableHTML}
            </div>
        `;
        modal.style.display = 'block';
        modal.querySelector('.close-btn').onclick = () => modal.style.display = 'none';
    }
    
    // --- All other functions are provided below, complete and verified ---
    function initializeDragAndDrop() {
        const listContainer = document.getElementById('sequence-list');
        if (listContainer) {
            new Sortable(listContainer, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: (evt) => {
                    const item = projectData.panelItems.splice(evt.oldIndex, 1)[0];
                    projectData.panelItems.splice(evt.newIndex, 0, item);
                    saveProjectData();
                }
            });
        }
    }

    function handleNewSequence() {
        let name = prompt("Enter a name for the new sequence:");
        if (name === null) return;
        if (name.trim() === "") name = `Sequence ${projectData.panelItems.filter(i => i.type === 'sequence').length + 1}`;
        const newItem = { type: 'sequence', id: Date.now(), name: name, scenes: [] };
        projectData.panelItems.push(newItem);
        setActiveItem(newItem.id);
    }
    
    function handleAddScheduleBreak() {
        let name = prompt("Enter name for the schedule break (e.g., DAY 1):");
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
            document.getElementById('sequence-panel').classList.remove('open');
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
                element.onclick = () => setActiveItem(item.id);
            } else if (item.type === 'schedule_break') {
                element.className = 'schedule-break-item';
                element.textContent = item.name;
            }
            listContainer.appendChild(element);
        });
    }

    function saveProjectData() { localStorage.setItem('scriptBreakdownProject', JSON.stringify(projectData)); }

    function loadProjectData() {
        const savedData = localStorage.getItem('scriptBreakdownProject');
        projectData = savedData ? JSON.parse(savedData) : { panelItems: [], activeItemId: null, projectInfo: {} };
        if (!projectData.projectInfo) projectData.projectInfo = {};
        if (!projectData.panelItems) projectData.panelItems = [];
        if (!projectData.activeItemId && projectData.panelItems.length > 0) {
            const firstSequence = projectData.panelItems.find(i => i.type === 'sequence');
            if (firstSequence) projectData.activeItemId = firstSequence.id;
        }
        renderBreakdowns();
        renderSequencePanel();
    }

    function clearProject() {
        if(confirm("Are you sure you want to clear all breakdown data?")){
            projectData = { panelItems: [], activeItemId: null, projectInfo: {} };
            saveProjectData();
            renderBreakdowns();
            renderSequencePanel();
        }
    }

    function openProjectModal() {
        const modal = document.getElementById('project-info-modal');
        const projectInfo = projectData.projectInfo || {};
        modal.innerHTML = `
            <div class="modal-content small">
                <span class="close-btn">&times;</span>
                <h3>Project Information</h3>
                <div class="modal-form">
                    <input type="text" id="modal-prod-name" placeholder="Production / Studio Name" value="${projectInfo.prodName || ''}">
                    <input type="text" id="modal-director-name" placeholder="Director Name" value="${projectInfo.directorName || ''}">
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

    function openProjectFile(event) {
        const file = event.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const loadedData = JSON.parse(e.target.result);
                if (loadedData && loadedData.panelItems) {
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

    function saveProjectFile() {
        const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectData.projectInfo.prodName || 'Breakdown'}.filmbreakdown`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    function saveAsExcel() {
        if (projectData.panelItems.length === 0) { alert("No data to export."); return; }
        const workbook = XLSX.utils.book_new();
        
        projectData.panelItems.forEach(item => {
            if (item.type === 'sequence' && item.scenes.length > 0) {
                const dataForSheet = item.scenes.map(b => {
                    let row = { 'Scene #': b.sceneNumber, 'Scene Heading': `${b.sceneType}. ${b.sceneLocation} - ${b.sceneTime}` };
                    CATEGORIES.forEach(cat => {
                        row[cat.title] = b[cat.key] ? b[cat.key].map(i => `${i.name} ($${i.cost || 0})`).join(', ') : '';
                    });
                    return row;
                });
                const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
                XLSX.utils.book_append_sheet(workbook, worksheet, item.name.replace(/[/\\?*:[\]]/g, ''));
            }
        });

        if (workbook.SheetNames.length > 0) {
            XLSX.writeFile(workbook, `${projectData.projectInfo.prodName || 'FullBreakdown'}.xlsx`);
        } else {
            alert("No scenes found in any sequence to export.");
        }
    }
    
    async function shareSceneBreakdown(id) {
        const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
        if(!activeSequence) return;
        const breakdown = activeSequence.scenes.find(b => b.id === id);
        if (!breakdown) return;
        
        const template = document.getElementById('share-card-template');
        let gridHTML = '';
        CATEGORIES.forEach(cat => {
            if (breakdown[cat.key] && breakdown[cat.key].length > 0) {
                gridHTML += `<div class="share-card-category">
                    <h4>${cat.title}</h4>
                    <ul class="share-card-list">
                        ${breakdown[cat.key].map(item => `<li>${item.name} ${currentMode === 'producer' ? `($${item.cost || 0})` : ''}</li>`).join('')}
                    </ul>
                </div>`;
            }
        });
        template.innerHTML = `
            <div class="share-card-content">
                <div class="share-card-header">
                    <h1>Scene #${breakdown.sceneNumber}</h1>
                    <p>${breakdown.sceneType}. ${breakdown.sceneLocation} - ${breakdown.sceneTime}</p>
                </div>
                <div class="share-card-grid">${gridHTML}</div>
            </div>`;
        try {
            const canvas = await html2canvas(template, { scale: 2 });
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const file = new File([blob], `breakdown_scene_${breakdown.sceneNumber}.png`, { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: `Breakdown for Scene ${breakdown.sceneNumber}` });
            } else {
                window.open(URL.createObjectURL(blob));
            }
        } catch (error) { console.error('Sharing failed:', error); }
    }

    initialize();
});
