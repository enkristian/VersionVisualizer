/**
 * Travel Date Line Module
 * Handles the visual representation and drag functionality for the travel date line
 */

export class TravelDateLine {
    constructor(chart, xAxis, yAxis, travelDate = null, onChange = null) {
        this.chart = chart;
        this.xAxis = xAxis;
        this.yAxis = yAxis;
        this.travelDate = travelDate || new Date(2025, 10, 1).getTime();
        this.onChange = onChange; // callback(date:number, live:boolean)

        // Series references
        this.travelDateLineSeries = null;
        this.hitAreaSeries = null;

        this.initialize();
    }

    /**
     * Initialize the travel date line
     */
    initialize() {
        this.createTravelDateLine();
        this.setupDragging();
        this.updateVisuals();
    }

    /**
     * Create the travel date line visual element with large hitbox
     */
    createTravelDateLine() {
        // Create invisible wide hit area first
        this.hitAreaSeries = this.chart.series.push(am5xy.ColumnSeries.new(this.chart.root, {
            name: "Travel Date Hit Area",
            xAxis: this.xAxis,
            yAxis: this.yAxis,
            valueXField: "close",
            openValueXField: "open",
            valueYField: "high",
            openValueYField: "low",
            // Fully transparent
            fillOpacity: 0,
            strokeOpacity: 0,
            strokeWidth: 0,
            fill: am5.color(0x00000000),
            stroke: am5.color(0x00000000)
        }));

        const hitTemplate = this.hitAreaSeries.columns.template;
        hitTemplate.setAll({
            interactive: true,
            draggable: false,
            cursorOverStyle: "ew-resize",
            fill: am5.color(0x00000000),
            stroke: am5.color(0x00000000),
            fillOpacity: 0,
            strokeOpacity: 0,
            focusable: false
        });
        ["hover", "down", "focus", "active"].forEach(st => {
            hitTemplate.states.create(st, {
                fill: am5.color(0x00000000),
                stroke: am5.color(0x00000000),
                fillOpacity: 0,
                strokeOpacity: 0
            });
        });

        // Create the visible travel date line
        this.travelDateLineSeries = this.chart.series.push(am5xy.LineSeries.new(this.chart.root, {
            name: "Travel Date Line",
            xAxis: this.xAxis,
            yAxis: this.yAxis,
            valueXField: "x",
            valueYField: "y",
            stroke: am5.color("#ff4444"),
            strokeWidth: 3,
            strokeDasharray: [10, 5]
        }));
        this.travelDateLineSeries.strokes.template.set("interactive", false);
    }

    /**
     * Setup dragging: while dragging, travelDate stays at the live center of the hitbox (updated continuously)
     */
    setupDragging() {
        if (!this.hitAreaSeries) return;
        const colTemplate = this.hitAreaSeries.columns.template;
        // Use native amCharts drag
        colTemplate.set("draggable", true);
        colTemplate.set("cursorOverStyle", "ew-resize");

        let axisMin = 0, axisMax = 0, axisSpan = 0, plotW = 1;

        colTemplate.events.on("dragstart", () => {
            axisMin = this.xAxis.get("min");
            axisMax = this.xAxis.get("max");
            axisSpan = axisMax - axisMin;
            plotW = this.chart.plotContainer.width() || 1;
        });

        colTemplate.events.on("dragged", (ev) => {
            if (!ev.point) return;
            const local = this.chart.plotContainer.toLocal(ev.point);
            let xPx = local.x;
            if (xPx < 0) xPx = 0;
            if (xPx > plotW) xPx = plotW;
            const ratio = plotW === 0 ? 0 : xPx / plotW;
            let newDate = axisMin + ratio * axisSpan;
            if (newDate < axisMin) newDate = axisMin;
            if (newDate > axisMax) newDate = axisMax;
            if (newDate === this.travelDate) return;
            this.travelDate = newDate;
            // Only move red line during drag for smoothness; keep hitbox where it started
            this.updateRedLineOnly();
            if (typeof this.onChange === 'function') this.onChange(this.travelDate, true);
        });

        colTemplate.events.on("dragstop", () => {
            // Now recenter hit area around final travel date
            this.updateVisuals();
            if (typeof this.onChange === 'function') this.onChange(this.travelDate, false);
        });
    }

    updateRedLineOnly() {
        if (!this.travelDateLineSeries) return;
        const yMin = this.yAxis.get("min");
        const yMax = this.yAxis.get("max");
        this.travelDateLineSeries.data.setAll([
            { x: this.travelDate, y: yMin },
            { x: this.travelDate, y: yMax }
        ]);
    }

    updateHitAreaOnly() {
        if (!this.hitAreaSeries) return;
        const yMin = this.yAxis.get("min");
        const yMax = this.yAxis.get("max");
        const halfSpanMs = 15 * 24 * 60 * 60 * 1000;
        this.hitAreaSeries.data.setAll([
            { open: this.travelDate - halfSpanMs, close: this.travelDate + halfSpanMs, low: yMin, high: yMax }
        ]);
    }

    /**
     * Update the visual representation of both elements
     */
    updateVisuals() {
        if (!this.travelDateLineSeries || !this.hitAreaSeries) return;

        const yMin = this.yAxis.get("min");
        const yMax = this.yAxis.get("max");

        // Red line
        this.travelDateLineSeries.data.setAll([
            { x: this.travelDate, y: yMin },
            { x: this.travelDate, y: yMax }
        ]);

        // Hit area (recenter around new travelDate)
        const halfSpanMs = 7 * 24 * 60 * 60 * 1000;
        this.hitAreaSeries.data.setAll([
            { open: this.travelDate - halfSpanMs, close: this.travelDate + halfSpanMs, low: yMin, high: yMax }
        ]);
    }

    /**
     * Update the travel date and refresh visuals
     */
    updateTravelDate(newTravelDate) {
        this.travelDate = newTravelDate;
        this.updateVisuals();
    }

    /**
     * Get the current travel date
     */
    getTravelDate() {
        return this.travelDate;
    }

    /**
     * Dispose of the travel date line and clean up resources
     */
    dispose() {
        if (this.travelDateLineSeries) {
            this.travelDateLineSeries.dispose();
            this.travelDateLineSeries = null;
        }
        if (this.hitAreaSeries) {
            this.hitAreaSeries.dispose();
            this.hitAreaSeries = null;
        }
    }
}
