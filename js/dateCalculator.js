/**
 * Date Calculator Module
 * Handles date calculations and conversions for drag and drop operations
 */

export class DateCalculator {
    constructor(xAxis) {
        this.xAxis = xAxis;
    }

    /**
     * Convert X position to date using axis interpolation
     * @param {number} xPosition - The X position on the chart
     * @returns {Date} The calculated date
     */
    positionToDate(xPosition) {
        // Use axis min/max interpolation for accurate date conversion
        const axisMin = this.xAxis.get("min"); // Should be Sept 23, 2025 timestamp
        const axisMax = this.xAxis.get("max"); // Should be Sept 23, 2026 timestamp
        const axisRange = axisMax - axisMin;

        // Use simple axis width approach - more reliable than chart access
        const axisWidth = this.xAxis.width();

        // Calculate position ratio directly
        const positionRatio = Math.max(0, Math.min(1, xPosition / axisWidth));

        // Interpolate to get the timestamp
        const newTimestamp = axisMin + (axisRange * positionRatio);
        const newDate = new Date(newTimestamp);

        console.log("Position to date conversion:", {
            xPosition: xPosition,
            axisMin: axisMin,
            axisMax: axisMax,
            axisMinDate: new Date(axisMin).toLocaleDateString(),
            axisMaxDate: new Date(axisMax).toLocaleDateString(),
            axisWidth: axisWidth,
            positionRatio: positionRatio,
            newTimestamp: newTimestamp,
            resultDate: newDate.toLocaleDateString()
        });

        return newDate;
    }

    /**
     * Calculate date shift based on original data and new position
     * @param {Object} originalData - Original date data (open, close, publishDate)
     * @param {Date} newMidpointDate - New midpoint date from position
     * @returns {Object} Shift calculation results
     */
    calculateDateShift(originalData, newMidpointDate) {
        const originalStart = new Date(originalData.open);
        const originalEnd = new Date(originalData.close);
        const originalDuration = originalEnd.getTime() - originalStart.getTime();
        const originalMidpoint = originalStart.getTime() + (originalDuration / 2);

        const newMidpoint = newMidpointDate.getTime();
        const shift = newMidpoint - originalMidpoint;

        console.log("Date shift calculation:", {
            originalMidpoint: new Date(originalMidpoint).toLocaleDateString(),
            newMidpoint: new Date(newMidpoint).toLocaleDateString(),
            shift: Math.round(shift / (1000 * 60 * 60 * 24)) + " days"
        });

        return {
            shift: shift,
            originalStart: originalStart,
            originalEnd: originalEnd,
            originalDuration: originalDuration,
            originalMidpoint: originalMidpoint,
            newMidpoint: newMidpoint
        };
    }

    /**
     * Apply shift to dates and validate constraints
     * @param {Object} shiftData - Result from calculateDateShift
     * @param {number} publishDateTimestamp - Publish date timestamp
     * @returns {Object} Final calculated dates
     */
    applyShiftAndValidate(shiftData, publishDateTimestamp) {
        const { shift, originalStart, originalEnd } = shiftData;

        // Apply shift to create new dates
        let finalStartDate = new Date(originalStart.getTime() + shift);
        let finalEndDate = new Date(originalEnd.getTime() + shift);
        const publishDate = new Date(publishDateTimestamp);

        // Final validation: start date cannot be before publish date
        if (finalStartDate < publishDate) {
            const adjustment = publishDate.getTime() - finalStartDate.getTime();
            finalStartDate = new Date(publishDate.getTime());
            finalEndDate = new Date(finalEndDate.getTime() + adjustment);
            console.log("Date validation: Adjusted dates to respect publish date constraint");
        }

        console.log("Final calculated dates:", {
            start: finalStartDate.toLocaleDateString(),
            end: finalEndDate.toLocaleDateString(),
            duration: Math.round((finalEndDate.getTime() - finalStartDate.getTime()) / (1000 * 60 * 60 * 24)) + " days"
        });

        return {
            startDate: finalStartDate,
            endDate: finalEndDate,
            startTimestamp: finalStartDate.getTime(),
            endTimestamp: finalEndDate.getTime(),
            publishDate: publishDate,
            wasAdjusted: finalStartDate.getTime() === publishDate.getTime()
        };
    }

