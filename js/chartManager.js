/**
 * Main Chart Module
 * Handles chart initialization, data management, and coordination between modules
 */

import { DragAndDropHandler } from './dragAndDrop.js';
import { PurchaseDateShading } from './purchaseDateShading.js';
import { TravelDateLine } from './travelDateLine.js';
import { resolveVersion } from './versionResolver.js';

export class ChartManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.root = null;
        this.chart = null;
        this.xAxis = null;
        this.yAxis = null;
        this.series = null;
        this.chartData = [];
        this.purchaseDate = new Date(2025, 9, 15).getTime(); // Default: Oct 15, 2025
        this.travelDate = new Date(2025, 10, 1).getTime(); // Default: Nov 1, 2025
        this.dragHandler = null;
        this.purchaseDateShading = null; // New dedicated module
        this.travelDateLine = null; // decoupled visual for travel date
        this._highlightListenerAttached = false;
        this._currentValidVersion = null; // Store current valid version for adapters
    }

    /**
     * Initialize the complete chart with delayed rendering
     */
    async initialize() {
        try {
            this.initializeRoot();
            this.createChart();
            this.addCursor();
            this.createAxes();

            // Generate and analyze data BEFORE creating series
            const data = this.generateData();
            this.chartData = data;

            // Determine valid version before chart creation
            const validVersionResult = resolveVersion(this.chartData, this.purchaseDate, this.travelDate, { inclusiveEnd: true });
            this._currentValidVersion = validVersionResult && validVersionResult.match ? validVersionResult.match.version : null;

            // Create series with pre-determined highlight colors using adapters
            this.createSeries();

            this.initializePurchaseDateShading();
            this.initializeTravelDateLine();

            // Set data after series is configured with correct colors
            this.setData(this.chartData);

            this.initializeDragAndDrop();
            this.applyAnimations();
            this.updateResolvedVersionUI();

            return true;
        } catch (error) {
            console.error("Failed to initialize chart:", error);
            return false;
        }
    }

    /**
     * Initialize the chart root element and themes
     */
    initializeRoot() {
        this.root = am5.Root.new(this.containerId);
        this.root.setThemes([am5themes_Animated.new(this.root)]);
    }

    /**
     * Create the main XY chart
     */
    createChart() {
        this.chart = this.root.container.children.push(am5xy.XYChart.new(this.root, {
            panX: false,
            panY: false,
            wheelX: "none",
            wheelY: "none",
            pinchZoomX: false,
            paddingLeft: 55,
            paddingBottom: 55
        }));
    }

    /**
     * Add cursor functionality (disabled for drag operations)
     */
    addCursor() {
        // Cursor is disabled to prevent interference with drag operations
    }

    /**
     * Create and configure the X and Y axes
     */
    createAxes() {
        // Create X-axis renderer for validity period
        const xRenderer = am5xy.AxisRendererX.new(this.root, {
            minGridDistance: 50,
            minorGridEnabled: true
        });
        xRenderer.labels.template.setAll({
            rotation: -45,
            centerY: am5.p50,
            centerX: am5.p100
        });
        xRenderer.grid.template.setAll({
            visible: true
        });

        // Create X-axis (Date axis for validity period)
        this.xAxis = this.chart.xAxes.push(am5xy.DateAxis.new(this.root, {
            baseInterval: { timeUnit: "day", count: 1 },
            renderer: xRenderer,
            tooltip: am5.Tooltip.new(this.root, {})
        }));
        // Axis title (X)
        this.xAxis.children.push(am5.Label.new(this.root, {
            text: "Gyldighetsperiode",
            x: am5.p50,
            centerX: am5.p50,
            paddingTop: 8,
            fontWeight: "600"
        }));

        // Set X-axis date range (validity period range)
        this.xAxis.set("min", new Date(2025, 8, 23).getTime()); // Sept 23, 2025
        this.xAxis.set("max", new Date(2026, 8, 23).getTime()); // Sept 23, 2026

        // Create Y-axis (Date axis for publication dates)
        this.yAxis = this.chart.yAxes.push(am5xy.DateAxis.new(this.root, {
            baseInterval: { timeUnit: "day", count: 1 },
            renderer: am5xy.AxisRendererY.new(this.root, {})
        }));
        // Axis title (Y)
        this.yAxis.children.unshift(am5.Label.new(this.root, {
            text: "Publiseringsdato",
            rotation: -90,
            y: am5.p50,
            centerY: am5.p50,
            fontWeight: "600"
        }));

        // Set Y-axis date range (publication date range)
        this.yAxis.set("min", new Date(2025, 7, 23).getTime()); // Aug 23, 2025
        this.yAxis.set("max", new Date(2026, 7, 23).getTime()); // Aug 23, 2026
    }

    /**
     * Create and configure the column series with adapters for dynamic coloring
     */
    createSeries() {
        this.series = this.chart.series.push(am5xy.ColumnSeries.new(this.root, {
            name: "Version Series",
            xAxis: this.xAxis,
            yAxis: this.yAxis,
            valueXField: "close",
            openValueXField: "open",
            valueYField: "publishDate",
            tooltip: am5.Tooltip.new(this.root, {
                labelText: "Version {version}\nPublished: {publishDateFormatted}\nValid: {validityStartFormatted} - {validityEndFormatted}"
            })
        }));

        // Configure column template with basic settings
        this.series.columns.template.setAll({
            height: 20,
        });

        // Set up dynamic coloring adapters that determine color based on valid version
        this.series.columns.template.adapters.add("fill", (fill, target) => {
            const dataItem = target.dataItem;
            if (!dataItem) return am5.color('#aeb7e2');
            const ctx = dataItem.dataContext || {};
            return ctx.version === this._currentValidVersion ? am5.color('#181C56') : am5.color('#aeb7e2');
        });

        this.series.columns.template.adapters.add("stroke", (stroke, target) => {
            const dataItem = target.dataItem;
            if (!dataItem) return am5.color('#aeb7e2');
            const ctx = dataItem.dataContext || {};
            return ctx.version === this._currentValidVersion ? am5.color('#181C56') : am5.color('#aeb7e2');
        });

        console.log(`Series created with valid version: ${this._currentValidVersion}`);
    }

    /**
     * Initialize the purchase date shading module
     */
    initializePurchaseDateShading() {
        this.purchaseDateShading = new PurchaseDateShading(
            this.chart,
            this.xAxis,
            this.yAxis,
            this.purchaseDate,
            (value, live) => {
                this.purchaseDate = value;
                this.updatePurchaseDateForm(new Date(value));
                this.updateResolvedVersionUI();
                if (!live) {
                    console.log('Purchase date updated via drag to', new Date(value).toLocaleDateString());
                }
            }
        );
    }

    /**
     * Initialize the travel date line module
     */
    initializeTravelDateLine() {
        this.travelDateLine = new TravelDateLine(
            this.chart,
            this.xAxis,
            this.yAxis,
            this.travelDate,
            (date, live) => {
                this.travelDate = date;
                this.updateTravelDateForm(new Date(date));
                this.updateResolvedVersionUI();
            }
        );
    }

    /**
     * Get the current purchase date
     */
    getPurchaseDate() {
        return new Date(this.purchaseDate);
    }

    /**
     * Update the purchase date and refresh the visual indicators
     */
    updatePurchaseDate(newDate) {
        this.purchaseDate = newDate.getTime();
        if (this.purchaseDateShading) {
            this.purchaseDateShading.updatePurchaseDate(this.purchaseDate);
        }
        this.updatePurchaseDateForm(newDate);
        this.updateResolvedVersionUI();
        console.log("Purchase date updated to:", newDate.toLocaleDateString());
    }

    /**
     * Get the current travel date
     */
    getTravelDate() {
        return new Date(this.travelDate);
    }

    /**
     * Update the travel date and refresh the visual indicators
     */
    updateTravelDate(newDate) {
        this.travelDate = newDate.getTime();
        if (this.travelDateLine && this.travelDateLine.getTravelDate() !== this.travelDate) {
            this.travelDateLine.updateTravelDate(this.travelDate);
        }
        this.updateResolvedVersionUI();
        console.log("Travel date updated to:", newDate.toLocaleDateString());
    }

    /**
     * Initialize drag and drop functionality
     */
    initializeDragAndDrop() {
        const callbacks = {
            onDragStart: (dataContext) => {
                console.log("ChartManager: Drag started for", dataContext.version);
            },
            onDragging: (dataContext, dates) => {
                // Real-time feedback during dragging (optional logging to avoid spam)
                // console.log("ChartManager: Dragging", dataContext.version, "New dates:", dates);
            },
            onDrop: (versionIndex, chartData, dropInfo) => {
                console.log("=== ChartManager: DROP CALLBACK ===");
                console.log("Version index:", versionIndex);
                console.log("Drag duration:", dropInfo.dragDuration + "ms");
                console.log("Total X movement:", dropInfo.totalMovement + "px");

                // Update form values BEFORE refreshing chart data
                console.log("ChartManager: Updating form values for version", versionIndex);
                this.updateFormValues(versionIndex);

                // Refresh chart data to ensure consistency
                console.log("ChartManager: Refreshing chart data");
                this.setData(this.chartData);
                this.updateResolvedVersionUI();
                console.log("ChartManager: Drop processing complete - form should be updated");
            },
            onDragEnd: (versionIndex, chartData) => {
                // Legacy callback - still supported for backward compatibility
                console.log("ChartManager: Legacy dragEnd callback for version", versionIndex);
            }
        };

        this.dragHandler = new DragAndDropHandler(
            this.chart,
            this.xAxis,
            this.yAxis,
            this.series,
            this.chartData,
            callbacks
        );

        // Enable drag functionality
        this.dragHandler.enable();
    }

    /**
     * Generate sample data for the chart
     */
    generateData() {
        const data = [];
        const startDate = new Date(2025, 8, 23); // Sept 23, 2025
        const endDate = new Date(2026, 8, 23);   // Sept 23, 2026
        const totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
        const versionCount = 4;

        for (let i = 0; i < versionCount; i++) {
            // Publication date spread across the year
            let publishDayOffset = Math.floor(i * totalDays / (versionCount - 1)) + Math.random() * 30 - 15;
            publishDayOffset = Math.max(0, Math.min(publishDayOffset, totalDays - 90));

            const publishDate = new Date(startDate.getTime() + publishDayOffset * 24 * 60 * 60 * 1000);

            // Version start date (must be >= publication date)
            const versionStartOffset = publishDayOffset + Math.random() * 30;
            let versionStart = new Date(startDate.getTime() + versionStartOffset * 24 * 60 * 60 * 1000);

            // Ensure version start is never before publication date
            if (versionStart < publishDate) {
                versionStart = new Date(publishDate.getTime());
            }

            // Version end date (must be > start date)
            const versionDuration = 30 + Math.random() * 90;
            let versionEnd = new Date(versionStart.getTime() + versionDuration * 24 * 60 * 60 * 1000);

            // Ensure we don't exceed chart bounds
            if (versionEnd > endDate) {
                versionEnd = new Date(endDate.getTime());
                if (versionEnd <= versionStart) {
                    versionEnd = new Date(versionStart.getTime() + 24 * 60 * 60 * 1000);
                }
            }

            data.push({
                category: "Version " + (i + 1),
                version: "v" + (i + 1) + ".0",
                open: versionStart.getTime(),
                close: versionEnd.getTime(),
                publishDate: publishDate.getTime(),
                publishDateFormatted: publishDate.toLocaleDateString(),
                validityStartFormatted: versionStart.toLocaleDateString(),
                validityEndFormatted: versionEnd.toLocaleDateString()
            });
        }

        return data;
    }

    /**
     * Set data on axes and series
     */
    setData(data) {
        this.xAxis.data.setAll(data);
        this.series.data.setAll(data);
        if (this.dragHandler) this.dragHandler.updateChartData(data);
    }

    /**
     * Update version data
     */
    updateVersionData(versionIndex, publishDate, startDate, endDate) {
        if (this.chartData.length > versionIndex) {
            this.chartData[versionIndex].publishDate = publishDate.getTime();
            this.chartData[versionIndex].open = startDate.getTime();
            this.chartData[versionIndex].close = endDate.getTime();
            this.chartData[versionIndex].publishDateFormatted = publishDate.toLocaleDateString();
            this.chartData[versionIndex].validityStartFormatted = startDate.toLocaleDateString();
            this.chartData[versionIndex].validityEndFormatted = endDate.toLocaleDateString();

            this.setData(this.chartData);
        }
    }

    /**
     * Update form values (if form module is available)
     */
    updateFormValues(versionIndex) {
        // This will be called by the drag handler
        // Form integration can be added here or handled by a separate module
        const event = new CustomEvent('chartDataChanged', {
            detail: { versionIndex, data: this.chartData[versionIndex] }
        });
        document.dispatchEvent(event);

        // Debugging output
        console.log("ChartManager: Form values updated for version", versionIndex, this.chartData[versionIndex]);
    }

    /**
     * Apply animations to the chart
     */
    applyAnimations() {
        this.series.appear(1000);
        this.chart.appear(1000, 100);
    }

    /**
     * Get current chart data
     */
    getChartData() {
        return this.chartData;
    }

    /**
     * Enable/disable drag functionality
     */
    setDragEnabled(enabled) {
        if (this.dragHandler) {
            if (enabled) {
                this.dragHandler.enable();
            } else {
                this.dragHandler.disable();
            }
        }
    }

    /**
     * Get access to the purchase date shading module for advanced customization
     */
    getPurchaseDateShading() {
        return this.purchaseDateShading;
    }

    /**
     * Dispose of the chart and clean up resources
     */
    dispose() {
        if (this.purchaseDateShading) {
            this.purchaseDateShading.dispose();
        }
        if (this.travelDateLine) {
            this.travelDateLine.dispose();
            this.travelDateLine = null;
        }
        if (this.root) {
            this.root.dispose();
        }
    }

    /**
     * Update the travel date form field
     */
    updateTravelDateForm(newDate) {
        const travelDateInput = document.getElementById('travelDate');
        if (travelDateInput) {
            travelDateInput.value = this.dateToInputFormat(newDate);
        }
    }

    /**
     * Convert date to YYYY-MM-DD format for input fields
     */
    dateToInputFormat(date) {
        return date.toISOString().split('T')[0];
    }

    /**
     * Update the purchase date form field
     */
    updatePurchaseDateForm(newDate) {
        const el = document.getElementById('purchaseDate');
        if (el) el.value = this.dateToInputFormat(newDate);
    }

    /**
     * Update the resolved version display in the UI
     */
    updateResolvedVersionUI() {
        const el = document.getElementById('resolved-version');
        if (!el) return;
        const result = resolveVersion(this.chartData, this.purchaseDate, this.travelDate, { inclusiveEnd: true });
        let header = '';
        if (result.match) {
            const pub = new Date(result.match.publishDate).toLocaleDateString();
            header = `Gyldig versjon: <strong>${result.match.version}</strong> (publisert ${pub})`;
        } else {
            switch (result.reason) {
                case 'NO_AVAILABLE_VERSIONS':
                    header = 'Gyldig versjon: <strong>Ingen</strong> (ingen versjoner publisert ennå)';
                    break;
                case 'NO_VERSION_COVERS_TRAVEL_DATE':
                    header = 'Gyldig versjon: <strong>Ingen</strong> (ingen publisert versjon dekker reisedato)';
                    break;
                default:
                    header = 'Gyldig versjon: <strong>–</strong>';
            }
        }
        const explanationHtml = result.explanation ? `<div style="margin-top:4px;font-size:12px;line-height:1.35;color:#555;">${result.explanation}</div>` : '';
        el.innerHTML = header + explanationHtml;
        this.updateVersionHighlight(result && result.match ? result.match.version : null);
    }

    /**
     * Highlight resolved (valid) version column using adapter-based approach
     */
    updateVersionHighlight(validVersionName) {
        console.log(`updating highlight, valid version: ${validVersionName}, series:`, this.series);
        if (!this.series) return;

        // Update the stored valid version for adapters
        this._currentValidVersion = validVersionName;

        // Force re-evaluation of adapters by refreshing the series data
        const currentData = this.series.data.values;
        this.series.data.setAll([...currentData]);

        console.log(`Highlight updated for valid version: ${validVersionName}`);
    }
}
