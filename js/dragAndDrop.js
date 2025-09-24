/**
 * Drag and Drop Module for Chart Columns
 * Handles horizontal dragging to update validity periods with proper drop events
 */

import { DateCalculator } from './dateCalculator.js';

export class DragAndDropHandler {
    constructor(chart, xAxis, yAxis, series, chartData, callbacks) {
        this.chart = chart;
        this.xAxis = xAxis;
        this.yAxis = yAxis;
        this.series = series;
        this.chartData = chartData;
        this.callbacks = callbacks;
        this.dragState = {};
        this.isEnabled = false;
        this.dateCalculator = new DateCalculator(xAxis);
    }

    /**
     * Enable drag and drop functionality
     */
    enable() {
        if (this.isEnabled) return;

        console.log("Enabling drag and drop functionality");

        // Make columns draggable
        this.series.columns.template.set("draggable", true);
        this.series.columns.template.set("cursorOverStyle", "grab");

        // Set up event handlers using amCharts 5 native events
        this.setupEventHandlers();

        this.isEnabled = true;
    }

    /**
     * Disable drag and drop functionality
     */
    disable() {
        if (!this.isEnabled) return;

        console.log("Disabling drag and drop functionality");

        // Make columns non-draggable
        this.series.columns.template.set("draggable", false);
        this.series.columns.template.set("cursorOverStyle", "default");

        this.isEnabled = false;
    }

    /**
     * Set up drag event handlers using amCharts 5 events
     */
    setupEventHandlers() {
        // Use amCharts 5 drag events - these are specifically designed for drag operations

        // Handle drag start
        this.series.columns.template.events.on("dragstart", (ev) => {
            this.handleDragStart(ev);
        });

        // Handle dragging movement
        this.series.columns.template.events.on("drag", (ev) => {
            this.handleDragging(ev);
        });

        // Handle drag stop (drop) - this is the main drop event
        this.series.columns.template.events.on("dragstop", (ev) => {
            this.handleDrop(ev);
        });

        // Also listen for position changes to constrain Y-axis
        this.series.columns.template.on("x", () => {
            this.constrainYAxis();
        });

        this.series.columns.template.on("y", () => {
            this.constrainYAxis();
        });
    }

    /**
     * Handle drag start event
     */
    handleDragStart(ev) {
        const target = ev.target;
        const dataItem = target.dataItem;

        console.log("=== DRAG START ===");
        console.log("Version:", dataItem.dataContext.version);
        console.log("Initial position:", { x: target.x(), y: target.y() });
        console.log("Initial dates:", {
            start: new Date(dataItem.dataContext.open).toLocaleDateString(),
            end: new Date(dataItem.dataContext.close).toLocaleDateString(),
            published: new Date(dataItem.dataContext.publishDate).toLocaleDateString()
        });

        // Store initial drag state
        this.dragState = {
            target: target,
            dataItem: dataItem,
            originalY: target.y(),
            originalX: target.x(),
            originalData: {
                open: dataItem.dataContext.open,
                close: dataItem.dataContext.close,
                publishDate: dataItem.dataContext.publishDate
            },
            dragStartTime: Date.now()
        };

        // Callback for drag start
        if (this.callbacks.onDragStart) {
            this.callbacks.onDragStart(dataItem.dataContext);
        }
    }

    /**
     * Handle dragging movement
     */
    handleDragging(ev) {
        if (!this.dragState.target) return;

        const target = ev.target;
        const dataItem = target.dataItem;

        // Lock Y position to prevent vertical movement
        if (target.y() !== this.dragState.originalY) {
            target.set("y", this.dragState.originalY);
        }

        // Get current X position and calculate new validity period
        const currentX = target.x();
        const deltaX = currentX - this.dragState.originalX;

        // Only process if there's significant movement to avoid excessive logging
        if (Math.abs(deltaX) > 1) {
            // Use DateCalculator for consistent date calculations during dragging
            const newMidpointDate = this.dateCalculator.positionToDate(currentX);
            const shiftData = this.dateCalculator.calculateDateShift(this.dragState.originalData, newMidpointDate);
            const dragResult = this.dateCalculator.applyShiftAndValidate(shiftData, this.dragState.originalData.publishDate);

            // Update the data context directly for real-time feedback
            dataItem.dataContext.open = dragResult.startTimestamp;
            dataItem.dataContext.close = dragResult.endTimestamp;
            dataItem.dataContext.validityStartFormatted = dragResult.startDate.toLocaleDateString();
            dataItem.dataContext.validityEndFormatted = dragResult.endDate.toLocaleDateString();

            // Callback for drag movement
            if (this.callbacks.onDragging) {
                this.callbacks.onDragging(dataItem.dataContext, {
                    startDate: dragResult.startDate,
                    endDate: dragResult.endDate,
                    publishDate: dragResult.publishDate,
                    deltaX: deltaX
                });
            }
        }
    }

