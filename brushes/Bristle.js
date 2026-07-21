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
  // jumps when it (re)appears — only its visibility is gated by pressure, and
  // line 2 always needs a touch more pressure than its line 1 counterpart at
  // the same fan position. So the lightest touch draws just the centermost
  // line 1 (one line total); a bit more pressure adds its tethered line 2;
  // heavier pressure then opens further strands outward from the center,
  // like bristles spreading under a firmer touch.
  renderIncrement(graphics) {
    const rawPoints = this.stroke.getLast(4);
    const count = this.mainTrails.length;
    const latest = rawPoints[rawPoints.length - 1];
    const pressure = this.resolveRenderPressure(Number.isFinite(latest.pressure) ? latest.pressure : 0.5);
    const center = (count - 1) / 2;
    // Normalizing by (maxDistance + 0.5) — not maxDistance — keeps every
    // threshold within [0, 1]: the outermost strand's line 2 is the largest
    // score (maxDistance + 0.5), so it lands exactly at pressure 1, not above it.
    const maxScore = center + 0.5;

    for (let i = 0; i < count; i += 1) {
      const distance = Math.abs(i - center);
      const mainVisible = pressure >= distance / maxScore;
      const offsetVisible = pressure >= (distance + 0.5) / maxScore;

      const mainStrand = rawPoints.map((point) => this.fanPoint(point, point, i, count));
      this.renderCurve(graphics, mainStrand, this.mainTrails[i], mainVisible ? this.settings : this.mutedStyle(this.settings));

      const offsetStrand = rawPoints.map((point) => this.fanPoint(this.projectFromAnchor(point), point, i, count));
      this.renderCurve(graphics, offsetStrand, this.offsetTrails[i], offsetVisible ? this.offsetStyle() : this.mutedStyle(this.offsetStyle()));
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
