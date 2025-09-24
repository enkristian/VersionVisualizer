import { InteractiveDateLine } from './interactiveDateLine.js';
/**
 * Purchase Date Shading Module
 * Handles the visual indicators for purchase date including cross-hair lines and outdated area shading
 */

export class PurchaseDateShading {
    constructor(chart, xAxis, yAxis, purchaseDate) {
        this.chart = chart;
        this.xAxis = xAxis;
        this.yAxis = yAxis;
        this.purchaseDate = purchaseDate;
        // Deprecated individual line series now replaced by generic interactive line
        this.purchaseDateLine = null; // InteractiveDateLine instance (crosshair)
        this.outdatedAreaSeries = null;

        this.initialize();
    }

    /**
     * Initialize all visual elements for purchase date indicators
     */
    initialize() {
        this.createOutdatedAreaBackground();
        this.createPurchaseDateLines();
        this.updateVisuals();
    }

    /**
     * Create the grey shaded background for outdated area
     */
    createOutdatedAreaBackground() {
        this.outdatedAreaSeries = this.chart.series.push(am5xy.ColumnSeries.new(this.chart.root, {
            name: "Outdated Area",
            xAxis: this.xAxis,
            yAxis: this.yAxis,
            valueXField: "x",
            openValueXField: "openX",
            valueYField: "y",
            openValueYField: "openY",
            fill: am5.color("#aaa"),
            fillOpacity: 0.25,
            stroke: am5.color("#999"),
            strokeOpacity: 0.4,
            strokeWidth: 1,
            strokeDasharray: [4, 2]
        }));

        this.outdatedAreaSeries.set("forceHidden", false);
        this.outdatedAreaSeries.columns.template.set("interactive", false);
        this.outdatedAreaSeries.set("layer", -1);
    }

    /**
     * Create the cross-hair lines for purchase date only
     */
    createPurchaseDateLines() {
        // Replace two separate series with one InteractiveDateLine crosshair
        this.purchaseDateLine = new InteractiveDateLine(this.chart, this.xAxis, this.yAxis, {
            value: this.purchaseDate,
            axisMode: 'x', // changed from 'both' to allow horizontal drag only
            color: '#999',
            onChange: (val, live) => {
                this.purchaseDate = val;
                if (!live) {
                    this.updateVisuals();
                } else if (this.outdatedAreaSeries) {
                    this._updateOutdatedAreaOnly();
                }
            }
        });
    }

    /**
     * Update all visual elements
     */
    updateVisuals() {
        if (!this.outdatedAreaSeries) return;
        if (this.purchaseDateLine) this.purchaseDateLine.updateVisuals();
        this._updateOutdatedAreaOnly();
    }

    // Helper to update only outdated shading using current purchaseDate
    _updateOutdatedAreaOnly() {
        const xMin = this.xAxis.get('min');
        const yMin = this.yAxis.get('min');
        const yMax = this.yAxis.get('max');
        // Shaded area: from left boundary to purchase date (both axes using purchaseDate like before)
        this.outdatedAreaSeries.data.setAll([{ openX: xMin, x: this.purchaseDate, openY: yMin, y: this.purchaseDate }]);
    }

    /**
     * Update the purchase date and refresh all visuals
     */
    updatePurchaseDate(newPurchaseDate) {
        this.purchaseDate = newPurchaseDate;
        if (this.purchaseDateLine) this.purchaseDateLine.updateValue(newPurchaseDate);
        this.updateVisuals();
    }

    /**
     * Show or hide the purchase date indicators
     */
    setVisible(visible) {
        if (this.outdatedAreaSeries) this.outdatedAreaSeries.set('visible', visible);
        if (this.purchaseDateLine) this.purchaseDateLine.setVisible(visible);
    }

    /**
     * Set the opacity of the outdated area shading
     */
    setOutdatedAreaOpacity(opacity) {
        if (this.outdatedAreaSeries) {
            this.outdatedAreaSeries.set("fillOpacity", opacity);
        }
    }

    /**
     * Set the color of the purchase date indicators
     */
    setColor(colorHex) {
        const color = am5.color(colorHex);

        if (this.outdatedAreaSeries) {
            this.outdatedAreaSeries.set('fill', color);
            this.outdatedAreaSeries.set('stroke', color);
        }
        if (this.purchaseDateLine) this.purchaseDateLine.setColor(colorHex);
    }

    /**
     * Dispose of all series and clean up resources
     */
    dispose() {
        if (this.outdatedAreaSeries) this.outdatedAreaSeries.dispose();
        if (this.purchaseDateLine) this.purchaseDateLine.dispose();
    }
}
