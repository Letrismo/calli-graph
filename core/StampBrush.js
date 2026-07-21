class StampBrush extends EQuill {
  constructor(settings = {}) {
    super(settings);
    this.renderer = new CircleStampRenderer();
    this.lastRendered = null;
    this.distanceCarry = 0;
    this.gradientDistance = 0;
  }

  begin(sample) {
    super.begin(sample);
    this.lastRendered = { x: sample.x, y: sample.y, pressure: sample.pressure };
    this.distanceCarry = 0;
    this.gradientDistance = 0;
  }

  // Subclasses call this from renderIncrement() with whichever 2-4 point
  // window they want stamped (raw pointer points, transformed points, etc).
  // `trail` isolates the running stamp state (lastRendered/distanceCarry/
  // gradientDistance) and `style` isolates the visual settings, so a brush
  // can stamp more than one simultaneous curve (e.g. an input guide alongside
  // its transformed mark) without either one disturbing the other's spacing.
  renderCurve(graphics, points, trail = this, style = this.settings) {
    if (points.length < 2) return;

    if (points.length < 4) {
      const last = points[points.length - 1];
      const processed = PathProcessing.process([trail.lastRendered, { x: last.x, y: last.y, pressure: last.pressure }], this.settings);

      for (let i = 1; i < processed.length; i += 1) {
        this.renderSegment(graphics, processed[i - 1], processed[i], trail, style);
      }

      trail.lastRendered = processed[processed.length - 1] || trail.lastRendered;
      return;
    }

    const [p0, p1, p2, p3] = points;
    const curve = this.buildCurveSegment(p0, p1, p2, p3);
    const processed = PathProcessing.process([trail.lastRendered || { x: p1.x, y: p1.y }, ...curve], this.settings);

    for (let i = 1; i < processed.length; i += 1) {
      this.renderSegment(graphics, processed[i - 1], processed[i], trail, style);
    }

    trail.lastRendered = processed[processed.length - 1] || trail.lastRendered;
  }

  buildCurveSegment(p0, p1, p2, p3) {
    const step = Math.min(0.5, Math.max(0.015, Number(this.settings.curveStep) || 0.12));
    const points = [];

    for (let t = step; t <= 1 + 0.0001; t += step) {
      points.push(this.catmullRom(p0, p1, p2, p3, Math.min(1, t)));
    }

    return points;
  }

  renderSegment(graphics, from, to, trail = this, style = this.settings) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);

    if (distance === 0) return;

    const spacing = Math.max(1, style.size * style.spacing);
    const steps = Math.floor((distance + trail.distanceCarry) / spacing);

    if (steps <= 0) {
      trail.distanceCarry += distance;
      return;
    }

    for (let i = 1; i <= steps; i += 1) {
      const progress = (i * spacing - trail.distanceCarry) / distance;

      if (progress < 0 || progress > 1) continue;

      const x = lerp(from.x, to.x, progress);
      const y = lerp(from.y, to.y, progress);
      const pressure = this.resolveRenderPressure(this.resolvePressure(from, to, progress));
      trail.gradientDistance += spacing;
      this.renderer.render(graphics, {
        x,
        y,
        size: style.size,
        pressure,
        pressureMinScale: style.pressureMinScale,
        pressureMaxScale: style.pressureMaxScale,
        color: this.resolveColor(style, trail),
        alpha: style.alpha,
        compositeOperation: style.compositeOperation
      });
    }

    trail.distanceCarry = (distance + trail.distanceCarry) % spacing;
  }

  resolveColor(style = this.settings, trail = this) {
    if (style.colorMode === "solid") return style.color;

    const palette = style.palette;

    if (!palette || palette.length === 0) return style.color;
    if (palette.length === 1) return palette[0];

    const cycle = 900;
    const position = (trail.gradientDistance % cycle) / cycle;
    const scaled = position * palette.length;
    const index = Math.floor(scaled) % palette.length;
    const next = (index + 1) % palette.length;
    const amount = scaled - Math.floor(scaled);

    return lerpColor(color(palette[index]), color(palette[next]), amount);
  }

  resolvePressure(from, to, progress) {
    const fromPressure = Number.isFinite(from.pressure) ? from.pressure : 0.5;
    const toPressure = Number.isFinite(to.pressure) ? to.pressure : fromPressure;

    return Math.min(1, Math.max(0, fromPressure + (toPressure - fromPressure) * progress));
  }

  resolveRenderPressure(rawPressure) {
    if (this.settings.pressureEnabled === false) return 0.5;

    if (this.settings.pressureOverrideEnabled) {
      return this.clampPressure(this.settings.pressureOverride);
    }

    const pressure = this.clampPressure(rawPressure);
    const gamma = Math.max(0.1, Number(this.settings.pressureGamma) || 1);

    return this.clampPressure(Math.pow(pressure, gamma));
  }

  clampPressure(value) {
    const pressure = Number(value);

    if (!Number.isFinite(pressure)) return 0.5;

    return Math.min(1, Math.max(0, pressure));
  }

  catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;

    return {
      x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      pressure: this.resolvePressure(p1, p2, t)
    };
  }
}
