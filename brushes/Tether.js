class Tether extends StampBrush {
  constructor(settings = {}) {
    super({ ...TETHER_CONFIG.brush, ...settings });
    this.anchor = null;
    this.offsetTrail = { lastRendered: null, distanceCarry: 0, gradientDistance: 0 };
  }

  begin(sample) {
    super.begin(sample);
    this.anchor = { x: sample.x, y: sample.y, pressure: sample.pressure };
    this.offsetTrail = { lastRendered: { ...this.anchor }, distanceCarry: 0, gradientDistance: 0 };
  }

  // Line 1 traces the pointer directly (the default trail/style, same as Pilot).
  // Line 2 shares its start point, but its distance from that anchor is line 1's
  // own displacement scaled per axis/pressure — so it stretches further out as
  // the pointer travels away from the start and eases back in as it returns.
  renderIncrement(graphics) {
    this.renderCurve(graphics, this.stroke.getLast(4));

    const projected = this.stroke.getLast(4).map((point) => this.projectFromAnchor(point));
    this.renderCurve(graphics, projected, this.offsetTrail, this.offsetStyle());
  }

  projectFromAnchor(point) {
    const pressure = Number.isFinite(point.pressure) ? point.pressure : 0.5;
    const anchorPressure = Number.isFinite(this.anchor.pressure) ? this.anchor.pressure : 0.5;

    return {
      x: this.anchor.x + (point.x - this.anchor.x) * this.settings.offsetScaleX,
      y: this.anchor.y + (point.y - this.anchor.y) * this.settings.offsetScaleY,
      pressure: this.clampPressure(anchorPressure + (pressure - anchorPressure) * this.settings.offsetScalePressure)
    };
  }

  offsetStyle() {
    return {
      size: this.settings.offsetSize,
      spacing: this.settings.spacing,
      alpha: this.settings.offsetAlpha,
      colorMode: "solid",
      color: this.settings.offsetColor,
      palette: null,
      compositeOperation: "source-over",
      pressureMinScale: this.settings.pressureMinScale,
      pressureMaxScale: this.settings.pressureMaxScale
    };
  }
}
