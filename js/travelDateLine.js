/**
 * Travel Date Line Module (wrapper)
 * Now delegates to generic InteractiveDateLine with axisMode 'x'.
 */
import { InteractiveDateLine } from './interactiveDateLine.js';

export class TravelDateLine {
    constructor(chart, xAxis, yAxis, travelDate = null, onChange = null, color = '#ff4444') {
        this.chart = chart;
        this.xAxis = xAxis;
        this.yAxis = yAxis;
        this.travelDate = travelDate || new Date(2025, 10, 1).getTime();
        this.onChange = onChange;
        this.color = color;

        this.interactiveLine = new InteractiveDateLine(chart, xAxis, yAxis, {
            value: this.travelDate,
            axisMode: 'x',
            color: this.color,
            onChange: (val, live) => {
                this.travelDate = val;
                if (typeof this.onChange === 'function') this.onChange(val, live);
            }
        });
    }

    updateTravelDate(newTravelDate) {
        this.travelDate = newTravelDate;
        this.interactiveLine.updateValue(newTravelDate);
    }

    getTravelDate() {
        return this.travelDate;
    }

    dispose() {
        if (this.interactiveLine) {
            this.interactiveLine.dispose();
            this.interactiveLine = null;
        }
    }
}
