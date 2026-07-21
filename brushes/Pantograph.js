class Pantograph extends StampBrush {
  constructor(settings = {}) {
    super({ ...PANTOGRAPH_CONFIG.brush, ...settings });
    this.transformedPoints = [];
    this.originalTrail = { lastRendered: null, distanceCarry: 0, gradientDistance: 0 };
  }

  begin(sample) {
    super.begin(sample);
    const point = { x: sample.x, y: sample.y, pressure: sample.pressure };
    this.transformedPoints = [point];
    this.originalTrail = { lastRendered: point, distanceCarry: 0, gradientDistance: 0 };
  }

  // Each raw pointer delta is scaled independently per axis (and pressure) and
  // accumulated onto the transformed path, so the ratio compounds over the stroke
  // instead of anchoring back to a fixed pivot point.
  renderIncrement(graphics) {
    const rawPoints = this.stroke.getLast(2);

    if (rawPoints.length < 2) return;

    const [rawPrev, rawCur] = rawPoints;
    const prevTransformed = this.transformedPoints[this.transformedPoints.length - 1];
    const prevPressure = Number.isFinite(rawPrev.pressure) ? rawPrev.pressure : 0.5;
    const curPressure = Number.isFinite(rawCur.pressure) ? rawCur.pressure : prevPressure;

    this.transformedPoints.push({
      x: prevTransformed.x + (rawCur.x - rawPrev.x) * this.settings.scaleX,
      y: prevTransformed.y + (rawCur.y - rawPrev.y) * this.settings.scaleY,
      pressure: this.clampPressure(prevTransformed.pressure + (curPressure - prevPressure) * this.settings.scalePressure)
    });

    if (this.settings.originalEnabled) {
      this.renderCurve(graphics, this.stroke.getLast(4), this.originalTrail, this.originalStyle());
    }

    this.renderCurve(graphics, this.transformedPoints.slice(-4));
  }

  originalStyle() {
    return {
      size: this.settings.originalSize,
      spacing: this.settings.spacing,
      alpha: this.settings.originalAlpha,
      colorMode: "solid",
      color: this.settings.originalColor,
      palette: null,
      compositeOperation: "source-over",
      pressureMinScale: this.settings.pressureMinScale,
      pressureMaxScale: this.settings.pressureMaxScale
    };
  }
}
