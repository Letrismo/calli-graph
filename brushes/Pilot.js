class Pilot extends StampBrush {
  constructor(settings = {}) {
    super({ ...PILOT_CONFIG.brush, ...settings });
  }

  renderIncrement(graphics) {
    this.renderCurve(graphics, this.stroke.getLast(4));
  }
}
