/**
 * InteractiveDateLine
 * Generic interactive date-based line (vertical, horizontal, or crosshair) with drag support.
 * Params:
 *  chart, xAxis, yAxis, options {
 *    value: number (timestamp in ms),
 *    axisMode: 'x' | 'y' | 'both',
 *    color: hex string,
 *    onChange?: (newValue:number, live:boolean) => void
 *  }
 *
 * For axisMode:
 *  'x' => vertical line at x=value across full y range (draggable horizontally)
 *  'y' => horizontal line at y=value across full x range (draggable vertically)
 *  'both' => crosshair (two lines) sharing same timestamp value on both axes; dragging moves along x only (can be extended)
 */
export class InteractiveDateLine {
  constructor(chart, xAxis, yAxis, { value, axisMode = 'x', color = '#ff4444', onChange = null } = {}) {
    this.chart = chart;
    this.xAxis = xAxis;
    this.yAxis = yAxis;
    this.value = value ?? Date.now();
    this.axisMode = axisMode; // 'x' | 'y' | 'both'
    this.color = color;
    this.onChange = onChange;

    // Series / sprites
    this.verticalSeries = null;   // LineSeries when axisMode includes 'x'
    this.horizontalSeries = null; // LineSeries when axisMode includes 'y'
    this.verticalHit = null;      // ColumnSeries used as wide hitbox for vertical drag
    this.horizontalHit = null;    // ColumnSeries used as wide hitbox for horizontal drag (optional)

    this.initialize();
  }

  initialize() {
    if (this.axisMode === 'x' || this.axisMode === 'both') {
      this._createVertical();
    }
    if (this.axisMode === 'y' || this.axisMode === 'both') {
      this._createHorizontal();
    }
    this.updateVisuals();
  }

  _createVertical() {
    // Hit area for vertical line (invisible wide column)
    this.verticalHit = this.chart.series.push(am5xy.ColumnSeries.new(this.chart.root, {
      name: 'Vertical Line Hit',
      xAxis: this.xAxis,
      yAxis: this.yAxis,
      valueXField: 'close',
      openValueXField: 'open',
      valueYField: 'high',
      openValueYField: 'low',
      fillOpacity: 0,
      strokeOpacity: 0,
      strokeWidth: 0
    }));
    const tmpl = this.verticalHit.columns.template;
    tmpl.setAll({ interactive: true, draggable: true, cursorOverStyle: 'ew-resize', fillOpacity: 0, strokeOpacity: 0 });

    this.verticalSeries = this.chart.series.push(am5xy.LineSeries.new(this.chart.root, {
      name: 'Vertical Line',
      xAxis: this.xAxis,
      yAxis: this.yAxis,
      valueXField: 'x',
      valueYField: 'y',
      stroke: am5.color(this.color),
      strokeWidth: 3,
      strokeDasharray: [10, 5]
    }));
    this.verticalSeries.strokes.template.set('interactive', false);

    let axisMin = 0, axisMax = 0, axisSpan = 0, plotW = 1;
    let isDraggingVertical = false; // Flag to prevent interference

    tmpl.events.on('dragstart', () => {
      isDraggingVertical = true;
      axisMin = this.xAxis.get('min');
      axisMax = this.xAxis.get('max');
      axisSpan = axisMax - axisMin;
      plotW = this.chart.plotContainer.width() || 1;
    });

    tmpl.events.on('dragged', (ev) => {
      if (!ev.point || !isDraggingVertical) return;
      const local = this.chart.plotContainer.toLocal(ev.point);
      let xPx = local.x;
      if (xPx < 0) xPx = 0; if (xPx > plotW) xPx = plotW;
      const ratio = plotW === 0 ? 0 : xPx / plotW;
      let newDate = axisMin + ratio * axisSpan;
      if (newDate < axisMin) newDate = axisMin;
      if (newDate > axisMax) newDate = axisMax;
      if (newDate === this.value) return;

      this.value = newDate;
      // Only update vertical line during vertical drag
      this._updateVerticalLineOnly();
      // Also update horizontal line to follow but don't trigger horizontal drag
      if (this.horizontalSeries) {
        this._updateHorizontalLineOnly();
      }
      if (typeof this.onChange === 'function') this.onChange(this.value, true);
    });

    tmpl.events.on('dragstop', () => {
      isDraggingVertical = false;
      this.updateVisuals();
      if (typeof this.onChange === 'function') this.onChange(this.value, false);
    });
  }

