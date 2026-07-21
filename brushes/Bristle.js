class Bristle extends StampBrush {
  constructor(settings = {}) {
    super({ ...BRISTLE_CONFIG.brush, ...settings });
    this.anchor = null;
    this.mainTrails = [];
    this.offsetTrails = [];
  }

  begin(sample) {
    super.begin(sample);
    this.anchor = { x: sample.x, y: sample.y, pressure: sample.pressure };

    const count = this.maxStrands();
    const freshTrail = () => ({ lastRendered: { ...this.anchor }, distanceCarry: 0, gradientDistance: 0 });
    this.mainTrails = Array.from({ length: count }, freshTrail);
    this.offsetTrails = Array.from({ length: count }, freshTrail);
  }

  maxStrands() {
    return Math.max(1, Math.round(Number(this.settings.maxLines) || 1));
  }

  // Line 1 traces the pointer; line 2 shares its start point but its distance
  // from the anchor is line 1's own displacement scaled per axis/pressure.
  // Both fan out across up to `maxLines` strands, laterally displaced
  // perpendicular to the (anchor → raw pointer) line by an amount proportional
  // to that distance. Every strand's geometry is always computed so none ever
  // jumps when it (re)appears — only its visibility is gated by pressure: at
  // low pressure only the centermost strand is visible, and heavier pressure
  // progressively reveals strands outward from the center, like bristles
  // spreading under a firmer touch.
  renderIncrement(graphics) {
    const rawPoints = this.stroke.getLast(4);
    const count = this.mainTrails.length;
    const latest = rawPoints[rawPoints.length - 1];
    const pressure = this.resolveRenderPressure(Number.isFinite(latest.pressure) ? latest.pressure : 0.5);
    const center = (count - 1) / 2;

    for (let i = 0; i < count; i += 1) {
      const opening = center > 0 ? Math.abs(i - center) / center : 0;
      const visible = pressure >= opening;

      const mainStrand = rawPoints.map((point) => this.fanPoint(point, point, i, count));
      this.renderCurve(graphics, mainStrand, this.mainTrails[i], visible ? this.settings : this.mutedStyle(this.settings));

      const offsetStrand = rawPoints.map((point) => this.fanPoint(this.projectFromAnchor(point), point, i, count));
      this.renderCurve(graphics, offsetStrand, this.offsetTrails[i], visible ? this.offsetStyle() : this.mutedStyle(this.offsetStyle()));
    }
  }

  mutedStyle(style) {
    return { ...style, alpha: 0 };
  }

  projectFromAnchor(point) {
    const pressure = Number.isFinite(point.pressure) ? point.pressure : 0.5;
    const anchorPressure = Number.isFinite(this.anchor.pressure) ? this.anchor.pressure : 0.5;

    return {
      x: this.anchor.x + (point.x - this.anchor.x) * this.settings.bristleOffsetScaleX,
      y: this.anchor.y + (point.y - this.anchor.y) * this.settings.bristleOffsetScaleY,
      pressure: this.clampPressure(anchorPressure + (pressure - anchorPressure) * this.settings.bristleOffsetScalePressure)
    };
  }

  // `point` is the strand's own position (raw or projected); `reference` is
  // always the raw pointer point, so both lines' strands fan out around the
  // same (anchor → pointer) direction regardless of the tether's own offset.
  fanPoint(point, reference, index, count) {
    if (count <= 1) return point;

    const dx = reference.x - this.anchor.x;
    const dy = reference.y - this.anchor.y;
    const distance = Math.hypot(dx, dy);

    if (distance === 0) return point;

    const perpX = -dy / distance;
    const perpY = dx / distance;
    const center = (count - 1) / 2;
    const lateral = (index - center) * distance * this.settings.spread;

    return { x: point.x + perpX * lateral, y: point.y + perpY * lateral, pressure: point.pressure };
  }

  offsetStyle() {
    return {
      size: this.settings.bristleOffsetSize,
      spacing: this.settings.spacing,
      alpha: this.settings.bristleOffsetAlpha,
      colorMode: "solid",
      color: this.settings.bristleOffsetColor,
      palette: null,
      compositeOperation: "source-over",
      pressureMinScale: this.settings.pressureMinScale,
      pressureMaxScale: this.settings.pressureMaxScale
    };
  }
}