    /**
     * Complete date calculation workflow for drop operations
     * @param {number} finalXPosition - Final X position after drop
     * @param {Object} originalData - Original date data (open, close, publishDate)
     * @returns {Object} Complete calculation results
     */
    calculateDropDates(finalXPosition, originalData) {
        console.log("=== DATE CALCULATION WORKFLOW ===");
        console.log("Original data:", {
            start: new Date(originalData.open).toLocaleDateString(),
            end: new Date(originalData.close).toLocaleDateString(),
            published: new Date(originalData.publishDate).toLocaleDateString()
        });

        // Step 1: Convert position to date
        const newMidpointDate = this.positionToDate(finalXPosition);

        // Step 2: Calculate shift
        const shiftData = this.calculateDateShift(originalData, newMidpointDate);

        // Step 3: Apply shift and validate
        const finalDates = this.applyShiftAndValidate(shiftData, originalData.publishDate);

        // Log changes
        console.log("Date changes from original:", {
            startChanged: finalDates.startTimestamp !== originalData.open,
            endChanged: finalDates.endTimestamp !== originalData.close,
            startShift: Math.round((finalDates.startTimestamp - originalData.open) / (1000 * 60 * 60 * 24)) + " days",
            endShift: Math.round((finalDates.endTimestamp - originalData.close) / (1000 * 60 * 60 * 24)) + " days"
        });

        console.log("=== DATE CALCULATION COMPLETE ===");

        return {
            ...finalDates,
            originalData: originalData,
            shiftData: shiftData
        };
    }

    /**
     * Get formatted date strings for display
     * @param {Object} dateResult - Result from calculateDropDates
     * @returns {Object} Formatted date strings
     */
    getFormattedDates(dateResult) {
        return {
            validityStartFormatted: dateResult.startDate.toLocaleDateString(),
            validityEndFormatted: dateResult.endDate.toLocaleDateString(),
            publishDateFormatted: dateResult.publishDate.toLocaleDateString()
        };
    }

    /**
     * Get actual start and end X positions directly from the column
     * @param {Object} target - The dragged column target
     * @returns {Object} Object with startX and endX positions
     */
    getActualColumnPositions(target) {
        // Try to get the actual rendered positions directly from the column
        const columnX = target.x();
        const columnWidth = target.width();

        // In amCharts 5, columns have actual left and right coordinates
        // Try to access the actual rendered bounds
        let startX, endX;

        try {
            // Method 1: Try to get from the column's bounds
            const bounds = target.localBounds();
            if (bounds) {
                startX = columnX + bounds.left;
                endX = columnX + bounds.right;
                console.log("Got positions from bounds:", { startX, endX, bounds });
            }
        } catch (e) {
            console.log("Bounds method failed:", e);
        }

        if (startX === undefined || endX === undefined) {
            try {
                // Method 2: Try to get from the graphics or display object
                const graphics = target.get("graphics");
                if (graphics) {
                    const graphicsBounds = graphics.localBounds();
                    if (graphicsBounds) {
                        startX = columnX + graphicsBounds.left;
                        endX = columnX + graphicsBounds.right;
                        console.log("Got positions from graphics bounds:", { startX, endX, graphicsBounds });
                    }
                }
            } catch (e) {
                console.log("Graphics bounds method failed:", e);
            }
        }

        if (startX === undefined || endX === undefined) {
            // Method 3: Try to access the data item's value positions directly
            try {
                const dataItem = target.dataItem;
                if (dataItem) {
                    // Try to get the actual X positions for open and close values
                    const openX = this.xAxis.valueToPosition(dataItem.get("openValueX"));
                    const closeX = this.xAxis.valueToPosition(dataItem.get("valueX"));

                    if (openX !== undefined && closeX !== undefined) {
                        // Convert position (0-1) to actual pixel coordinates
                        const axisWidth = this.xAxis.width();
                        startX = openX * axisWidth;
                        endX = closeX * axisWidth;
                        console.log("Got positions from data values:", {
                            openX, closeX, startX, endX,
                            openValue: dataItem.get("openValueX"),
                            closeValue: dataItem.get("valueX")
                        });
                    }
                }
            } catch (e) {
                console.log("Data value method failed:", e);
            }
        }

        if (startX === undefined || endX === undefined) {
            // Fallback: Use center and width (what we were doing before)
            startX = columnX - (columnWidth / 2);
            endX = columnX + (columnWidth / 2);
            console.log("Using fallback calculation:", { columnX, columnWidth, startX, endX });
        }

        console.log("Final column positions:", { startX, endX, method: startX !== columnX - (columnWidth / 2) ? "direct" : "calculated" });

        return { startX, endX };
    }

