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
    let currentBreakdown = {}; // Holds items for the scene being entered
    let currentMode = 'assistant'; // 'assistant' or 'producer'

    // --- INITIALIZATION ---
    function initialize() {
        setupEventListeners();
        createEntryGrid();
        loadProjectData();
        initializeDragAndDrop();
    }

    // --- SETUP EVENT LISTENERS ---
    function setupEventListeners() {
        // ... (Listeners for main form, hamburger, all modals, filter panel)
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
        calculateAndDisplayTotalCost();
    }

    // --- UI CREATION ---
    function createEntryGrid() {
        const grid = document.getElementById('breakdown-entry-grid');
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
                <ul class="item-list-entry" id="entry-list-${cat.key}"></ul>`;
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
    
    // --- DATA HANDLING FOR CURRENT FORM ---
    function addItemToCurrent(categoryKey, itemObject) {
        if (!currentBreakdown[categoryKey]) currentBreakdown[categoryKey] = [];
        currentBreakdown[categoryKey].push(itemObject);
        renderCurrentBreakdownList(categoryKey);
    }
    
    function renderCurrentBreakdownList(categoryKey) {
        const list = document.getElementById(`entry-list-${categoryKey}`);
        list.innerHTML = '';
        if (currentBreakdown[categoryKey]) {
            currentBreakdown[categoryKey].forEach((item, index) => {
                const li = document.createElement('li');
                li.className = 'tagged-item-entry';
                li.innerHTML = `<span class="tagged-item-name"></span>
                    <input type="number" class="cost-input" placeholder="Cost" min="0">
                    <button class="delete-item-btn">&times;</button>`;
                li.querySelector('span').textContent = item.name;
                
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
        if (!activeSequence) return;

        activeSequence.scenes.forEach(breakdown => {
            // ... (Code to create the summary strip) ...
        });
        calculateAndDisplayTotalCost();
    }
    
    // --- COST CALCULATION ---
    function calculateAndDisplayTotalCost() {
        const display = document.getElementById('total-cost-display');
        const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
        if (!activeSequence || currentMode !== 'producer') {
            display.style.display = 'none';
            return;
        }

        let totalCost = 0;
        activeSequence.scenes.forEach(scene => {
            CATEGORIES.forEach(cat => {
                if(scene[cat.key]){
                    scene[cat.key].forEach(item => {
                        totalCost += item.cost || 0;
                    });
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
        let categoryCosts = {};
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

    // --- All other functions (localStorage, edit modals, export, etc.) need to be
    // --- fully implemented and adapted for the new sequence and cost data structure.
    
    initialize();
});
