// =================================================================
// --- GLOBAL STATE & DATA STRUCTURE ---
// =================================================================
let projectData = {
    panelItems: [],
    activeItemId: null,
    projectInfo: {}
};
let lastContactPerson = '';
// NEW: Global state for filtering
let activeFilter = { type: 'all', value: '' };

document.addEventListener('DOMContentLoaded', () => {
    // ... (same setup as before)
});

// =================================================================
// --- SETUP ALL EVENT LISTENERS ---
// =================================================================
function setupEventListeners() {
    // ... (event listeners for forms, modals, etc. are the same)

    // UPDATED: Changed from sort to filter
    document.getElementById('filter-by-select').addEventListener('change', handleFilterChange);
}

// =================================================================
// --- NEW: FILTERING LOGIC ---
// =================================================================

function handleFilterChange(e) {
    const filterType = e.target.value;
    if (filterType === 'all') {
        activeFilter = { type: 'all', value: '' };
        renderSchedule(); // Render all scenes
    } else {
        let filterValue = prompt(`Enter value to filter by ${filterType}:`);
        if (filterValue !== null && filterValue.trim() !== "") {
            activeFilter = { type: filterType, value: filterValue.trim().toLowerCase() };
            renderSchedule(); // Render filtered scenes
        }
    }
    // Reset dropdown if user cancels prompt
    e.target.value = 'all';
}

function getVisibleScenes() {
    const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
    if (!activeSequence || activeSequence.type !== 'sequence') {
        return []; // Return empty array if no active sequence
    }
    
    const allScenes = activeSequence.scenes;

    if (activeFilter.type === 'all') {
        return allScenes;
    }

    return allScenes.filter(scene => {
        const sceneValue = (scene[activeFilter.type] || '').toLowerCase();
        return sceneValue.includes(activeFilter.value);
    });
}


// =================================================================
// --- CORE SCHEDULE FUNCTIONS (ADAPTED FOR FILTERING) ---
// =================================================================

function renderSchedule() {
    const container = document.getElementById('scene-strips-container');
    const display = document.getElementById('active-sequence-display');
    container.innerHTML = '';
    
    const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
    
    if (!activeSequence || activeSequence.type !== 'sequence') {
        display.textContent = 'No active sequence. Create or select a sequence.';
        return;
    }

    display.textContent = `Current Sequence: ${activeSequence.name}`;
    
    const scenesToRender = getVisibleScenes(); // Get either all or filtered scenes
    
    if (scenesToRender.length === 0) {
        const message = document.createElement('p');
        message.textContent = "No scenes match the current filter.";
        message.style.textAlign = 'center';
        container.appendChild(message);
    } else {
        scenesToRender.forEach(scene => {
            // ... (The code to create and append the detailed strip wrapper is the same)
        });
    }
}

function handleAddScene(e) {
    e.preventDefault();
    // ... (logic to get/create active sequence)
    
    const newScene = { /* ... (get data from form) ... */ };
    activeSequence.scenes.push(newScene);
    // ... (save data, reset form)
    
    // After adding, re-render with the current filter applied
    renderSchedule();
}

function deleteScene(id) {
    // ... (logic to find active sequence and filter out the scene)
    saveProjectData();
    renderSchedule(); // Re-render with the current filter applied
}

// =================================================================
// --- EXPORT & SHARE FUNCTIONS (UPDATED EXCEL EXPORT) ---
// =================================================================

function saveAsExcel() {
    const activeSequence = projectData.panelItems.find(item => item.id === projectData.activeItemId);
    if (!activeSequence || activeSequence.type !== 'sequence') { alert("Please select a sequence to export."); return; }

    // UPDATED: Use the getVisibleScenes function to get the data to export
    const scenesToExport = getVisibleScenes();
    const sequenceName = activeSequence.name;

    if (scenesToExport.length === 0) {
        alert(`No visible scenes in "${sequenceName}" to export.`);
        return;
    }

    // Find the schedule break for this sequence
    let scheduleBreakName = 'Uncategorized';
    const sequenceIndex = projectData.panelItems.findIndex(item => item.id === projectData.activeItemId);
    for (let i = sequenceIndex - 1; i >= 0; i--) {
        if (projectData.panelItems[i].type === 'schedule_break') {
            scheduleBreakName = projectData.panelItems[i].name;
            break;
        }
    }
    
    const projectInfo = projectData.projectInfo || {};
    const header = [
        ["Production:", projectInfo.prodName || 'N/A', "Director:", projectInfo.directorName || 'N/A'],
        ["Contact:", projectInfo.contactNumber || 'N/A', "Email:", projectInfo.contactEmail || 'N/A'],
        [], // Empty spacer row
        [`Schedule Break: ${scheduleBreakName}`],
        [`Sequence: ${sequenceName}`],
        [] // Empty spacer row
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(header);
    worksheet['!merges'] = [{ s: { r: 0, c: 1 }, e: { r: 0, c: 2 } }, { s: { r: 1, c: 1 }, e: { r: 1, c: 2 } }];
    
    XLSX.utils.sheet_add_json(worksheet, scenesToExport, {
        origin: `A${header.length + 1}`, // Start data after the header
        skipHeader: false
    });
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sequenceName.replace(/[/\\?*:[\]]/g, ''));
    XLSX.writeFile(workbook, `${sequenceName}_Schedule.xlsx`);
}

// --- All other functions (Data Persistence, Modals, Drag-and-Drop, etc.) remain the same ---