    /**
     * Handle drop event (drag stop) - Main drop event with detailed logging
     */
    handleDrop(ev) {
        if (!this.dragState.target) return;

        const target = ev.target;
        const dataItem = target.dataItem;
        const dragDuration = Date.now() - this.dragState.dragStartTime;
        const finalX = target.x();
        const totalDeltaX = finalX - this.dragState.originalX;

        console.log("=== DROP EVENT ===");
        console.log("Version:", dataItem.dataContext.version);
        console.log("Drop position:", { x: finalX, y: target.y() });
        console.log("Total movement:", { deltaX: totalDeltaX, deltaY: target.y() - this.dragState.originalY });
        console.log("Drag duration:", dragDuration + "ms");

        // Use DateCalculator's precise method that gets actual start/end positions directly
        const dateResult = this.dateCalculator.calculatePreciseDropDates(target, this.dragState.originalData);
        const formattedDates = this.dateCalculator.getFormattedDates(dateResult);

        // Update dataItem.dataContext with calculated values (including potentially updated publish date)
        dataItem.dataContext.open = dateResult.startTimestamp;
        dataItem.dataContext.close = dateResult.endTimestamp;
        dataItem.dataContext.publishDate = dateResult.publishTimestamp; // Include updated publish date
        dataItem.dataContext.validityStartFormatted = formattedDates.validityStartFormatted;
        dataItem.dataContext.validityEndFormatted = formattedDates.validityEndFormatted;
        dataItem.dataContext.publishDateFormatted = formattedDates.publishDateFormatted; // Include formatted publish date

        // Find version index and update global chart data
        const versionIndex = this.series.dataItems.indexOf(dataItem);

        if (versionIndex >= 0 && this.chartData[versionIndex]) {
            // Use the original data from drag start for true "before" state
            const oldData = {
                open: this.dragState.originalData.open,
                close: this.dragState.originalData.close,
                publishDate: this.dragState.originalData.publishDate,
                validityStartFormatted: new Date(this.dragState.originalData.open).toLocaleDateString(),
                validityEndFormatted: new Date(this.dragState.originalData.close).toLocaleDateString(),
                publishDateFormatted: new Date(this.dragState.originalData.publishDate).toLocaleDateString()
            };

            // Update global chart data with the calculated values (including updated publish date)
            this.chartData[versionIndex].open = dateResult.startTimestamp;
            this.chartData[versionIndex].close = dateResult.endTimestamp;
            this.chartData[versionIndex].publishDate = dateResult.publishTimestamp; // Update publish date in chart data
            this.chartData[versionIndex].validityStartFormatted = formattedDates.validityStartFormatted;
            this.chartData[versionIndex].validityEndFormatted = formattedDates.validityEndFormatted;
            this.chartData[versionIndex].publishDateFormatted = formattedDates.publishDateFormatted; // Update formatted publish date

            console.log("Chart data updated for version index:", versionIndex);
            console.log("Data comparison (BEFORE vs AFTER):", {
                before: {
                    start: new Date(oldData.open).toLocaleDateString(),
                    end: new Date(oldData.close).toLocaleDateString(),
                    published: new Date(oldData.publishDate).toLocaleDateString()
                },
                after: {
                    start: new Date(this.chartData[versionIndex].open).toLocaleDateString(),
                    end: new Date(this.chartData[versionIndex].close).toLocaleDateString(),
                    published: new Date(this.chartData[versionIndex].publishDate).toLocaleDateString()
                }
            });

            if (dateResult.publishDateWasUpdated) {
                console.log("📅 PUBLISH DATE WAS UPDATED: Moved from",
                    new Date(oldData.publishDate).toLocaleDateString(),
                    "to",
                    new Date(this.chartData[versionIndex].publishDate).toLocaleDateString());
            }

            // DON'T refresh the chart here - let the ChartManager handle it
            console.log("Chart data updated, leaving visual refresh to ChartManager");

            // Callback for drop end with proper before/after data
            if (this.callbacks.onDrop) {
                this.callbacks.onDrop(versionIndex, this.chartData[versionIndex], {
                    oldData: oldData,  // True original data from drag start
                    newData: this.chartData[versionIndex],  // Updated data after drop
                    dragDuration: dragDuration,
                    totalMovement: totalDeltaX,
                    target: target
                });
            }

            // Legacy callback for backward compatibility
            if (this.callbacks.onDragEnd) {
                this.callbacks.onDragEnd(versionIndex, this.chartData[versionIndex]);
            }
        }

        console.log("=== DROP COMPLETE - Validity Period Updated ===");

        // Clear drag state
        this.dragState = {};
    }

    constrainYAxis() {
        if (this.dragState.target && this.dragState.originalY !== undefined) {
            const target = this.dragState.target;
            if (target.y() !== this.dragState.originalY) {
                target.set("y", this.dragState.originalY);
            }
        }
    }

    /**
     * Update chart data reference (for when chart data changes externally)
     */
    updateChartData(newChartData) {
        this.chartData = newChartData;
        console.log("Chart data reference updated, new length:", newChartData.length);
    }

    /**
     * Get current drag state (useful for debugging)
     */
    getDragState() {
        return this.dragState;
    }

    /**
     * Check if currently dragging
     */
    isDragging() {
        return Object.keys(this.dragState).length > 0;
    }
}