    /**
     * Calculate precise start and end dates using actual column positions
     * @param {Object} target - The dragged column target
     * @param {Object} originalData - Original date data (open, close, publishDate)
     * @returns {Object} Complete calculation results with precise start/end positions
     */
    calculatePreciseDropDates(target, originalData) {
        console.log("=== PRECISE DATE CALCULATION WORKFLOW ===");
        console.log("Original data:", {
            start: new Date(originalData.open).toLocaleDateString(),
            end: new Date(originalData.close).toLocaleDateString(),
            published: new Date(originalData.publishDate).toLocaleDateString()
        });

        // Get the actual start and end X positions directly from the column
        const { startX, endX } = this.getActualColumnPositions(target);

        console.log("Actual column positions:", {
            startX: startX,
            endX: endX
        });

        // Convert start and end positions to dates directly
        const newStartDate = this.positionToDate(startX);
        const newEndDate = this.positionToDate(endX);

        // Updated logic: If start date is before publish date, update publish date instead of constraining start date
        let publishDate = new Date(originalData.publishDate);
        let finalStartDate = newStartDate;
        let finalEndDate = newEndDate;
        let publishDateWasUpdated = false;

        if (finalStartDate < publishDate) {
            // Set publish date to the new start date instead of constraining the start date
            publishDate = new Date(finalStartDate.getTime());
            publishDateWasUpdated = true;
            console.log("Date validation: Updated publish date to match new start date (allowing earlier validity periods)");
            console.log("New publish date:", publishDate.toLocaleDateString());
        }

        console.log("Final calculated dates:", {
            start: finalStartDate.toLocaleDateString(),
            end: finalEndDate.toLocaleDateString(),
            published: publishDate.toLocaleDateString(),
            publishDateUpdated: publishDateWasUpdated,
            duration: Math.round((finalEndDate.getTime() - finalStartDate.getTime()) / (1000 * 60 * 60 * 24)) + " days"
        });

        // Log changes from original
        console.log("Date changes from original:", {
            startChanged: finalStartDate.getTime() !== originalData.open,
            endChanged: finalEndDate.getTime() !== originalData.close,
            publishChanged: publishDate.getTime() !== originalData.publishDate,
            startShift: Math.round((finalStartDate.getTime() - originalData.open) / (1000 * 60 * 60 * 24)) + " days",
            endShift: Math.round((finalEndDate.getTime() - originalData.close) / (1000 * 60 * 60 * 24)) + " days",
            publishShift: Math.round((publishDate.getTime() - originalData.publishDate) / (1000 * 60 * 60 * 24)) + " days"
        });

        console.log("=== PRECISE DATE CALCULATION COMPLETE ===");

        return {
            startDate: finalStartDate,
            endDate: finalEndDate,
            publishDate: publishDate,
            startTimestamp: finalStartDate.getTime(),
            endTimestamp: finalEndDate.getTime(),
            publishTimestamp: publishDate.getTime(),
            originalData: originalData,
            wasAdjusted: publishDateWasUpdated,
            publishDateWasUpdated: publishDateWasUpdated,
            actualStartX: startX,
            actualEndX: endX
        };
    }
}
