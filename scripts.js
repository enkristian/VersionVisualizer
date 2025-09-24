/**
 * Main Application Entry Point
 * Uses ES6 modules for clean separation of concerns
 */

import { ChartManager } from './js/chartManager.js';

// Global variables
let chartManager = null;

/**
 * Initialize the application
 */
async function initializeApp() {
    try {
        console.log("Initializing Version Visualization Chart...");

        // Create chart manager
        chartManager = new ChartManager("chartdiv");

        // Initialize the chart
        const success = await chartManager.initialize();

        if (success) {
            console.log("Chart initialized successfully");

            // Initialize form controls
            initializeFormControls();

            // Set up event listeners
            setupEventListeners();
        } else {
            console.error("Failed to initialize chart");
        }
    } catch (error) {
        console.error("Application initialization failed:", error);
    }
}

/**
 * Initialize form controls for all versions
 */
function initializeFormControls() {
    const chartData = chartManager.getChartData();
    const formsContainer = document.getElementById('version-forms');

    if (!formsContainer) {
        console.warn("Forms container not found");
        return;
    }

    // Set initial values for static date inputs above chart
    const purchaseInput = document.getElementById('purchaseDate');
    const travelInput = document.getElementById('travelDate');
    if (purchaseInput) purchaseInput.value = dateToInputFormat(chartManager.getPurchaseDate());
    if (travelInput) travelInput.value = dateToInputFormat(chartManager.getTravelDate());

    let formsHtml = '';
    // Generate forms for all versions only (no purchase/travel date controls here)
    for (let i = 0; i < chartData.length; i++) {
        formsHtml += createVersionForm(i, chartData[i]);
    }
    formsContainer.innerHTML = formsHtml;

    // Add event listener for purchase date
    const purchaseDateEl = document.getElementById('purchaseDate');
    if (purchaseDateEl) {
        purchaseDateEl.addEventListener('change', handlePurchaseDateChange);
    }

    // Add event listener for travel date
    const travelDateEl = document.getElementById('travelDate');
    if (travelDateEl) {
        travelDateEl.addEventListener('change', handleTravelDateChange);
    }

    // Add event listeners for all versions
    for (let i = 0; i < chartData.length; i++) {
        const versionNum = i + 1;
        const publishDateEl = document.getElementById('publishDate' + versionNum);
        const startDateEl = document.getElementById('startDate' + versionNum);
        const endDateEl = document.getElementById('endDate' + versionNum);

        if (publishDateEl) publishDateEl.addEventListener('change', () => handleDateChange(i));
        if (startDateEl) startDateEl.addEventListener('change', () => handleDateChange(i));
        if (endDateEl) endDateEl.addEventListener('change', () => handleDateChange(i));
    }
}

/**
 * Create form controls for a specific version
 */
function createVersionForm(versionIndex, versionData) {
    const versionNum = versionIndex + 1;
    return `
        <div class="version-controls">
            <div class="version-title">${versionData.version} (${versionData.category})</div>
            <div class="form-row">
                <div class="form-group">
                    <label for="publishDate${versionNum}">Published Date:</label>
                    <input type="date" id="publishDate${versionNum}" value="${dateToInputFormat(new Date(versionData.publishDate))}" />
                </div>
                <div class="form-group">
                    <label for="startDate${versionNum}">Start Date:</label>
                    <input type="date" id="startDate${versionNum}" value="${dateToInputFormat(new Date(versionData.open))}" />
                </div>
                <div class="form-group">
                    <label for="endDate${versionNum}">End Date:</label>
                    <input type="date" id="endDate${versionNum}" value="${dateToInputFormat(new Date(versionData.close))}" />
                </div>
            </div>
        </div>
    `;
}

/**
 * Handle date input changes for a specific version
 */
