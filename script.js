document.addEventListener('DOMContentLoaded', () => {
    console.log("To Make Script Initializing with Universal Project Logic...");

    const CATEGORIES = [ { key: 'cast', title: 'Cast', icon: 'fa-user-ninja', color: 'var(--color-cast)' }, { key: 'props', title: 'Props', icon: 'fa-magic-wand-sparkles', color: 'var(--color-props)' }, { key: 'costumes', title: 'Costumes', icon: 'fa-shirt', color: 'var(--color-costumes)' }, { key: 'makeup', title: 'Hair & Makeup', icon: 'fa-palette', color: 'var(--color-makeup)' }, { key: 'setDressing', title: 'Set Dressing', icon: 'fa-couch', color: 'var(--color-setDressing)' }, { key: 'vehicles', title: 'Vehicles', icon: 'fa-car', color: 'var(--color-vehicles)' }, { key: 'stunts', title: 'Stunts', icon: 'fa-bolt', color: 'var(--color-stunts)' }, { key: 'sfx', title: 'Special Effects', icon: 'fa-bomb', color: 'var(--color-sfx)' }, { key: 'sound', title: 'Sound', icon: 'fa-volume-high', color: 'var(--color-sound)' }, { key: 'equipment', title: 'Equipment', icon: 'fa-camera-retro', color: 'var(--color-equipment)' }, { key: 'technicians', title: 'Technicians', icon: 'fa-helmet-safety', color: 'var(--color-technicians)' }, { key: 'misc', title: 'Miscellaneous', icon: 'fa-box-archive', color: 'var(--color-misc)' }, ];
    let projectData = {};
    let activeSequenceId = null;
    let currentBreakdown = {}; 
    let currentMode = 'assistant';
    let currentView = 'breakdown';
    let autoSaveInterval = null;

    function initialize() {
        setupEventListeners();
        populateFilterDropdown();
        loadProjectData();
        setMode(localStorage.getItem('toMakeAppMode') || 'assistant');
        createEntryGrid('breakdown-entry-grid', currentBreakdown);
        initializeDragAndDrop();
    }

    function setupEventListeners() {
        const safeAddListener = (id, event, handler) => { const element = document.getElementById(id); if (element) element.addEventListener(event, handler); };
        const hamburgerBtn = document.getElementById('hamburger-btn');
        const dropdownMenu = document.getElementById('dropdown-menu');
        if (hamburgerBtn) hamburgerBtn.addEventListener('click', (e) => { e.stopPropagation(); dropdownMenu.classList.toggle('show'); });
        document.addEventListener('click', (event) => { if (hamburgerBtn && dropdownMenu.classList.contains('show') && !hamburgerBtn.contains(event.target) && !dropdownMenu.contains(event.target)) { dropdownMenu.classList.remove('show'); } });
        safeAddListener('project-info-btn', 'click', openProjectInfoModal);
        safeAddListener('new-sequence-btn', 'click', handleNewSequence);
        safeAddListener('open-project-btn', 'click', () => document.getElementById('file-input').click());
        safeAddListener('file-input', 'change', openProjectFile);
        safeAddListener('save-project-btn', 'click', saveProjectFile);
        safeAddListener('save-full-excel-btn', 'click', () => saveAsExcel(true));
        safeAddListener('share-project-btn', 'click', shareProject);
        safeAddListener('clear-project-btn', 'click', clearProject);
        safeAddListener('assistant-mode-btn', 'click', () => setMode('assistant'));
        safeAddListener('producer-mode-btn', 'click', () => setMode('producer'));
        safeAddListener('auto-save-btn', 'click', toggleAutoSave);
        safeAddListener('info-btn', 'click', openInfoModal);
        safeAddListener('about-btn', 'click', openAboutModal);
        safeAddListener('estimate-btn', 'click', () => showView('estimation'));
        safeAddListener('sequence-hamburger-btn', 'click', () => document.getElementById('sequence-panel').classList.add('open'));
        safeAddListener('breakdown-form', 'submit', handleAddSceneToSequence);
        safeAddListener('currency-selector', 'change', (e) => { projectData.projectInfo.currency = e.target.value; saveProjectData(); showView(currentView); renderBreakdownStrips(); });
        safeAddListener('close-panel-btn', 'click', () => document.getElementById('sequence-panel').classList.remove('open'));
        safeAddListener('add-schedule-break-btn', 'click', handleAddScheduleBreak);
        safeAddListener('export-panel-btn', 'click', exportFilteredToExcel);
        safeAddListener('filter-category-select', 'change', handleFilterChange);
        safeAddListener('filter-value-input', 'input', () => renderBreakdownStrips());
        safeAddListener('export-excel-btn', 'click', exportEstimateToExcel);
        safeAddListener('export-pdf-btn', 'click', exportEstimateToPDF);
    }
    
    function initializeDragAndDrop() {
        const listContainer = document.getElementById('sequence-list');
        if (listContainer) {
            new Sortable(listContainer, { animation: 150, ghostClass: 'sortable-ghost', onEnd: (evt) => {
                const panelItems = getPanelItems();
                const item = panelItems.splice(evt.oldIndex, 1)[0];
                panelItems.splice(evt.newIndex, 0, item);
                saveProjectData();
            }});
        }
    }

    // --- NEW: THE INTELLIGENT TRANSLATOR/MIGRATION FUNCTION ---
    function migrateToSchedDataToUniversal(oldData) {
        console.log("Old To Sched file detected. Migrating to universal format...");

        const newData = {
            fileVersion: "1.0",
            projectInfo: oldData.projectInfo || { projectName: "Untitled Project", currency: "USD" },
            scenes: [],
            appSpecificData: {
                toMake: { panelItems: [], activeItemId: null },
                toSched: { panelItems: [], activeItemId: oldData.activeItemId }
            }
        };

        const allScenesMap = new Map();

        // Step 1: Extract all unique scenes from the old structure
        oldData.panelItems.forEach(item => {
            if (item.type === 'sequence' && Array.isArray(item.scenes)) {
                item.scenes.forEach(scene => {
                    if (!allScenesMap.has(scene.id)) {
                        allScenesMap.set(scene.id, scene);
                    }
                });
            }
        });

        // Step 2: Convert the unique scenes into the new universal format
        allScenesMap.forEach(oldScene => {
            // Convert comma-separated cast string into a tagged-item array
            const castArray = (oldScene.cast || '')
                .split(',')
                .map(name => name.trim())
                .filter(name => name)
                .map(name => ({ id: Date.now() + Math.random(), name: name, cost: 0 }));

            const newScene = {
                sceneId: `s_${oldScene.id}`,
                sceneNumber: oldScene.number,
                sceneType: oldScene.type,
                sceneSetting: oldScene.sceneSetting,
                dayNight: oldScene.dayNight,
                description: oldScene.description,
                breakdownData: {
                    cast: castArray // Populate cast from old data
                },
                budgetingData: {},
                schedulingData: {
                    status: oldScene.status, date: oldScene.date, time: oldScene.time,
                    pages: oldScene.pages, duration: oldScene.duration, equipment: oldScene.equipment,
                    shootLocation: oldScene.shootLocation, contact: oldScene.contact, notes: oldScene.notes
                }
            };
            newData.scenes.push(newScene);
        });
        
        // Step 3: Re-create the panel structure for BOTH apps
        oldData.panelItems.forEach(oldItem => {
            const newItem = { ...oldItem };
            if (newItem.type === 'sequence') {
                newItem.sceneIds = (newItem.scenes || []).map(s => `s_${s.id}`);
                delete newItem.scenes; // Remove old redundant scene data
            }
            newData.appSpecificData.toSched.panelItems.push(newItem);
            newData.appSpecificData.toMake.panelItems.push(JSON.parse(JSON.stringify(newItem))); // Create a clean copy for To Make
        });

        return newData;
    }

    // --- UNIVERSAL DATA HANDLING (MODIFIED) ---
    function getPanelItems() { if (!projectData.appSpecificData) projectData.appSpecificData = {}; if (!projectData.appSpecificData.toMake) projectData.appSpecificData.toMake = { panelItems: [] }; return projectData.appSpecificData.toMake.panelItems; }
    function saveProjectData() { localStorage.setItem('universalFilmProject', JSON.stringify(projectData)); }
    function loadProjectData() {
        const savedData = localStorage.getItem('universalFilmProject');
        if (savedData) { projectData = JSON.parse(savedData); } 
        else { projectData = { fileVersion: "1.0", projectInfo: { projectName: "Untitled Project", directorName: "", prodName: "", currency: "USD" }, scenes: [], appSpecificData: { toMake: { panelItems: [], activeItemId: null }, toSched: { panelItems: [], activeItemId: null } } }; }
        projectData.scenes = projectData.scenes || [];
        projectData.scenes.forEach(scene => { scene.sceneId = scene.sceneId || `s_${Date.now()}_${Math.random()}`; scene.breakdownData = scene.breakdownData || {}; scene.budgetingData = scene.budgetingData || {}; scene.schedulingData = scene.schedulingData || {}; });
        const toMakeData = getPanelItems(); activeSequenceId = projectData.appSpecificData.toMake.activeItemId || null; if (!activeSequenceId && toMakeData.length > 0) { const firstSeq = toMakeData.find(i => i.type === 'sequence'); if (firstSeq) activeSequenceId = firstSeq.id; }
        document.getElementById('currency-selector').value = projectData.projectInfo.currency || 'USD';
        renderBreakdownStrips(); renderSequencePanel();
    }
    function clearProject() { if(confirm("Are you sure? This will delete all project data.")){ localStorage.removeItem('universalFilmProject'); loadProjectData(); } }

    function openProjectFile(event) {
        const file = event.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                let loadedData = JSON.parse(e.target.result);
                // *** THE TRANSLATOR IS CALLED HERE ***
                if (loadedData.panelItems && !loadedData.scenes) {
                    loadedData = migrateToSchedDataToUniversal(loadedData);
                }
                if (loadedData && loadedData.projectInfo && Array.isArray(loadedData.scenes)) {
                    projectData = loadedData;
                    saveProjectData();
                    alert('Project loaded successfully!');
                    loadProjectData(); 
                    showView('breakdown');
                } else { alert('Error: Invalid project file format.'); }
            } catch (error) { console.error(error); alert('Error: Could not read project file.'); }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    function saveProjectFile() { const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${(projectData.projectInfo.projectName || 'Project')}.filmproj`; a.click(); URL.revokeObjectURL(url); }
    
    // --- The rest of your functions follow, adapted for the new structure ---
    function handleAddSceneToSequence(e) { e.preventDefault(); const activeSequence = getPanelItems().find(item => item.id === activeSequenceId); if (!activeSequence) { alert("No active sequence. Please create or select one first."); return; } const sceneNumberInput = document.getElementById('scene-number'); if (!sceneNumberInput.value.trim()) { alert('Please enter a Scene Number.'); return; } const newScene = { sceneId: `s_${Date.now()}`, sceneNumber: sceneNumberInput.value, sceneType: document.getElementById('scene-type').value, sceneSetting: document.getElementById('scene-location').value, dayNight: document.getElementById('scene-time').value, description: "", breakdownData: JSON.parse(JSON.stringify(currentBreakdown)), budgetingData: {}, schedulingData: {} }; projectData.scenes.push(newScene); if (!activeSequence.sceneIds) activeSequence.sceneIds = []; activeSequence.sceneIds.push(newScene.sceneId); saveProjectData(); renderBreakdownStrips(); currentBreakdown = {}; document.getElementById('breakdown-form').reset(); createEntryGrid('breakdown-entry-grid', currentBreakdown); }
    function renderBreakdownStrips() { const container = document.getElementById('breakdown-strips-container'); const display = document.getElementById('active-sequence-display'); const activeSequence = getPanelItems().find(item => item.id === activeSequenceId); if (!activeSequence) { display.textContent = 'No active sequence. Create one from the side panel.'; container.innerHTML = ''; calculateAndRenderSequenceTotal(); return; } display.textContent = `Current Sequence: ${activeSequence.name}`; container.innerHTML = ''; const sceneIdsInSequence = activeSequence.sceneIds || []; const breakdowns = projectData.scenes.filter(s => sceneIdsInSequence.includes(s.sceneId)); const filteredBreakdowns = getFilteredBreakdowns(breakdowns); filteredBreakdowns.forEach(scene => { const stripWrapper = document.createElement('div'); stripWrapper.className = 'breakdown-strip-wrapper'; let summaryHTML = ''; let sceneTotalCost = 0; const breakdownData = scene.breakdownData || {}; CATEGORIES.forEach(cat => { const items = breakdownData[cat.key]; if (items && items.length > 0) { summaryHTML += `<div class="strip-item-summary" style="color:${cat.color};"><i class="fas ${cat.icon}"></i><span class="count">${items.length}</span></div>`; sceneTotalCost += items.reduce((sum, item) => sum + (item.cost || 0), 0); } }); const costHTML = `<div class="strip-item-cost">${formatCurrency(sceneTotalCost)}</div>`; stripWrapper.innerHTML = `<div class="breakdown-strip"><div class="strip-item-scene">#${scene.sceneNumber} - ${scene.sceneSetting} (${scene.dayNight})</div>${summaryHTML}${costHTML}</div><div class="strip-actions"><button class="share-btn-strip" data-id="${scene.sceneId}" title="Share Scene as Excel"><i class="fas fa-file-excel"></i></button><button class="edit-btn-strip" data-id="${scene.sceneId}" title="Edit Breakdown"><i class="fas fa-pencil-alt"></i></button><button class="delete-btn-strip" data-id="${scene.sceneId}" title="Delete Scene"><i class="fas fa-trash"></i></button></div>`; container.appendChild(stripWrapper); }); container.querySelectorAll('.edit-btn-strip').forEach(b => b.onclick = () => openEditModal(b.dataset.id)); container.querySelectorAll('.delete-btn-strip').forEach(b => b.onclick = () => handleDelete(b.dataset.id)); container.querySelectorAll('.share-btn-strip').forEach(b => b.onclick = () => shareSceneAsExcel(b.dataset.id)); calculateAndRenderSequenceTotal(); }
    function openEditModal(sceneId) { const modal = document.getElementById('edit-breakdown-modal'); const scene = projectData.scenes.find(s => s.sceneId === sceneId); if (!modal || !scene) return; modal.innerHTML = `<div class="modal-content"><span class="close-btn">&times;</span><div class="modal-body"><h3>Edit Scene #${scene.sceneNumber}</h3><div class="breakdown-grid" id="edit-breakdown-grid"></div></div><div class="modal-actions"><button id="save-changes-btn" class="btn-primary">Save Changes</button></div></div>`; modal.style.display = 'block'; let tempEditData = JSON.parse(JSON.stringify(scene.breakdownData || {})); createEntryGrid('edit-breakdown-grid', tempEditData); modal.querySelector('.close-btn').onclick = () => modal.style.display = 'none'; modal.querySelector('#save-changes-btn').onclick = () => { scene.breakdownData = tempEditData; saveProjectData(); renderBreakdownStrips(); modal.style.display = 'none'; }; }
    function handleDelete(sceneId) { if (confirm("Are you sure you want to delete this scene from the project? This cannot be undone.")) { projectData.scenes = projectData.scenes.filter(s => s.sceneId !== sceneId); getPanelItems().forEach(item => { if (item.type === 'sequence' && item.sceneIds) { item.sceneIds = item.sceneIds.filter(id => id !== sceneId); } }); saveProjectData(); renderBreakdownStrips(); } }
    function handleNewSequence() { let name = prompt("Enter a name for the new sequence:"); if (name === null) return; if (name.trim() === "") name = `Sequence ${getPanelItems().filter(i => i.type === 'sequence').length + 1}`; const newItem = { type: 'sequence', id: Date.now(), name: name, sceneIds: [] }; getPanelItems().push(newItem); setActiveItem(newItem.id); }
    function setActiveItem(id) { const item = getPanelItems().find(i => i.id === id); if (item && item.type === 'sequence') { activeSequenceId = id; projectData.appSpecificData.toMake.activeItemId = id; saveProjectData(); renderBreakdownStrips(); renderSequencePanel(); } }
    function renderSequencePanel() { const listContainer = document.getElementById('sequence-list'); listContainer.innerHTML = ''; const panelItems = getPanelItems(); panelItems.forEach(item => { const element = document.createElement('div'); element.dataset.id = item.id; let editBtnHTML = `<button class="edit-panel-item-btn" title="Edit Name"><i class="fas fa-pencil-alt"></i></button>`; if (item.type === 'sequence') { element.className = `sequence-item ${item.id === activeSequenceId ? 'active' : ''}`; element.innerHTML = `<span class="panel-item-name">${item.name}</span><div class="panel-item-actions">${editBtnHTML}</div>`; element.querySelector('.panel-item-name').onclick = () => { setActiveItem(item.id); document.getElementById('sequence-panel').classList.remove('open'); }; } else if (item.type === 'schedule_break') { element.className = 'schedule-break-item'; element.innerHTML = `<span class="panel-item-name">${item.name}</span><div class="panel-item-actions">${editBtnHTML}</div>`; } element.querySelector('.edit-panel-item-btn').onclick = (e) => { e.stopPropagation(); handleRenamePanelItem(item.id, item.type);}; listContainer.appendChild(element); }); }
    function setMode(mode) { currentMode = mode; localStorage.setItem('toMakeAppMode', mode); const container = document.getElementById('main-container'); const currencyWrapper = document.getElementById('currency-selector-wrapper'); const estimateBtn = document.getElementById('estimate-btn'); const assistantBtn = document.getElementById('assistant-mode-btn'); const producerBtn = document.getElementById('producer-mode-btn'); if (mode === 'producer') { container.classList.add('producer-mode'); currencyWrapper.style.display = 'block'; estimateBtn.style.display = 'block'; producerBtn.classList.add('active-mode'); assistantBtn.classList.remove('active-mode'); } else { container.classList.remove('producer-mode'); currencyWrapper.style.display = 'none'; estimateBtn.style.display = 'none'; assistantBtn.classList.add('active-mode'); producerBtn.classList.remove('active-mode'); if(currentView === 'estimation') showView('breakdown'); } createEntryGrid('breakdown-entry-grid', currentBreakdown); renderBreakdownStrips(); }
    function showView(viewName) { currentView = viewName; const breakdownView = document.getElementById('breakdown-view'); const estimationView = document.getElementById('estimation-view'); const estimateBtn = document.getElementById('estimate-btn'); const title = document.getElementById('app-title'); if (viewName === 'estimation') { breakdownView.style.display = 'none'; estimationView.style.display = 'block'; title.textContent = 'Project Estimation'; estimateBtn.innerHTML = `<i class="fas fa-clipboard-list"></i>`; estimateBtn.title = "Back to Breakdown"; estimateBtn.onclick = () => showView('breakdown'); renderEstimationPage(); } else { breakdownView.style.display = 'block'; estimationView.style.display = 'none'; title.textContent = 'To Make'; estimateBtn.innerHTML = `<i class="fas fa-calculator"></i>`; estimateBtn.title = "Project Estimate"; estimateBtn.onclick = () => showView('estimation'); } }
    function createEntryGrid(gridId, targetData) { const grid = document.getElementById(gridId); if (!grid) return; grid.innerHTML = ''; CATEGORIES.forEach(cat => { if (cat.key === 'misc' && currentMode !== 'producer') { return; } const isProducer = currentMode === 'producer'; const formHTML = isProducer ? `<form class="add-item-form producer-form" data-category="${cat.key}"><input type="text" placeholder="Item Name" class="item-name-input" required><input type="number" placeholder="Cost" min="0" step="0.01" class="item-cost-input"><button type="submit" class="btn-primary">Add</button></form>` : `<form class="add-item-form" data-category="${cat.key}"><input type="text" placeholder="Add element..." required><button type="submit" class="btn-primary">Add</button></form>`; const categoryDiv = document.createElement('div'); categoryDiv.className = 'breakdown-entry-category'; categoryDiv.style.borderTopColor = cat.color; categoryDiv.innerHTML = `<h4><i class="fas ${cat.icon}"></i> ${cat.title}</h4> ${formHTML} <ul class="item-list-entry" id="list-${gridId}-${cat.key}"></ul>`; grid.appendChild(categoryDiv); categoryDiv.querySelector('.add-item-form').addEventListener('submit', (e) => { e.preventDefault(); const categoryKey = e.target.dataset.category; const nameInput = e.target.querySelector('.item-name-input, input[type="text"]'); const costInput = e.target.querySelector('.item-cost-input'); if (nameInput.value.trim()) { if (!targetData[categoryKey]) targetData[categoryKey] = []; targetData[categoryKey].push({ id: Date.now(), name: nameInput.value.trim(), cost: costInput ? parseFloat(costInput.value) || 0 : 0 }); renderItemList(`list-${gridId}-${cat.key}`, categoryKey, targetData); nameInput.value = ''; if (costInput) costInput.value = ''; } }); if (gridId === 'breakdown-entry-grid' && cat.key === 'misc' && (!targetData.misc || targetData.misc.length === 0)) { targetData.misc = [ {id: Date.now()+1, name: "Food", cost: 0}, {id: Date.now()+2, name: "Logistics", cost: 0}, {id: Date.now()+3, name: "Accommodation", cost: 0} ]; } renderItemList(`list-${gridId}-${cat.key}`, cat.key, targetData); }); }
    function renderItemList(listId, categoryKey, data) { const list = document.getElementById(listId); if (!list) return; list.innerHTML = ''; if (data[categoryKey]) { data[categoryKey].forEach((item) => { const li = document.createElement('li'); li.className = 'tagged-item-entry'; const costHTML = currentMode === 'producer' ? `<span class="tagged-item-cost">${formatCurrency(item.cost)}</span>` : ''; li.innerHTML = `<span class="tagged-item-name">${item.name}</span> ${costHTML}<div class="item-actions"><button class="edit-item-btn" title="Edit"><i class="fas fa-pencil-alt"></i></button><button class="delete-item-btn" title="Delete">&times;</button></div>`; li.querySelector('.edit-item-btn').onclick = () => { const newName = prompt("Enter new name:", item.name); if (newName !== null) item.name = newName.trim() || item.name; if (currentMode === 'producer') { const newCostStr = prompt("Enter new cost:", item.cost || 0); if (newCostStr !== null) item.cost = parseFloat(newCostStr) || 0; } renderItemList(listId, categoryKey, data); calculateAndRenderSequenceTotal(); }; li.querySelector('.delete-item-btn').onclick = () => { data[categoryKey] = data[categoryKey].filter(i => i.id !== item.id); renderItemList(listId, categoryKey, data); calculateAndRenderSequenceTotal(); }; list.appendChild(li); }); } }
    function calculateAndRenderSequenceTotal() { const totalDiv = document.getElementById('sequence-total-cost'); const activeSequence = getPanelItems().find(item => item.id === activeSequenceId); let totalCost = 0; if (activeSequence) { const sceneIds = activeSequence.sceneIds || []; const scenesInSequence = projectData.scenes.filter(s => sceneIds.includes(s.sceneId)); const filteredScenes = getFilteredBreakdowns(scenesInSequence); filteredScenes.forEach(scene => { const breakdownData = scene.breakdownData || {}; CATEGORIES.forEach(cat => { if (breakdownData[cat.key]) { totalCost += breakdownData[cat.key].reduce((sum, item) => sum + (item.cost || 0), 0); } }); }); } totalDiv.innerHTML = `Total for Filtered Scenes: <span>${formatCurrency(totalCost)}</span>`; }
    function getFilteredBreakdowns(breakdowns) { const category = document.getElementById('filter-category-select').value; const value = document.getElementById('filter-value-input').value.toLowerCase(); if (category === 'all' || !value) return breakdowns; return breakdowns.filter(b => b.breakdownData && b.breakdownData[category] && b.breakdownData[category].some(item => item.name.toLowerCase().includes(value))); }
    function openProjectInfoModal() { const modal = document.getElementById('project-info-modal'); const { prodName = '', directorName = '' } = projectData.projectInfo; modal.innerHTML = `<div class="modal-content small"><span class="close-btn">&times;</span><h3>Project Information</h3><div class="modal-form"><input type="text" id="modal-prod-name" placeholder="Production Name" value="${prodName}"><input type="text" id="modal-director-name" placeholder="Director Name" value="${directorName}"><button id="modal-save-info-btn" class="btn-primary">Save Info</button></div></div>`; modal.style.display = 'block'; modal.querySelector('.close-btn').onclick = () => modal.style.display = 'none'; modal.querySelector('#modal-save-info-btn').onclick = () => { projectData.projectInfo.prodName = document.getElementById('modal-prod-name').value; projectData.projectInfo.directorName = document.getElementById('modal-director-name').value; projectData.projectInfo.projectName = projectData.projectInfo.prodName || "Untitled Project"; saveProjectData(); modal.style.display = 'none'; }; }
    function handleAddScheduleBreak() { let name = prompt("Enter a name for the schedule break (e.g., DAY 1):"); if (name === null || name.trim() === "") return; const newItem = { type: 'schedule_break', id: Date.now(), name: name }; getPanelItems().push(newItem); saveProjectData(); renderSequencePanel(); }
    function handleRenamePanelItem(itemId, itemType) { const item = getPanelItems().find(i => i.id === itemId); if (!item) return; const newName = prompt(`Enter new name for this ${itemType}:`, item.name); if (newName !== null && newName.trim() !== "") { item.name = newName.trim(); saveProjectData(); renderSequencePanel(); if(itemType === 'sequence' && item.id === activeSequenceId) { renderBreakdownStrips(); } } }
    function populateFilterDropdown() { const select = document.getElementById('filter-category-select'); CATEGORIES.forEach(cat => { const option = document.createElement('option'); option.value = cat.key; option.textContent = cat.title; select.appendChild(option); }); }
    function handleFilterChange(e) { const valueInput = document.getElementById('filter-value-input'); valueInput.style.display = e.target.value === 'all' ? 'none' : 'block'; valueInput.value = ''; renderBreakdownStrips(); }
    function getAggregatedData() { const sceneCosts = []; let grandTotal = 0; let currentScheduleBreak = "N/A"; getPanelItems().forEach(pItem => { if (pItem.type === 'schedule_break') { currentScheduleBreak = pItem.name; } else if (pItem.type === 'sequence') { const sceneIds = pItem.sceneIds || []; projectData.scenes.filter(s => sceneIds.includes(s.sceneId)).forEach(scene => { let sceneTotal = 0; CATEGORIES.forEach(cat => { if (scene.breakdownData && scene.breakdownData[cat.key]) { scene.breakdownData[cat.key].forEach(item => { sceneTotal += item.cost || 0; }); } }); sceneCosts.push({ number: scene.sceneNumber, location: scene.sceneSetting, sequence: pItem.name, schedule: currentScheduleBreak, cost: sceneTotal }); grandTotal += sceneTotal; }); } }); return { grandTotal, sceneCosts }; }
    function renderEstimationPage() { const container = document.getElementById('estimation-table-container'); const grandTotalEl = document.getElementById('grand-total-cost'); const { grandTotal, sceneCosts } = getAggregatedData(); let tableHTML = '<table class="estimation-table"><thead><tr><th>Scene #</th><th>Location</th><th>Sequence</th><th>Schedule Break</th><th class="cost-cell">Total Cost</th></tr></thead><tbody>'; sceneCosts.forEach(scene => { tableHTML += `<tr><td>${scene.number}</td><td>${scene.location}</td><td>${scene.sequence}</td><td>${scene.schedule}</td><td class="cost-cell">${formatCurrency(scene.cost)}</td></tr>`; }); tableHTML += '</tbody></table>'; container.innerHTML = tableHTML; grandTotalEl.innerHTML = `Grand Total: <span>${formatCurrency(grandTotal)}</span>`; }
    function exportEstimateToExcel() { const { grandTotal, sceneCosts } = getAggregatedData(); const wb = XLSX.utils.book_new(); const data = []; data.push([`Project: ${projectData.projectInfo.prodName || 'Untitled'}`, '', `Currency: ${projectData.projectInfo.currency}`]); data.push([`Director: ${projectData.projectInfo.directorName || 'N/A'}`]); data.push([]); data.push(['Scene #', 'Location', 'Sequence', 'Schedule Break', 'Total Cost']); sceneCosts.forEach(scene => { data.push([scene.number, scene.location, scene.sequence, scene.schedule, scene.cost]); }); data.push([]); data.push(['','','','GRAND TOTAL', grandTotal]); const ws = XLSX.utils.aoa_to_sheet(data); XLSX.utils.book_append_sheet(wb, ws, 'Scene Cost Report'); XLSX.writeFile(wb, 'Scene_Cost_Report.xlsx'); }
    function exportFilteredToExcel() { const activeSequence = getPanelItems().find(item => item.id === activeSequenceId); if (!activeSequence) { alert("Please select a sequence to export."); return; } const sceneIds = activeSequence.sceneIds || []; const breakdowns = projectData.scenes.filter(s => sceneIds.includes(s.sceneId)); const filteredBreakdowns = getFilteredBreakdowns(breakdowns); if (filteredBreakdowns.length === 0) { alert("No breakdowns match the current filter."); return; } saveAsExcel(false); }
    function exportEstimateToPDF() { const { jsPDF } = window.jspdf; const doc = new jsPDF(); const { grandTotal, sceneCosts } = getAggregatedData(); const head = [['Scene #', 'Location', 'Sequence', 'Schedule', `Total Cost`]]; const body = sceneCosts.map(s => [s.number, s.location, s.sequence, s.schedule, formatCurrency(s.cost)]); body.push([{ content: 'GRAND TOTAL', colSpan: 4, styles: { fontStyle: 'bold', fontSize: 14 } }, { content: formatCurrency(grandTotal), styles: { fontStyle: 'bold', fontSize: 14, halign: 'right' } }]); doc.text(`Scene Cost Report: ${projectData.projectInfo.prodName || 'Untitled'}`, 14, 15); doc.autoTable({ head, body, startY: 20, didParseCell: (data) => { if(data.cell.raw.toString().startsWith(getCurrencySymbol())) { data.cell.styles.halign = 'right'; } } }); doc.save('Scene_Cost_Report.pdf'); }
    function shareSceneAsExcel(sceneId) { const scene = projectData.scenes.find(s => s.sceneId === sceneId); if (!scene) { alert("Could not find breakdown to share."); return; } const wb = XLSX.utils.book_new(); const data = []; let sceneTotal = 0; data.push([`Project: ${projectData.projectInfo.prodName || 'Untitled'}`]); data.push([`Scene: #${scene.sceneNumber} - ${scene.sceneSetting} (${scene.dayNight})`]); data.push([]); const headers = currentMode === 'producer' ? ['Category', 'Item', 'Cost'] : ['Category', 'Item']; data.push(headers); CATEGORIES.forEach(cat => { if(scene.breakdownData[cat.key] && scene.breakdownData[cat.key].length > 0) { scene.breakdownData[cat.key].forEach(item => { const cost = item.cost || 0; if(currentMode === 'producer') { data.push([cat.title, item.name, cost]); sceneTotal += cost; } else { data.push([cat.title, item.name]); } }); } }); if(currentMode === 'producer') { data.push([]); data.push(['','SCENE TOTAL', sceneTotal]); } const ws = XLSX.utils.aoa_to_sheet(data); XLSX.utils.book_append_sheet(wb, ws, `Scene_${scene.sceneNumber}`); XLSX.writeFile(wb, `Breakdown_Scene_${scene.sceneNumber}.xlsx`); }
    function formatCurrency(amount) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: projectData.projectInfo.currency || 'USD' }).format(amount || 0); }
    function getCurrencySymbol() { try { return (0).toLocaleString('en-US', { style:'currency', currency: projectData.projectInfo.currency || 'USD', minimumFractionDigits:0, maximumFractionDigits:0 }).replace(/[0-9]/g,'').trim(); } catch (e) { return '$'; } }
    function toggleAutoSave() { const statusEl = document.getElementById('auto-save-status'); if (autoSaveInterval) { clearInterval(autoSaveInterval); autoSaveInterval = null; statusEl.textContent = 'OFF'; statusEl.className = 'auto-save-status off'; alert('Auto-save is now OFF.'); } else { autoSaveInterval = setInterval(() => { saveProjectData(); console.log('Project auto-saved.'); }, 120000); statusEl.textContent = 'ON'; statusEl.className = 'auto-save-status on'; alert('Auto-save is now ON. Project will save every 2 minutes.'); } }
    async function shareProject() { const { grandTotal } = getAggregatedData(); const totalScenes = projectData.scenes.length; const shareText = `*Project Breakdown Summary*\n` + `Production: ${projectData.projectInfo.prodName || 'N/A'}\n` + `Director: ${projectData.projectInfo.directorName || 'N/A'}\n` + `Total Scenes: ${totalScenes}\n` + (currentMode === 'producer' ? `Estimated Cost: ${formatCurrency(grandTotal)}` : ''); if (navigator.share) { try { await navigator.share({ title: `Project: ${projectData.projectInfo.prodName || 'Untitled'}`, text: shareText }); } catch (err) { console.error("Share failed:", err); } } else { alert("Sharing is not supported on this browser. You can save the project file instead."); } }
    function openInfoModal() { const modal = document.getElementById('info-modal'); modal.innerHTML = `<div class="modal-content small"><span class="close-btn" onclick="this.parentElement.parentElement.style.display='none'">&times;</span><h3>App Guide</h3><div class="modal-body info-content"><p><strong>Assistant Mode:</strong> A clean view for tagging script elements without seeing costs.</p><p><strong>Producer Mode:</strong> Unlocks cost fields for every item, a currency selector, and the main Estimation page for budgeting.</p><p><strong>Estimate Page:</strong> Aggregates all costs into a scene-by-scene report. Visible only in Producer Mode.</p><p><strong>Side Panel:</strong> Organize your project with Sequences and Schedule Breaks. You can also filter all scenes by a specific category element.</p><p><strong>Save Full Excel:</strong> Exports all sequences and their breakdowns into a single Excel file with multiple sheets.</p><p><strong>Share Scene:</strong> Exports a detailed breakdown of a single scene to an Excel file.</p></div></div>`; modal.style.display = 'block'; }
    function openAboutModal() { const modal = document.getElementById('about-modal'); modal.innerHTML = `<div class="modal-content small"><span class="close-btn" onclick="this.parentElement.parentElement.style.display='none'">&times;</span><h3 style="text-align:center;">About To Make</h3><p style="font-size: 1.2rem; text-align: center;">Designed by Thosho Tech</p></div>`; modal.style.display = 'block'; }
    function saveAsExcel(isFullProject = true) { if (!isFullProject) { exportFilteredToExcel(); return; } const wb = XLSX.utils.book_new(); let grandTotal = 0; let currentScheduleBreak = "N/A"; getPanelItems().forEach(pItem => { if (pItem.type === 'schedule_break') { currentScheduleBreak = pItem.name; } else if (pItem.type === 'sequence') { const sceneIds = pItem.sceneIds || []; const breakdowns = projectData.scenes.filter(s => sceneIds.includes(s.sceneId)); if (breakdowns.length > 0) { const data = []; let sequenceTotal = 0; data.push([`Project: ${projectData.projectInfo.prodName || 'N/A'}`]); data.push([`Schedule Break: ${currentScheduleBreak}`]); data.push([`Sequence: ${pItem.name}`]); data.push([]); const headers = ['Scene #', 'Location', ...CATEGORIES.map(c => c.title)]; if(currentMode === 'producer') headers.push('Scene Total'); data.push(headers); breakdowns.forEach(b => { let sceneTotal = 0; const row = [b.sceneNumber, b.sceneSetting]; CATEGORIES.forEach(cat => { const items = b.breakdownData[cat.key] ? b.breakdownData[cat.key].map(i => { if(currentMode === 'producer') sceneTotal += (i.cost || 0); return i.name; }).join('; ') : ''; row.push(items); }); if(currentMode === 'producer') row.push(sceneTotal); data.push(row); sequenceTotal += sceneTotal; }); if(currentMode === 'producer') { data.push([]); const totalRow = new Array(headers.length).fill(''); totalRow[headers.length-2] = "SEQUENCE TOTAL"; totalRow[headers.length-1] = sequenceTotal; data.push(totalRow); grandTotal += sequenceTotal; } const ws = XLSX.utils.aoa_to_sheet(data); ws['!cols'] = headers.map(h => ({wch: h.length < 15 ? 15 : h.length + 2})); XLSX.utils.book_append_sheet(wb, ws, pItem.name.replace(/[/\\?*:[\]]/g, '')); } } }); if (currentMode === 'producer' && wb.SheetNames.length > 0) { const summaryData = [['GRAND TOTAL', grandTotal]]; const summaryWs = XLSX.utils.aoa_to_sheet(summaryData); XLSX.utils.book_append_sheet(wb, summaryWs, "Total"); } if (wb.SheetNames.length === 0) { alert("No breakdowns to export."); return; } XLSX.writeFile(wb, `${(projectData.projectInfo.prodName || 'Full_Project_Breakdown')}.xlsx`); }

    initialize();
});
