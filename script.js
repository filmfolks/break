document.addEventListener('DOMContentLoaded', () => {
    console.log("Script Breakdown Initializing...");

    const CATEGORIES = [
        { key: 'cast', title: 'Cast', icon: 'fa-user-ninja', color: 'var(--color-cast)' },
        { key: 'props', title: 'Props', icon: 'fa-magic-wand-sparkles', color: 'var(--color-props)' },
        { key: 'costumes', title: 'Costumes', icon: 'fa-shirt', color: 'var(--color-costumes)' },
        { key: 'makeup', title: 'Hair & Makeup', icon: 'fa-palette', color: 'var(--color-makeup)' },
        { key: 'setDressing', title: 'Set Dressing', icon: 'fa-couch', color: 'var(--color-setDressing)' },
        { key: 'vehicles', title: 'Vehicles', icon: 'fa-car', color: 'var(--color-vehicles)' },
        { key: 'stunts', title: 'Stunts', icon: 'fa-bolt', color: 'var(--color-stunts)' },
        { key: 'sfx', title: 'Special Effects', icon: 'fa-bomb', color: 'var(--color-sfx)' },
        { key: 'sound', title: 'Sound', icon: 'fa-volume-high', color: 'var(--color-sound)' },
        { key: 'equipment', title: 'Equipment', icon: 'fa-camera-retro', color: 'var(--color-equipment)' },
        { key: 'technicians', title: 'Technicians', icon: 'fa-helmet-safety', color: 'var(--color-technicians)' },
        { key: 'misc', title: 'Miscellaneous', icon: 'fa-box-archive', color: 'var(--color-misc)' },
    ];

    let projectData = { panelItems: [], activeItemId: null, projectInfo: {}, currency: 'USD' };
    let currentBreakdown = {};
    let currentMode = 'assistant';
    let currentView = 'breakdown';

    function initialize() {
        setupEventListeners();
        populateFilterDropdown();
        loadProjectData();
        setMode(localStorage.getItem('breakdownAppMode') || 'assistant');
        createEntryGrid('breakdown-entry-grid', currentBreakdown);
    }

    function setupEventListeners() {
        const safeAddListener = (id, event, handler) => {
            const element = document.getElementById(id);
            if (element) element.addEventListener(event, handler);
        };
        const hamburgerBtn = document.getElementById('hamburger-btn');
        const dropdownMenu = document.getElementById('dropdown-menu');
        if (hamburgerBtn) hamburgerBtn.addEventListener('click', (e) => { e.stopPropagation(); dropdownMenu.classList.toggle('show'); });
        document.addEventListener('click', (event) => {
            if (hamburgerBtn && dropdownMenu.classList.contains('show') && !hamburgerBtn.contains(event.target) && !dropdownMenu.contains(event.target)) {
                dropdownMenu.classList.remove('show');
            }
        });
        
        safeAddListener('project-info-btn', 'click', openProjectInfoModal);
        safeAddListener('new-sequence-btn', 'click', handleNewSequence);
        safeAddListener('open-project-btn', 'click', () => document.getElementById('file-input').click());
        safeAddListener('file-input', 'change', openProjectFile);
        safeAddListener('save-project-btn', 'click', saveProjectFile);
        safeAddListener('clear-project-btn', 'click', clearProject);
        safeAddListener('assistant-mode-btn', 'click', () => setMode('assistant'));
        safeAddListener('producer-mode-btn', 'click', () => setMode('producer'));
        safeAddListener('estimate-btn', 'click', () => showView('estimation'));
        safeAddListener('sequence-hamburger-btn', 'click', () => document.getElementById('sequence-panel').classList.add('open'));
        safeAddListener('breakdown-form', 'submit', handleAddBreakdownToSequence);
        safeAddListener('currency-selector', 'change', (e) => {
            projectData.currency = e.target.value;
            saveProjectData();
            showView(currentView);
            renderBreakdownStrips();
        });

        safeAddListener('close-panel-btn', 'click', () => document.getElementById('sequence-panel').classList.remove('open'));
        safeAddListener('add-schedule-break-btn', 'click', handleAddScheduleBreak);
        safeAddListener('export-panel-btn', 'click', exportFilteredToExcel);
        safeAddListener('filter-category-select', 'change', handleFilterChange);
        safeAddListener('filter-value-input', 'input', () => renderBreakdownStrips());
        safeAddListener('export-excel-btn', 'click', exportEstimateToExcel);
        safeAddListener('export-pdf-btn', 'click', exportEstimateToPDF);
    }

    function setMode(mode) {
        currentMode = mode;
        localStorage.setItem('breakdownAppMode', mode);
        const container = document.getElementById('main-container');
        const currencyWrapper = document.getElementById('currency-selector-wrapper');
        const assistantBtn = document.getElementById('assistant-mode-btn');
        const producerBtn = document.getElementById('producer-mode-btn');
        if (mode === 'producer') {
            container.classList.add('producer-mode');
            currencyWrapper.style.display = 'block';
            producerBtn.classList.add('active-mode');
            assistantBtn.classList.remove('active-mode');
        } else {
            container.classList.remove('producer-mode');
            currencyWrapper.style.display = 'none';
            assistantBtn.classList.add('active-mode');
            producerBtn.classList.remove('active-mode');
        }
        createEntryGrid('breakdown-entry-grid', currentBreakdown);
        renderBreakdownStrips();
    }
    
    function showView(viewName) {
        currentView = viewName;
        const breakdownView = document.getElementById('breakdown-view');
        const estimationView = document.getElementById('estimation-view');
        const estimateBtn = document.getElementById('estimate-btn');
        const title = document.getElementById('app-title');

        if (viewName === 'estimation') {
            breakdownView.style.display = 'none';
            estimationView.style.display = 'block';
            title.textContent = 'Project Estimation';
            estimateBtn.innerHTML = `<i class="fas fa-clipboard-list"></i>`;
            estimateBtn.title = "Back to Breakdown";
            estimateBtn.onclick = () => showView('breakdown');
            renderEstimationPage();
        } else {
            breakdownView.style.display = 'block';
            estimationView.style.display = 'none';
            title.textContent = 'Script Breakdown';
            estimateBtn.innerHTML = `<i class="fas fa-calculator"></i>`;
            estimateBtn.title = "Project Estimate";
            estimateBtn.onclick = () => showView('estimation');
        }
    }

    function saveProjectData() { localStorage.setItem('scriptBreakdownProjectV2', JSON.stringify(projectData)); }

    function loadProjectData() {
        const savedData = localStorage.getItem('scriptBreakdownProjectV2');
        projectData = savedData ? JSON.parse(savedData) : { panelItems: [], activeItemId: null, projectInfo: {}, currency: 'USD' };
        if (!projectData.panelItems) projectData.panelItems = [];
        if (!projectData.projectInfo) projectData.projectInfo = {};
        if (!projectData.currency) projectData.currency = 'USD';

        if (projectData.activeItemId === null && projectData.panelItems.length > 0) {
            const firstSeq = projectData.panelItems.find(i => i.type === 'sequence');
            if (firstSeq) projectData.activeItemId = firstSeq.id;
        }
        document.getElementById('currency-selector').value = projectData.currency;
        renderBreakdownStrips();
        renderSequencePanel();
    }
    
    function clearProject() {
        if(confirm("Are you sure? This will delete all sequences and breakdowns.")){
            projectData = { panelItems: [], activeItemId: null, projectInfo: {}, currency: 'USD' };
            saveProjectData();
            loadProjectData();
        }
    }

    function createEntryGrid(gridId, targetData) {
        const grid = document.getElementById(gridId);
        if (!grid) return;
        grid.innerHTML = '';
        CATEGORIES.forEach(cat => {
            const isProducer = currentMode === 'producer';
            const formHTML = isProducer ?
                `<form class="add-item-form producer-form" data-category="${cat.key}">
                    <input type="text" placeholder="Item Name" class="item-name-input" required>
                    <input type="number" placeholder="Cost" min="0" step="0.01" class="item-cost-input">
                    <button type="submit" class="btn-primary">Add</button>
                </form>` :
                `<form class="add-item-form" data-category="${cat.key}">
                    <input type="text" placeholder="Add element..." required>
                    <button type="submit" class="btn-primary">Add</button>
                </form>`;

            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'breakdown-entry-category';
            categoryDiv.style.borderTopColor = cat.color;
            categoryDiv.innerHTML = `<h4><i class="fas ${cat.icon}"></i> ${cat.title}</h4> ${formHTML} <ul class="item-list-entry" id="list-${gridId}-${cat.key}"></ul>`;
            grid.appendChild(categoryDiv);
            
            categoryDiv.querySelector('.add-item-form').addEventListener('submit', (e) => {
                e.preventDefault();
                const categoryKey = e.target.dataset.category;
                const nameInput = e.target.querySelector('.item-name-input, input[type="text"]');
                const costInput = e.target.querySelector('.item-cost-input');
                if (nameInput.value.trim()) {
                    if (!targetData[categoryKey]) targetData[categoryKey] = [];
                    targetData[categoryKey].push({ id: Date.now(), name: nameInput.value.trim(), cost: costInput ? parseFloat(costInput.value) || 0 : 0 });
                    renderItemList(`list-${gridId}-${cat.key}`, categoryKey, targetData);
                    nameInput.value = '';
                    if (costInput) costInput.value = '';
                }
            });

            if (gridId === 'breakdown-entry-grid' && cat.key === 'misc' && (!targetData.misc || targetData.misc.length === 0)) {
                targetData.misc = [ {id: Date.now()+1, name: "Food", cost: 0}, {id: Date.now()+2, name: "Logistics", cost: 0}, {id: Date.now()+3, name: "Accommodation", cost: 0} ];
            }
            renderItemList(`list-${gridId}-${cat.key}`, cat.key, targetData);
        });
    }

    function renderItemList(listId, categoryKey, data) {
        const list = document.getElementById(listId);
        if (!list) return;
        list.innerHTML = '';
        if (data[categoryKey]) {
            data[categoryKey].forEach((item) => {
                const li = document.createElement('li');
                li.className = 'tagged-item-entry';
                const costHTML = currentMode === 'producer' ? `<span class="tagged-item-cost">${formatCurrency(item.cost)}</span>` : '';
                li.innerHTML = `<span class="tagged-item-name">${item.name}</span> ${costHTML}
                    <div class="item-actions">
                        <button class="edit-item-btn" title="Edit"><i class="fas fa-pencil-alt"></i></button>
                        <button class="delete-item-btn" title="Delete">&times;</button>
                    </div>`;

                li.querySelector('.edit-item-btn').onclick = () => {
                    const newName = prompt("Enter new name:", item.name);
                    if (newName !== null) item.name = newName.trim() || item.name;
                    if (currentMode === 'producer') {
                        const newCostStr = prompt("Enter new cost:", item.cost);
                        if (newCostStr !== null) item.cost = parseFloat(newCostStr) || 0;
                    }
                    renderItemList(listId, categoryKey, data);
                };
                li.querySelector('.delete-item-btn').onclick = () => {
                    data[categoryKey] = data[categoryKey].filter(i => i.id !== item.id);
                    renderItemList(listId, categoryKey, data);
                };
                list.appendChild(li);
            });
        }
    }

    function handleAddBreakdownToSequence(e) {
        e.preventDefault();
        const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
        if (!activeSequence) { alert("No active sequence. Please create or select one first."); return; }
        const sceneNumberInput = document.getElementById('scene-number');
        if (!sceneNumberInput.value.trim()) { alert('Please enter a Scene Number.'); return; }
        const newBreakdown = { id: Date.now(), sceneNumber: sceneNumberInput.value, sceneType: document.getElementById('scene-type').value, sceneLocation: document.getElementById('scene-location').value, sceneTime: document.getElementById('scene-time').value, ...JSON.parse(JSON.stringify(currentBreakdown)) };
        if (!activeSequence.breakdowns) activeSequence.breakdowns = [];
        activeSequence.breakdowns.push(newBreakdown);
        saveProjectData();
        renderBreakdownStrips();
        currentBreakdown = {};
        document.getElementById('breakdown-form').reset();
        createEntryGrid('breakdown-entry-grid', currentBreakdown);
    }
    
    function renderBreakdownStrips() {
        const container = document.getElementById('breakdown-strips-container');
        const display = document.getElementById('active-sequence-display');
        const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
        if (!activeSequence) {
            display.textContent = 'No active sequence. Create one from the side panel.';
            container.innerHTML = '';
            calculateAndRenderSequenceTotal();
            return;
        }
        display.textContent = `Current Sequence: ${activeSequence.name}`;
        container.innerHTML = '';
        if (!activeSequence.breakdowns) activeSequence.breakdowns = [];
        const filteredBreakdowns = getFilteredBreakdowns(activeSequence.breakdowns);
        filteredBreakdowns.forEach(breakdown => {
            const stripWrapper = document.createElement('div');
            stripWrapper.className = 'breakdown-strip-wrapper';
            let summaryHTML = '';
            let sceneTotalCost = 0;
            CATEGORIES.forEach(cat => {
                const items = breakdown[cat.key];
                if (items && items.length > 0) {
                    summaryHTML += `<div class="strip-item-summary" style="color:${cat.color};"><i class="fas ${cat.icon}"></i><span class="count">${items.length}</span></div>`;
                    sceneTotalCost += items.reduce((sum, item) => sum + (item.cost || 0), 0);
                }
            });
            const costHTML = `<div class="strip-item-cost">${formatCurrency(sceneTotalCost)}</div>`;
            stripWrapper.innerHTML = `<div class="breakdown-strip"><div class="strip-item-scene">#${breakdown.sceneNumber} - ${breakdown.sceneLocation} (${breakdown.sceneTime})</div>${summaryHTML}${costHTML}</div>
                <div class="strip-actions">
                    <button class="share-btn-strip" data-id="${breakdown.id}" title="Share Breakdown"><i class="fas fa-share-alt"></i></button>
                    <button class="edit-btn-strip" data-id="${breakdown.id}" title="Edit Breakdown"><i class="fas fa-pencil-alt"></i></button>
                    <button class="delete-btn-strip" data-id="${breakdown.id}" title="Delete Breakdown"><i class="fas fa-trash"></i></button>
                </div>`;
            container.appendChild(stripWrapper);
        });
        container.querySelectorAll('.edit-btn-strip').forEach(b => b.onclick = () => openEditModal(parseInt(b.dataset.id)));
        container.querySelectorAll('.delete-btn-strip').forEach(b => b.onclick = () => handleDelete(parseInt(b.dataset.id)));
        container.querySelectorAll('.share-btn-strip').forEach(b => b.onclick = () => shareSceneBreakdown(parseInt(b.dataset.id)));
        calculateAndRenderSequenceTotal();
    }

    function calculateAndRenderSequenceTotal() {
        const totalDiv = document.getElementById('sequence-total-cost');
        const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
        let totalCost = 0;
        if (activeSequence && activeSequence.breakdowns) {
            activeSequence.breakdowns.forEach(breakdown => {
                CATEGORIES.forEach(cat => {
                    if (breakdown[cat.key]) {
                        totalCost += breakdown[cat.key].reduce((sum, item) => sum + (item.cost || 0), 0);
                    }
                });
            });
        }
        totalDiv.innerHTML = `Sequence Total: <span>${formatCurrency(totalCost)}</span>`;
    }

    function getFilteredBreakdowns(breakdowns) {
        const category = document.getElementById('filter-category-select').value;
        const value = document.getElementById('filter-value-input').value.toLowerCase();
        if (category === 'all' || !value) return breakdowns;
        return breakdowns.filter(b => b[category] && b[category].some(item => item.name.toLowerCase().includes(value)));
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
                    showView('breakdown');
                } else { alert('Error: Invalid project file format.'); }
            } catch (error) { console.error(error); alert('Error: Could not read project file.'); }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    function saveProjectFile() {
        const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(projectData.projectInfo.prodName || 'Breakdown').replace(/ /g, '_')}.filmbreakdown`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    function openProjectInfoModal() {
        const modal = document.getElementById('project-info-modal');
        const { prodName = '', directorName = '' } = projectData.projectInfo;
        modal.innerHTML = `<div class="modal-content small"><span class="close-btn">&times;</span><h3>Project Information</h3><div class="modal-form"><input type="text" id="modal-prod-name" placeholder="Production Name" value="${prodName}"><input type="text" id="modal-director-name" placeholder="Director Name" value="${directorName}"><button id="modal-save-info-btn" class="btn-primary">Save Info</button></div></div>`;
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
        modal.innerHTML = `<div class="modal-content"><span class="close-btn">&times;</span><div class="modal-body"><h3>Edit Scene #${breakdown.sceneNumber}</h3><div class="breakdown-grid" id="edit-breakdown-grid"></div></div><div class="modal-actions"><button id="save-changes-btn" class="btn-primary">Save Changes</button></div></div>`;
        modal.style.display = 'block';
        let tempEditData = JSON.parse(JSON.stringify(breakdown));
        createEntryGrid('edit-breakdown-grid', tempEditData);
        modal.querySelector('.close-btn').onclick = () => modal.style.display = 'none';
        modal.querySelector('#save-changes-btn').onclick = () => {
            const breakdownIndex = activeSequence.breakdowns.findIndex(b => b.id === breakdownId);
            if (breakdownIndex > -1) {
                activeSequence.breakdowns[breakdownIndex] = tempEditData;
                saveProjectData(); renderBreakdownStrips(); modal.style.display = 'none';
            }
        };
    }
    
    function handleDelete(id) {
        if(confirm("Are you sure you want to delete this breakdown?")){
            const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
            if(activeSequence) {
                activeSequence.breakdowns = activeSequence.breakdowns.filter(b => b.id !== id);
                saveProjectData(); renderBreakdownStrips();
            }
        }
    }
    
    function handleNewSequence() {
        let name = prompt("Enter a name for the new sequence:");
        if (name === null) return;
        if (name.trim() === "") name = `Sequence ${projectData.panelItems.filter(i => i.type === 'sequence').length + 1}`;
        const newItem = { type: 'sequence', id: Date.now(), name: name, breakdowns: [] };
        projectData.panelItems.push(newItem);
        setActiveItem(newItem.id);
    }

    function handleAddScheduleBreak() {
        let name = prompt("Enter a name for the schedule break (e.g., DAY 1):");
        if (name === null || name.trim() === "") return;
        const newItem = { type: 'schedule_break', id: Date.now(), name: name };
        projectData.panelItems.push(newItem);
        saveProjectData(); renderSequencePanel();
    }

    function setActiveItem(id) {
        const item = projectData.panelItems.find(i => i.id === id);
        if (item && item.type === 'sequence') {
            projectData.activeItemId = id;
            saveProjectData(); renderBreakdownStrips(); renderSequencePanel();
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
                element.onclick = () => { setActiveItem(item.id); document.getElementById('sequence-panel').classList.remove('open'); };
            } else if (item.type === 'schedule_break') {
                element.className = 'schedule-break-item';
                element.textContent = item.name;
            }
            listContainer.appendChild(element);
        });
    }

    function populateFilterDropdown() {
        const select = document.getElementById('filter-category-select');
        CATEGORIES.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.key;
            option.textContent = cat.title;
            select.appendChild(option);
        });
    }

    function handleFilterChange(e) {
        const valueInput = document.getElementById('filter-value-input');
        valueInput.style.display = e.target.value === 'all' ? 'none' : 'block';
        valueInput.value = '';
        renderBreakdownStrips();
    }
    
    function getAggregatedData() {
        const aggregated = {};
        let grandTotal = 0;
        CATEGORIES.forEach(c => aggregated[c.key] = { title: c.title, items: [], total: 0 });
        projectData.panelItems.forEach(pItem => {
            if (pItem.type === 'sequence' && pItem.breakdowns) {
                pItem.breakdowns.forEach(scene => {
                    CATEGORIES.forEach(cat => {
                        if (scene[cat.key]) {
                            scene[cat.key].forEach(item => {
                                const existing = aggregated[cat.key].items.find(agg => agg.name.toLowerCase() === item.name.toLowerCase());
                                if (existing) {
                                    if(!existing.scenes.includes(scene.sceneNumber)) existing.scenes.push(scene.sceneNumber);
                                } else {
                                    aggregated[cat.key].items.push({ name: item.name, cost: item.cost, scenes: [scene.sceneNumber] });
                                }
                            });
                        }
                    });
                });
            }
        });
        CATEGORIES.forEach(cat => {
            const categoryTotal = aggregated[cat.key].items.reduce((sum, item) => sum + (item.cost || 0), 0);
            aggregated[cat.key].total = categoryTotal;
            grandTotal += categoryTotal;
        });
        return { aggregated, grandTotal };
    }

    function renderEstimationPage() {
        const container = document.getElementById('estimation-table-container');
        const grandTotalEl = document.getElementById('grand-total-cost');
        const { aggregated, grandTotal } = getAggregatedData();
        let tableHTML = '<table class="estimation-table"><thead><tr><th>Item</th><th>Appears in Scene(s)</th><th class="cost-cell">Cost</th></tr></thead><tbody>';
        CATEGORIES.forEach(cat => {
            const categoryData = aggregated[cat.key];
            if (categoryData.items.length > 0) {
                tableHTML += `<tr class="category-row"><td colspan="3">${categoryData.title}</td></tr>`;
                categoryData.items.forEach(item => {
                    tableHTML += `<tr><td>${item.name}</td><td>${item.scenes.join(', ')}</td><td class="cost-cell">${formatCurrency(item.cost)}</td></tr>`;
                });
                tableHTML += `<tr class="subtotal-row"><td colspan="2">Category Total</td><td class="cost-cell">${formatCurrency(categoryData.total)}</td></tr>`;
            }
        });
        tableHTML += '</tbody></table>';
        container.innerHTML = tableHTML;
        grandTotalEl.innerHTML = `Grand Total: <span>${formatCurrency(grandTotal)}</span>`;
    }

    function exportEstimateToExcel() {
        const { aggregated, grandTotal } = getAggregatedData();
        const wb = XLSX.utils.book_new();
        const data = [];
        data.push([`Project: ${projectData.projectInfo.prodName || 'Untitled'}`, '', `Currency: ${projectData.currency}`]);
        data.push([`Director: ${projectData.projectInfo.directorName || 'N/A'}`]);
        data.push([]);
        CATEGORIES.forEach(cat => {
            const categoryData = aggregated[cat.key];
            if (categoryData.items.length > 0) {
                data.push([categoryData.title]);
                data.push(['Item', 'Scenes', 'Cost']);
                categoryData.items.forEach(item => data.push([item.name, item.scenes.join(', '), item.cost]));
                data.push(['Category Total', '', categoryData.total]);
                data.push([]);
            }
        });
        data.push(['GRAND TOTAL', '', grandTotal]);
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Cost Estimate');
        XLSX.writeFile(wb, 'Cost_Estimate.xlsx');
    }

    function exportFilteredToExcel() {
        const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
        if (!activeSequence) { alert("Please select a sequence to export."); return; }
        const breakdowns = getFilteredBreakdowns(activeSequence.breakdowns);
        if (breakdowns.length === 0) { alert("No breakdowns match the current filter."); return; }
        const wb = XLSX.utils.book_new();
        const data = [];
        data.push([`Project: ${projectData.projectInfo.prodName || 'Untitled'}`]);
        data.push([`Sequence: ${activeSequence.name}`]);
        data.push([]);
        
        let sequenceTotalCost = 0;
        const isProducer = currentMode === 'producer';
        
        const headers = ['Scene #', 'Location', ...CATEGORIES.map(c => c.title)];
        if (isProducer) headers.push('Total Cost');
        data.push(headers);

        breakdowns.forEach(b => {
            let sceneTotalCost = 0;
            const row = [b.sceneNumber, b.sceneLocation];
            CATEGORIES.forEach(cat => {
                const items = b[cat.key] ? b[cat.key].map(i => {
                    if(isProducer) sceneTotalCost += (i.cost || 0);
                    return i.name;
                }).join('; ') : '';
                row.push(items);
            });
            if(isProducer) row.push(sceneTotalCost);
            data.push(row);
            sequenceTotalCost += sceneTotalCost;
        });

        if(isProducer) {
            data.push([]);
            const totalRow = new Array(headers.length -1).fill('');
            totalRow[headers.length - 2] = 'Sequence Total';
            totalRow[headers.length - 1] = sequenceTotalCost;
            data.push(totalRow);
        }

        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Filtered Breakdowns');
        XLSX.writeFile(wb, `Filtered_${activeSequence.name}.xlsx`);
    }

    function exportEstimateToPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const { aggregated, grandTotal } = getAggregatedData();
        const head = [['Item', 'Scenes', `Cost (${projectData.currency})`]];
        const body = [];
        CATEGORIES.forEach(cat => {
            const categoryData = aggregated[cat.key];
            if (categoryData.items.length > 0) {
                body.push([{ content: categoryData.title, colSpan: 3, styles: { fontStyle: 'bold', fillColor: [41, 128, 185], textColor: 255 } }]);
                categoryData.items.forEach(item => body.push([item.name, item.scenes.join(', '), formatCurrency(item.cost)]));
                body.push([{ content: 'Category Total', colSpan: 2, styles: { fontStyle: 'bold' } }, { content: formatCurrency(categoryData.total), styles: { fontStyle: 'bold', halign: 'right' } }]);
            }
        });
        body.push([{ content: 'GRAND TOTAL', colSpan: 2, styles: { fontStyle: 'bold', fontSize: 14 } }, { content: formatCurrency(grandTotal), styles: { fontStyle: 'bold', fontSize: 14, halign: 'right' } }]);
        doc.text(`Cost Estimate: ${projectData.projectInfo.prodName || 'Untitled'}`, 14, 15);
        doc.autoTable({ head, body, startY: 20, didParseCell: (data) => { if(data.cell.raw.toString().startsWith(getCurrencySymbol())) { data.cell.styles.halign = 'right'; } } });
        doc.save('Cost_Estimate.pdf');
    }
    
    async function shareSceneBreakdown(breakdownId) {
        const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
        const breakdown = activeSequence ? activeSequence.breakdowns.find(b => b.id === breakdownId) : null;
        if (!breakdown) { alert("Could not find breakdown to share."); return; }
        
        const card = document.getElementById('share-card-template');
        let categoriesHTML = '';
        CATEGORIES.forEach(cat => {
            if (breakdown[cat.key] && breakdown[cat.key].length > 0) {
                categoriesHTML += `<div style="margin-bottom: 10px;">
                    <h4 style="margin:0 0 5px;color:${cat.color};">${cat.title}</h4>
                    <ul style="margin:0;padding-left:15px; list-style:none;">${breakdown[cat.key].map(i => `<li>${i.name}</li>`).join('')}</ul>
                </div>`;
            }
        });
        card.innerHTML = `<div style="background-color: var(--surface-color); color: var(--text-color); padding: 20px; border-radius: 8px; border: 1px solid var(--primary-color); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <div style="text-align:center; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom: 15px;">
                <h2 style="margin:0;color:var(--primary-color);">Breakdown: Scene #${breakdown.sceneNumber}</h2>
                <p style="margin:5px 0 0; color:#9ca3af;">${breakdown.sceneType}. ${breakdown.sceneLocation} - ${breakdown.sceneTime}</p>
            </div>
            ${categoriesHTML}
        </div>`;

        try {
            const canvas = await html2canvas(card, { backgroundColor: getComputedStyle(document.body).getPropertyValue('--background-color')});
            canvas.toBlob(blob => {
                const file = new File([blob], `Breakdown_Scene_${breakdown.sceneNumber}.png`, {type: 'image/png'});
                if (navigator.canShare && navigator.canShare({files: [file]})) {
                    navigator.share({ title: `Breakdown: Scene ${breakdown.sceneNumber}`, files: [file] });
                } else { alert('Sharing not supported on this browser.'); }
            }, 'image/png');
        } catch(e) { console.error(e); alert('Could not generate shareable image.'); }
    }

    function getCurrencySymbol() {
        try {
            return (0).toLocaleString('en-US', { style:'currency', currency: projectData.currency, minimumFractionDigits:0, maximumFractionDigits:0 }).replace(/[0-9]/g,'').trim();
        } catch (e) { return '$'; }
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: projectData.currency }).format(amount || 0);
    }

    initialize();
});
