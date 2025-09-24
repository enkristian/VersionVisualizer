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

        // Series references
        this.verticalLineSeries = null;
        this.horizontalLineSeries = null;
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
        // Purchase date vertical line
        this.verticalLineSeries = this.chart.series.push(am5xy.LineSeries.new(this.chart.root, {
            name: "Purchase Date Vertical Line",
            xAxis: this.xAxis,
            yAxis: this.yAxis,
            valueXField: "x",
            valueYField: "y",
            stroke: am5.color("#999"),
            strokeWidth: 2,
            strokeDasharray: [5, 5]
        }));

        // Purchase date horizontal line
        this.horizontalLineSeries = this.chart.series.push(am5xy.LineSeries.new(this.chart.root, {
            name: "Purchase Date Horizontal Line",
            xAxis: this.xAxis,
            yAxis: this.yAxis,
            valueXField: "x",
            valueYField: "y",
            stroke: am5.color("#999"),
            strokeWidth: 2,
            strokeDasharray: [5, 5]
        }));
    }

    /**
     * Update all visual elements
     */
    updateVisuals() {
        if (!this.verticalLineSeries || !this.horizontalLineSeries || !this.outdatedAreaSeries) {
            return;
        }

        const xMin = this.xAxis.get("min");
        const xMax = this.xAxis.get("max");
        const yMin = this.yAxis.get("min");
        const yMax = this.yAxis.get("max");

        const verticalLineData = [
            { x: this.purchaseDate, y: yMin },
            { x: this.purchaseDate, y: yMax }
        ];

        const horizontalLineData = [
            { x: xMin, y: this.purchaseDate },
            { x: xMax, y: this.purchaseDate }
        ];

        const outdatedAreaData = [{
            openX: xMin,
            x: this.purchaseDate,
            openY: yMin,
            y: this.purchaseDate
        }];

        this.verticalLineSeries.data.setAll(verticalLineData);
        this.horizontalLineSeries.data.setAll(horizontalLineData);
        this.outdatedAreaSeries.data.setAll(outdatedAreaData);
    }

    /**
     * Update the purchase date and refresh all visuals
     */
    updatePurchaseDate(newPurchaseDate) {
        this.purchaseDate = newPurchaseDate;
        this.updateVisuals();
    }

    /**
     * Show or hide the purchase date indicators
     */
    setVisible(visible) {
        if (this.verticalLineSeries) {
            this.verticalLineSeries.set("visible", visible);
        }
        if (this.horizontalLineSeries) {
            this.horizontalLineSeries.set("visible", visible);
        }
        if (this.outdatedAreaSeries) {
            this.outdatedAreaSeries.set("visible", visible);
        }
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

        if (this.verticalLineSeries) {
            this.verticalLineSeries.set("stroke", color);
        }
        if (this.horizontalLineSeries) {
            this.horizontalLineSeries.set("stroke", color);
        }
        if (this.outdatedAreaSeries) {
            this.outdatedAreaSeries.set("fill", color);
            this.outdatedAreaSeries.set("stroke", color);
        }
    }

    /**
     * Dispose of all series and clean up resources
     */
    dispose() {
        if (this.verticalLineSeries) {
            this.verticalLineSeries.dispose();
        }
        if (this.horizontalLineSeries) {
            this.horizontalLineSeries.dispose();
        }
        if (this.outdatedAreaSeries) {
            this.outdatedAreaSeries.dispose();
        }
    }
}