function handleDateChange(versionIndex) {
    const versionNum = versionIndex + 1;
    const publishDateInput = document.getElementById('publishDate' + versionNum)?.value;
    const startDateInput = document.getElementById('startDate' + versionNum)?.value;
    const endDateInput = document.getElementById('endDate' + versionNum)?.value;

    if (publishDateInput && startDateInput && endDateInput) {
        const publishDate = new Date(publishDateInput);
        let startDate = new Date(startDateInput);
        let endDate = new Date(endDateInput);

        // Validate dates
        if (startDate < publishDate) {
            alert('Start date cannot be before published date for ' + chartManager.getChartData()[versionIndex].version);
            document.getElementById('startDate' + versionNum).value = dateToInputFormat(publishDate);
            startDate = publishDate;
        }

        if (endDate <= startDate) {
            alert('End date must be after start date for ' + chartManager.getChartData()[versionIndex].version);
            const minEndDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
            document.getElementById('endDate' + versionNum).value = dateToInputFormat(minEndDate);
            endDate = minEndDate;
        }

        // Update chart through chart manager
        chartManager.updateVersionData(versionIndex, publishDate, startDate, endDate);
    }
}

/**
 * Convert date to YYYY-MM-DD format for input fields
 */
function dateToInputFormat(date) {
    return date.toISOString().split('T')[0];
}

/**
 * Handle purchase date input changes
 */
function handlePurchaseDateChange() {
    const purchaseDateInput = document.getElementById('purchaseDate')?.value;

    if (purchaseDateInput) {
        const newPurchaseDate = new Date(purchaseDateInput);
        console.log("Purchase date changed to:", newPurchaseDate.toLocaleDateString());

        // Update the chart manager with the new purchase date
        chartManager.updatePurchaseDate(newPurchaseDate);
    }
}

/**
 * Handle travel date input changes
 */
function handleTravelDateChange() {
    const travelDateInput = document.getElementById('travelDate')?.value;

    if (travelDateInput) {
        const newTravelDate = new Date(travelDateInput);
        console.log("Travel date changed to:", newTravelDate.toLocaleDateString());

        // Update the chart manager with the new travel date
        chartManager.updateTravelDate(newTravelDate);
    }
}

/**
 * Update form values after drag operations
 */
function updateFormValues(versionIndex) {

    const versionNum = versionIndex + 1;
    const versionData = chartManager.getChartData()[versionIndex];

    const publishDateEl = document.getElementById('publishDate' + versionNum);
    const startDateEl = document.getElementById('startDate' + versionNum);
    const endDateEl = document.getElementById('endDate' + versionNum);

    if (publishDateEl) {
        const newValue = dateToInputFormat(new Date(versionData.publishDate));

        console.log("Updating publish date from", publishDateEl.value, "to", newValue);
        publishDateEl.value = newValue;
    }

    if (startDateEl) {
        const newValue = dateToInputFormat(new Date(versionData.open));
        console.log("Updating start date from", startDateEl.value, "to", newValue);
        startDateEl.value = newValue;
    }

    if (endDateEl) {
        const newValue = dateToInputFormat(new Date(versionData.close));
        console.log("Updating end date from", endDateEl.value, "to", newValue);
        endDateEl.value = newValue;
    }
}

/**
 * Set up global event listeners
 */
function setupEventListeners() {
    // Listen for chart data changes from drag operations
    document.addEventListener('chartDataChanged', (event) => {
        console.log("=== CHART DATA CHANGED EVENT RECEIVED ===");
        console.log("Event detail:", event.detail);
        const { versionIndex } = event.detail;
        updateFormValues(versionIndex);
    });

    // Add drag toggle button if it exists
    const dragToggleBtn = document.getElementById('dragToggle');
    if (dragToggleBtn) {
        dragToggleBtn.addEventListener('click', () => {
            const isEnabled = dragToggleBtn.textContent.includes('Disable');
            chartManager.setDragEnabled(!isEnabled);
            dragToggleBtn.textContent = isEnabled ? 'Enable Drag' : 'Disable Drag';
        });
    }
}

/**
 * Initialize the application when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', initializeApp);

// Export for global access if needed
window.chartManager = chartManager;