  _createHorizontal() {
    // Hit area for horizontal line: use a dedicated ColumnSeries spanning x range (thin vertical thickness but full width) by mapping Y open/close
    this.horizontalHit = this.chart.series.push(am5xy.ColumnSeries.new(this.chart.root, {
      name: 'Horizontal Line Hit',
      xAxis: this.xAxis,
      yAxis: this.yAxis,
      valueYField: 'closeY',
      openValueYField: 'openY',
      valueXField: 'x',
      openValueXField: 'openX',
      fillOpacity: 0,
      strokeOpacity: 0,
      strokeWidth: 0
    }));
    const htmpl = this.horizontalHit.columns.template;
    htmpl.setAll({ interactive: true, draggable: true, cursorOverStyle: 'ns-resize', fillOpacity: 0, strokeOpacity: 0 });

    this.horizontalSeries = this.chart.series.push(am5xy.LineSeries.new(this.chart.root, {
      name: 'Horizontal Line',
      xAxis: this.xAxis,
      yAxis: this.yAxis,
      valueXField: 'x',
      valueYField: 'y',
      stroke: am5.color(this.color),
      strokeWidth: 3,
      strokeDasharray: [10, 5]
    }));
    this.horizontalSeries.strokes.template.set('interactive', false);

    let yMin = 0, yMax = 0, ySpan = 0, plotH = 1;
    htmpl.events.on('dragstart', () => {
      yMin = this.yAxis.get('min');
      yMax = this.yAxis.get('max');
      ySpan = yMax - yMin;
      plotH = this.chart.plotContainer.height() || 1;
    });
    htmpl.events.on('dragged', (ev) => {
      if (!ev.point) return;
      const local = this.chart.plotContainer.toLocal(ev.point);
      let yPx = local.y;
      if (yPx < 0) yPx = 0; if (yPx > plotH) yPx = plotH;
      // Invert the ratio so dragging up increases date values (future), dragging down decreases (past)
      const ratio = plotH === 0 ? 0 : (plotH - yPx) / plotH; // bottom->top (inverted)
      let newDate = yMin + ratio * ySpan;
      if (newDate < yMin) newDate = yMin;
      if (newDate > yMax) newDate = yMax;
      if (newDate === this.value) return;
      this.value = newDate;
      this._updateHorizontalLineOnly();
      // Also update vertical line to follow but don't trigger vertical drag
      if (this.verticalSeries) {
        this._updateVerticalLineOnly();
      }
      if (typeof this.onChange === 'function') this.onChange(this.value, true);
    });
    htmpl.events.on('dragstop', () => {
      this.updateVisuals();
      if (typeof this.onChange === 'function') this.onChange(this.value, false);
    });
  }

  _updateVerticalLineOnly() {
    if (!this.verticalSeries) return;
    const yMin = this.yAxis.get('min');
    const yMax = this.yAxis.get('max');
    this.verticalSeries.data.setAll([
      { x: this.value, y: yMin },
      { x: this.value, y: yMax }
    ]);
  }

  _updateHorizontalLineOnly() {
    if (!this.horizontalSeries) return;
    const xMin = this.xAxis.get('min');
    const xMax = this.xAxis.get('max');
    this.horizontalSeries.data.setAll([
      { x: xMin, y: this.value },
      { x: xMax, y: this.value }
    ]);
  }

  updateVisuals() {
    if (this.verticalSeries && this.verticalHit) {
      this._updateVerticalLineOnly();
      // Recenter hit area around new value (width span e.g., +/- 7 days)
      const halfSpanMs = 7 * 24 * 60 * 60 * 1000;
      const yMin = this.yAxis.get('min');
      const yMax = this.yAxis.get('max');
      this.verticalHit.data.setAll([
        { open: this.value - halfSpanMs, close: this.value + halfSpanMs, low: yMin, high: yMax }
      ]);
    }
    if (this.horizontalSeries && this.horizontalHit) {
      this._updateHorizontalLineOnly();
      // Recenter horizontal hit area (thickness window vertically)
      const halfSpanMs = 7 * 24 * 60 * 60 * 1000;
      const xMin = this.xAxis.get('min');
      const xMax = this.xAxis.get('max');
      this.horizontalHit.data.setAll([
        { openX: xMin, x: xMax, openY: this.value - halfSpanMs, closeY: this.value + halfSpanMs }
      ]);
    }
  }

  updateValue(newValue) {
    this.value = newValue;
    this.updateVisuals();
  }

  getValue() { return this.value; }

  setColor(color) {
    this.color = color;
    if (this.verticalSeries) this.verticalSeries.set('stroke', am5.color(color));
    if (this.horizontalSeries) this.horizontalSeries.set('stroke', am5.color(color));
  }

  setVisible(visible) {
    if (this.verticalSeries) this.verticalSeries.set('visible', visible);
    if (this.verticalHit) this.verticalHit.set('visible', visible);
    if (this.horizontalSeries) this.horizontalSeries.set('visible', visible);
    if (this.horizontalHit) this.horizontalHit.set('visible', visible);
  }

  dispose() {
    if (this.verticalSeries) { this.verticalSeries.dispose(); this.verticalSeries = null; }
    if (this.verticalHit) { this.verticalHit.dispose(); this.verticalHit = null; }
    if (this.horizontalSeries) { this.horizontalSeries.dispose(); this.horizontalSeries = null; }
    if (this.horizontalHit) { this.horizontalHit.dispose(); this.horizontalHit = null; }
  }
}
